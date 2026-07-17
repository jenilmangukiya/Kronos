import type { FastifyInstance } from "fastify";
import { replaySessions } from "./replay.session.js";
import { ReplaySession, StartReplayInput, ReplayCandle, ReplayPosition, ReplayLog } from "./replay.types.js";
import { AppError } from "../../errors/app-error.js";
import { AngelMarketDataProvider } from "../market-data/providers/angel.provider.js";
import { angelInstrumentProvider } from "../market-data/providers/angel-instrument.provider.js";
import { liveTickStore } from "../market-data/live/live-tick.store.js";
import { strategyRegistry } from "../strategies/runner/strategy-registry.js";
import { CreatePaperOrderInput, ExitPaperPositionInput } from "../paper-trading/types.js";

function formatReplayTime(timestamp: number | string | null | undefined): string {
  if (!timestamp) return "";
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function updateSessionStats(session: ReplaySession, pnl: number) {
  session.totalTrades = (session.totalTrades ?? 0) + 1;
  if (pnl > 0) {
    session.winningTrades = (session.winningTrades ?? 0) + 1;
  } else {
    session.losingTrades = (session.losingTrades ?? 0) + 1;
  }
  session.totalPnl = (session.totalPnl ?? 0) + pnl;
  session.maxProfit = Math.max(session.maxProfit ?? 0, pnl);
  session.maxLoss = Math.min(session.maxLoss ?? 0, pnl);
}

export class ReplayPaperService {
  constructor(private readonly session: ReplaySession) {}

  async createOrder(userId: string, input: CreatePaperOrderInput) {
    const session = this.session;
    const price = input.price;
    if (!price || price <= 0) {
      throw new AppError(
        "Valid price not available for paper order",
        400,
        "PAPER_ORDER_PRICE_MISSING",
      );
    }

    // Add log
    const timeStr = formatReplayTime(session.currentTime);
    const prefix = timeStr ? `[${timeStr}] ` : "";
    session.logs.push({
      id: `log_${Math.random().toString(36).substring(2, 11)}`,
      message: `${prefix}[ENTRY] Entered ${input.side} at ₹${price} for ${input.symbol}`,
      meta: {
        symbol: input.symbol,
        side: input.side,
        price,
        quantity: input.quantity,
      },
      createdAt: new Date(),
    });

    const existingPosition = session.positions.find(
      (pos) => pos.token === input.token && pos.status === "OPEN"
    );

    if (!existingPosition) {
      const newPos: ReplayPosition = {
        id: `pos_${Math.random().toString(36).substring(2, 11)}`,
        symbol: input.symbol,
        token: input.token,
        quantity: input.quantity,
        avgPrice: price,
        entryPrice: price,
        currentPrice: price,
        status: "OPEN",
        side: input.side === "BUY" ? "LONG" : "SHORT",
        realizedPnl: 0,
        pnl: 0,
        openedAt: new Date(),
        closedAt: null,
        openedAtMarketTime: session.currentTime ? Number(session.currentTime) : undefined,
      };
      session.positions.push(newPos);
      return newPos;
    }

    if (existingPosition.side === (input.side === "BUY" ? "LONG" : "SHORT")) {
      const totalCost = existingPosition.entryPrice * existingPosition.quantity + price * input.quantity;
      existingPosition.quantity += input.quantity;
      existingPosition.avgPrice = totalCost / existingPosition.quantity;
      existingPosition.entryPrice = existingPosition.avgPrice;
      return existingPosition;
    } else {
      if (existingPosition.quantity === input.quantity) {
        existingPosition.status = "CLOSED";
        existingPosition.closedAt = new Date();
        existingPosition.closedAtMarketTime = session.currentTime ? Number(session.currentTime) : undefined;
        const pnl =
          existingPosition.side === "LONG"
            ? (price - existingPosition.entryPrice) * existingPosition.quantity
            : (existingPosition.entryPrice - price) * existingPosition.quantity;
        existingPosition.realizedPnl = pnl;
        existingPosition.pnl = pnl;
        updateSessionStats(session, pnl);
        return existingPosition;
      } else {
        const pnl =
          existingPosition.side === "LONG"
            ? (price - existingPosition.entryPrice) * input.quantity
            : (existingPosition.entryPrice - price) * input.quantity;
        existingPosition.realizedPnl += pnl;
        existingPosition.pnl += pnl;
        existingPosition.quantity -= input.quantity;
        return existingPosition;
      }
    }
  }

  async exitPosition(userId: string, positionId: string, input: ExitPaperPositionInput) {
    const session = this.session;
    const position = session.positions.find((pos) => pos.id === positionId);

    if (!position) {
      throw new AppError("Position not found", 404, "POSITION_NOT_FOUND");
    }

    if (position.status === "CLOSED") {
      return position;
    }

    const price = input.price;
    if (!price || price <= 0) {
      throw new AppError("Valid price not available for exit", 400, "PAPER_ORDER_PRICE_MISSING");
    }

    position.status = "CLOSED";
    position.closedAt = new Date();
    position.closedAtMarketTime = session.currentTime ? Number(session.currentTime) : undefined;

    const pnl =
      position.side === "LONG"
        ? (price - position.entryPrice) * position.quantity
        : (position.entryPrice - price) * position.quantity;
    position.realizedPnl = pnl;
    position.pnl = pnl;
    position.currentPrice = price;
    updateSessionStats(session, pnl);

    const timeStr = formatReplayTime(session.currentTime);
    const prefix = timeStr ? `[${timeStr}] ` : "";
    session.logs.push({
      id: `log_${Math.random().toString(36).substring(2, 11)}`,
      message: `${prefix}[EXIT] Exited at ₹${price} (PnL: ₹${pnl})`,
      meta: {
        price,
        pnl,
      },
      createdAt: new Date(),
    });

    return position;
  }
}

export class ReplayService {
  constructor(private readonly app: FastifyInstance) {}

  private async getYesterdayHighLow(
    brokerAccountId: string,
    exchange: string,
    symbolToken: string,
    currentDate: Date,
  ): Promise<{ high: number; low: number }> {
    const brokerAccount = await this.app.db.brokerAccount.findUnique({
      where: { id: brokerAccountId },
    });
    if (!brokerAccount || !brokerAccount.apiKey || !brokerAccount.accessToken) {
      throw new AppError("Broker account session is missing", 400, "BROKER_SESSION_ERROR");
    }

    const toDate = new Date(currentDate);
    toDate.setDate(toDate.getDate() - 1);
    const fromDate = new Date(currentDate);
    fromDate.setDate(fromDate.getDate() - 10);

    const getKolkataDateOnly = (date: Date) => {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const parts = formatter.formatToParts(date);
      const getVal = (type: string) => parts.find((p) => p.type === type)?.value || "";
      return `${getVal("year")}-${getVal("month")}-${getVal("day")}`;
    };

    const fromDateStr = `${getKolkataDateOnly(fromDate)} 09:15`;
    const toDateStr = `${getKolkataDateOnly(toDate)} 15:30`;

    const provider = new AngelMarketDataProvider();
    const response = await provider.getCandles({
      apiKey: brokerAccount.apiKey,
      accessToken: brokerAccount.accessToken,
      query: {
        brokerAccountId,
        exchange,
        symboltoken: symbolToken,
        interval: "ONE_DAY",
        fromDate: fromDateStr,
        toDate: toDateStr,
      },
    });

    if (!response || !response.status || !response.data || response.data.length === 0) {
      throw new AppError("Failed to fetch yesterday's candle data", 502, "CANDLE_FETCH_ERROR");
    }

    const candles = response.data.map((item: any) => {
      let isoString = String(item[0]);
      if (!isoString.includes("+") && !isoString.includes("Z")) {
        const cleanTime = isoString.replace(" ", "T");
        isoString = cleanTime.includes("T") ? `${cleanTime}+05:30` : `${cleanTime}T00:00:00+05:30`;
      }
      return {
        time: new Date(isoString).getTime(),
        high: Number(item[2]),
        low: Number(item[3]),
      };
    }).sort((a: any, b: any) => b.time - a.time);

    return {
      high: candles[0].high,
      low: candles[0].low,
    };
  }

  async startReplay(userId: string, input: StartReplayInput): Promise<ReplaySession> {
    if (replaySessions.has(userId)) {
      throw new AppError(
        "Active replay session already exists for this user",
        400,
        "REPLAY_SESSION_ALREADY_EXISTS",
      );
    }

    let yesterdayHigh = input.yesterdayHigh ?? 0;
    let yesterdayLow = input.yesterdayLow ?? 0;

    if ((!yesterdayHigh || !yesterdayLow) && input.date) {
      const strategy = await this.app.db.strategy.findUnique({
        where: { id: input.strategyId },
      });
      if (strategy && strategy.strategyType === "HIGH_LOW_BREAKOUT_REVERSAL") {
        const rules = strategy.rules as any;
        const underlyingToken = rules?.underlyingToken;
        const exchange = rules?.underlyingExchange || "NSE";
        if (underlyingToken) {
          try {
            const yesterday = await this.getYesterdayHighLow(
              input.brokerAccountId,
              exchange,
              underlyingToken,
              new Date(input.date),
            );
            yesterdayHigh = yesterday.high;
            yesterdayLow = yesterday.low;
          } catch (err) {
            this.app.log.warn(err, `Failed to fetch yesterday's High/Low in startReplay. Using baseline fallbacks.`);
            yesterdayHigh = 24000;
            yesterdayLow = 23800;
          }
        }
      }
    }

    const session: ReplaySession = {
      id: `rep_${Math.random().toString(36).substring(2, 11)}`,
      userId,
      strategyId: input.strategyId,
      brokerAccountId: input.brokerAccountId,
      isRunning: true,
      speed: input.speed ?? 1,
      currentIndex: 0,
      candles: [],
      logs: [],
      positions: [],
      startedAt: new Date(),
      currentTime: null,
      currentUnderlyingPrice: null,
      currentTradePrice: null,
      totalCandles: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalPnl: 0,
      maxProfit: 0,
      maxLoss: 0,
      isPaused: false,
      shouldStep: false,
      yesterdayHigh,
      yesterdayLow,
      optionCandles: new Map(),
    };

    replaySessions.set(userId, session);

    // Run replay loop in the background
    void this.runReplayLoop(session).catch((error) => {
      this.app.log.error(error, `[Replay Service] Error in replay loop for user ${userId}`);
    });

    return session;
  }

  async stopReplay(userId: string): Promise<void> {
    const session = replaySessions.get(userId);
    if (!session) {
      throw new AppError(
        "No active replay session found for this user",
        404,
        "REPLAY_SESSION_NOT_FOUND",
      );
    }
    session.isRunning = false;
    session.logs = [];
    session.positions = [];
    replaySessions.delete(userId);
  }

  async getSession(userId: string): Promise<any | null> {
    const session = replaySessions.get(userId);
    if (!session) return null;

    const totalTrades = session.totalTrades ?? 0;
    const winningTrades = session.winningTrades ?? 0;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const avgPnl = totalTrades > 0 ? (session.totalPnl ?? 0) / totalTrades : 0;

    return {
      ...session,
      winRate,
      avgPnl,
    };
  }

  async pauseReplay(userId: string): Promise<void> {
    const session = replaySessions.get(userId);
    if (!session) {
      throw new AppError("No active replay session found for this user", 404, "REPLAY_SESSION_NOT_FOUND");
    }
    session.isPaused = true;
  }

  async resumeReplay(userId: string): Promise<void> {
    const session = replaySessions.get(userId);
    if (!session) {
      throw new AppError("No active replay session found for this user", 404, "REPLAY_SESSION_NOT_FOUND");
    }
    session.isPaused = false;
  }

  async stepReplay(userId: string): Promise<void> {
    const session = replaySessions.get(userId);
    if (!session) {
      throw new AppError("No active replay session found for this user", 404, "REPLAY_SESSION_NOT_FOUND");
    }
    if (!session.isPaused) {
      throw new AppError("Replay must be paused to step", 400, "REPLAY_NOT_PAUSED");
    }
    session.shouldStep = true;
  }

  async runReplayLoop(session: ReplaySession): Promise<void> {
    const strategy = await this.app.db.strategy.findUnique({
      where: { id: session.strategyId },
    });

    if (!strategy) {
      this.app.log.error(`[Replay Service] Strategy not found: ${session.strategyId}`);
      session.isRunning = false;
      return;
    }

    // Reset strategy state for a fresh replay session
    strategy.state = {};

    const rules = strategy.rules as any;
    const trade = strategy.trade as any;
    const underlyingToken = rules?.underlyingToken || trade?.token;

    if (!underlyingToken) {
      this.app.log.error(`[Replay Service] Could not determine underlying token for strategy ${session.strategyId}`);
      session.isRunning = false;
      return;
    }

    this.app.log.info(
      `[Replay Service] Starting replay loop for session ${session.id}, strategy ${strategy.name}, token ${underlyingToken}`
    );

    // Wait for candles to be populated if they are not loaded yet
    while (session.isRunning && session.candles.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Preload option candles
    if (session.isRunning && session.candles.length > 0) {
      try {
        const firstCandle = session.candles[0];
        if (firstCandle) {
          const replayDate = new Date(Number(firstCandle.time) * 1000)
            .toISOString().slice(0, 10);
          this.app.log.info(
            `[Replay Service] Preloading option contracts for symbol ${strategy.symbol}, expiry ${trade.expiry}, date ${replayDate}`
          );

          const contracts = await angelInstrumentProvider.getOptionContracts({
            symbol: strategy.symbol,
            expiry: trade.expiry,
          });

          const strikes = [...new Set(contracts.map((c: any) => c.strike))].sort((a, b) => a - b);
          const strikesToLoad: number[] = [];
          if (strikes.length > 0) {
            // Find min/max price of the underlying for the full day
            let minPrice = Infinity;
            let maxPrice = -Infinity;
            for (const c of session.candles) {
              if (c.low < minPrice) minPrice = c.low;
              if (c.high > maxPrice) maxPrice = c.high;
            }

            // Find strikes within the full day range [minPrice, maxPrice]
            // and add a buffer of 5 strikes on either side
            const firstStrike = strikes[0];
            const minStrikeNear = strikes.reduce((nearest, strike) => {
              return Math.abs(strike - minPrice) < Math.abs(nearest - minPrice) ? strike : nearest;
            }, firstStrike);
            const maxStrikeNear = strikes.reduce((nearest, strike) => {
              return Math.abs(strike - maxPrice) < Math.abs(nearest - maxPrice) ? strike : nearest;
            }, firstStrike);

            const minIndex = strikes.indexOf(minStrikeNear);
            const maxIndex = strikes.indexOf(maxStrikeNear);

            const startIndex = Math.max(0, minIndex - 5);
            const endIndex = Math.min(strikes.length - 1, maxIndex + 5);

            for (let i = startIndex; i <= endIndex; i++) {
              strikesToLoad.push(strikes[i]);
            }
          }

          const relevantContracts = contracts.filter(
            (c: any) => strikesToLoad.includes(c.strike)
          );

          this.app.log.info(
            `[Replay Service] Preloading option candles for ${relevantContracts.length} contracts (Strikes to load: ${strikesToLoad.join(", ")})`
          );

          // Fetch sequentially with rate-limit throttling (350ms delay between requests)
          for (const c of relevantContracts) {
            if (!session.isRunning) break;
            try {
              await this.fetchOptionCandles(session, c.token, "NFO", replayDate);
              await new Promise((resolve) => setTimeout(resolve, 350));
            } catch (err: any) {
              this.app.log.warn(`[Replay Service] Failed to preload option candles for token ${c.token}: ${err.message}`);
            }
          }
          this.app.log.info(`[Replay Service] Preloading option candles completed`);
        }
      } catch (err: any) {
        this.app.log.error(err, `[Replay Service] Option preloading failed: ${err.message}`);
      }
    }

    while (session.isRunning && session.currentIndex < session.candles.length) {
      const candle = session.candles[session.currentIndex];
      if (!candle) {
        break;
      }
      const prices = [candle.open, candle.high, candle.low, candle.close];

      for (const price of prices) {
        if (!session.isRunning) {
          break;
        }

        // Wait if paused and not stepping
        while (session.isRunning && session.isPaused && !session.shouldStep) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        if (session.shouldStep) {
          session.shouldStep = false;
        }

        // Push tick to liveTickStore
        liveTickStore.setTick(session.brokerAccountId, {
          token: underlyingToken,
          sequenceNumber: "",
          exchangeTimestamp: candle.time * 1000,
          ltp: price,
        });

        // Update session live details
        session.currentTime = candle.time;
        session.currentUnderlyingPrice = price;
        session.totalCandles = session.candles.length;

        // Update positions current price and PnL
        let openPositionLtp: number | null = null;
        for (const pos of session.positions) {
          if (pos.status === "OPEN") {
            let currentPrice = price;
            if (pos.token !== underlyingToken) {
              const optPrice = getOptionPriceAtTime(session, pos.token, Number(session.currentTime));
              if (optPrice !== null) {
                currentPrice = optPrice;
              } else {
                currentPrice = pos.currentPrice || pos.entryPrice;
              }
            }
            pos.currentPrice = currentPrice;
            pos.pnl =
              pos.side === "LONG"
                ? (currentPrice - pos.entryPrice) * pos.quantity
                : (pos.entryPrice - currentPrice) * pos.quantity;
            openPositionLtp = currentPrice;
          }
        }

        session.currentTradePrice = openPositionLtp ?? liveTickStore.getTick(session.brokerAccountId, trade.token)?.ltp ?? price;

        // Evaluate Strategy
        const handler = strategyRegistry.get(strategy.strategyType);
        if (handler) {
          if (strategy.strategyType === "HIGH_LOW_BREAKOUT_REVERSAL") {
            if (handler.execute) {
              try {
                await handler.execute({
                  app: this.app,
                  strategy,
                  isReplay: true,
                });
              } catch (error: any) {
                this.app.log.error(error, `[Replay Loop] Error executing strategy ${strategy.id}: ${error.message}`);
              }
            }
            const delayMs = 1000 / session.speed;
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            continue;
          }

          const openPosition = session.positions.find((p) => p.status === "OPEN");

          if (openPosition) {
            // Evaluate exit
            const risk = strategy.risk as any;
            const stopLossPercent = risk?.stopLossPercent;
            const targetPercent = risk?.targetPercent;

            if (stopLossPercent || targetPercent) {
              const ltp = price;
              const avgPrice = openPosition.entryPrice;
              let shouldExit = false;
              let exitReason = "";

              if (openPosition.side === "LONG") {
                if (stopLossPercent && ltp <= avgPrice * (1 - stopLossPercent / 100)) {
                  shouldExit = true;
                  exitReason = `Stop Loss hit at ${ltp}`;
                } else if (targetPercent && ltp >= avgPrice * (1 + targetPercent / 100)) {
                  shouldExit = true;
                  exitReason = `Target hit at ${ltp}`;
                }
              } else { // SHORT
                if (stopLossPercent && ltp >= avgPrice * (1 + stopLossPercent / 100)) {
                  shouldExit = true;
                  exitReason = `Stop Loss hit at ${ltp}`;
                } else if (targetPercent && ltp <= avgPrice * (1 - targetPercent / 100)) {
                  shouldExit = true;
                  exitReason = `Target hit at ${ltp}`;
                }
              }

              if (shouldExit) {
                const timeStr = formatReplayTime(session.currentTime);
                const prefix = timeStr ? `[${timeStr}] ` : "";

                session.logs.push({
                  id: `log_${Math.random().toString(36).substring(2, 11)}`,
                  message: `${prefix}[EXIT] ${exitReason}`,
                  meta: { ltp, avgPrice },
                  createdAt: new Date(),
                });

                const paperService = new ReplayPaperService(session);
                await paperService.exitPosition(session.userId, openPosition.id, { price: ltp });
              }
            }
          } else {
            // Evaluate entry
            const decision = await handler.evaluateEntry({
              app: this.app,
              strategy,
            });

            if (decision.shouldExecute) {
              const timeStr = formatReplayTime(session.currentTime);
              const prefix = timeStr ? `[${timeStr}] ` : "";

              session.logs.push({
                id: `log_${Math.random().toString(36).substring(2, 11)}`,
                message: `${prefix}[ENTRY] Entry Signal: ${decision.reason}`,
                meta: decision.meta,
                createdAt: new Date(),
              });

              const paperService = new ReplayPaperService(session);
              await paperService.createOrder(session.userId, {
                strategyId: strategy.id,
                brokerAccountId: session.brokerAccountId,
                instrumentType: trade.instrumentType as any,
                token: trade.token,
                symbol: trade.symbol,
                exchangeType: trade.exchangeType,
                exchange: trade.exchange,
                side: trade.side,
                quantity: trade.quantity,
                price,
              });
            }
          }
        }

        // Delay based on speed: speed = 1 -> 1000ms, speed = 5 -> 200ms, etc.
        const delayMs = 1000 / session.speed;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      if (!session.isRunning) {
        break;
      }

      session.currentIndex++;
    }

    this.app.log.info(
      `[Replay Service] Replay loop completed or stopped for session ${session.id}. currentIndex: ${session.currentIndex}`
    );
  }


  async fetchHistoricalCandles(
    userId: string,
    input: { symbol: string; interval: "1m" | "5m"; date: string }
  ): Promise<ReplayCandle[]> {
    const session = replaySessions.get(userId);
    if (!session) {
      throw new AppError(
        "No active replay session found for this user",
        400,
        "REPLAY_SESSION_NOT_FOUND",
      );
    }

    const brokerAccount = await this.app.db.brokerAccount.findUnique({
      where: { id: session.brokerAccountId },
    });

    if (!brokerAccount) {
      throw new AppError("Broker account not found", 404, "BROKER_ACCOUNT_NOT_FOUND");
    }

    if (brokerAccount.broker !== "ANGEL_ONE") {
      throw new AppError(
        "Only Angel One market data is supported currently",
        400,
        "MARKET_DATA_BROKER_NOT_SUPPORTED",
      );
    }

    if (!brokerAccount.apiKey || !brokerAccount.accessToken) {
      throw new AppError("Broker session is missing", 400, "BROKER_SESSION_MISSING");
    }

    if (
      !brokerAccount.tokenExpiresAt ||
      brokerAccount.tokenExpiresAt <= new Date()
    ) {
      throw new AppError("Broker session expired", 401, "BROKER_SESSION_EXPIRED");
    }

    const indexInstrument = angelInstrumentProvider.getIndexInstrument(input.symbol);

    let exchange: string;
    let symboltoken: string;

    if (indexInstrument) {
      exchange = indexInstrument.exchange;
      symboltoken = indexInstrument.symboltoken;
    } else {
      const results = await angelInstrumentProvider.search({ query: input.symbol });
      const exactMatch = results.find(
        (inst) =>
          inst.symbol.toUpperCase() === input.symbol.toUpperCase() ||
          inst.name.toUpperCase() === input.symbol.toUpperCase()
      );

      const matched = exactMatch || results[0];
      if (!matched) {
        throw new AppError(`Symbol "${input.symbol}" not found`, 404, "SYMBOL_NOT_FOUND");
      }
      exchange = matched.exch_seg;
      symboltoken = matched.token;
    }

    const intervalMap: Record<string, "ONE_MINUTE" | "FIVE_MINUTE"> = {
      "1m": "ONE_MINUTE",
      "5m": "FIVE_MINUTE",
    };
    const mappedInterval = intervalMap[input.interval] || "ONE_MINUTE";

    // Format dates to YYYY-MM-DD HH:mm
    const baseDate = input.date; // expects e.g., YYYY-MM-DD
    const fromDate = `${baseDate} 09:15`;
    const toDate = `${baseDate} 15:30`;

    const provider = new AngelMarketDataProvider();
    const response = await provider.getCandles({
      apiKey: brokerAccount.apiKey,
      accessToken: brokerAccount.accessToken,
      query: {
        brokerAccountId: session.brokerAccountId,
        exchange,
        symboltoken,
        interval: mappedInterval as any,
        fromDate,
        toDate,
      },
    });

    if (!response || !response.status) {
      throw new AppError(
        response?.message || "Failed to fetch historical candles from provider",
        502,
        "PROVIDER_CANDLES_FAILED",
      );
    }

    const rawCandles = response.data || [];
    const normalizedCandles: ReplayCandle[] = rawCandles.map((item: any) => {
      let isoString = String(item[0]);
      if (!isoString.includes("+") && !isoString.includes("Z")) {
        const cleanTime = isoString.replace(" ", "T");
        if (cleanTime.includes("T") && cleanTime.split("T")[1]?.length === 5) {
          isoString = `${cleanTime}:00+05:30`;
        } else if (cleanTime.includes("T")) {
          isoString = `${cleanTime}+05:30`;
        } else {
          isoString = `${cleanTime}T00:00:00+05:30`;
        }
      }
      const time = Math.floor(new Date(isoString).getTime() / 1000);

      return {
        time,
        open: Number(item[1]),
        high: Number(item[2]),
        low: Number(item[3]),
        close: Number(item[4]),
      };
    }).sort((a: any, b: any) => a.time - b.time);

    session.candles = normalizedCandles;

    return normalizedCandles;
  }

  /**
   * Fetch historical 1-minute candles for an option contract and cache them
   * in the session's optionCandles map.
   */
  async fetchOptionCandles(
    session: ReplaySession,
    optionToken: string,
    exchange: string,
    date: string,
  ): Promise<ReplayCandle[]> {
    // Return cached if already fetched
    if (session.optionCandles?.has(optionToken)) {
      return session.optionCandles.get(optionToken)!;
    }

    const brokerAccount = await this.app.db.brokerAccount.findUnique({
      where: { id: session.brokerAccountId },
    });

    if (!brokerAccount || !brokerAccount.apiKey || !brokerAccount.accessToken) {
      this.app.log.warn(`[Replay] Cannot fetch option candles: broker session missing`);
      return [];
    }

    const fromDate = `${date} 09:15`;
    const toDate = `${date} 15:30`;

    try {
      const provider = new AngelMarketDataProvider();
      const response = await provider.getCandles({
        apiKey: brokerAccount.apiKey,
        accessToken: brokerAccount.accessToken,
        query: {
          brokerAccountId: session.brokerAccountId,
          exchange,
          symboltoken: optionToken,
          interval: "ONE_MINUTE" as any,
          fromDate,
          toDate,
        },
      });

      if (!response || !response.status || !response.data) {
        this.app.log.warn(`[Replay] No option candle data for token ${optionToken}`);
        return [];
      }

      const candles: ReplayCandle[] = response.data.map((item: any) => {
        let isoString = String(item[0]);
        if (!isoString.includes("+") && !isoString.includes("Z")) {
          const cleanTime = isoString.replace(" ", "T");
          if (cleanTime.includes("T") && cleanTime.split("T")[1]?.length === 5) {
            isoString = `${cleanTime}:00+05:30`;
          } else if (cleanTime.includes("T")) {
            isoString = `${cleanTime}+05:30`;
          } else {
            isoString = `${cleanTime}T00:00:00+05:30`;
          }
        }
        return {
          time: Math.floor(new Date(isoString).getTime() / 1000),
          open: Number(item[1]),
          high: Number(item[2]),
          low: Number(item[3]),
          close: Number(item[4]),
        };
      }).sort((a: any, b: any) => a.time - b.time);

      if (!session.optionCandles) {
        session.optionCandles = new Map();
      }
      session.optionCandles.set(optionToken, candles);

      this.app.log.info(
        `[Replay] Fetched ${candles.length} option candles for token ${optionToken} on ${date}`
      );

      return candles;
    } catch (err) {
      this.app.log.warn(err, `[Replay] Failed to fetch option candles for token ${optionToken}`);
      return [];
    }
  }
}

/**
 * Look up the option price at a given timestamp from cached option candles.
 * Returns the close price of the candle whose time is nearest to the timestamp
 * and within 60 seconds (either lookback or lookforward).
 * Returns null if no data is available.
 */
export function getOptionPriceAtTime(
  session: ReplaySession,
  optionToken: string,
  timestampSec: number,
): number | null {
  const candles = session.optionCandles?.get(optionToken);
  if (!candles || candles.length === 0) return null;

  let best: ReplayCandle | null = null;
  let minDiff = 61; // only match within 60 seconds

  for (const c of candles) {
    const diff = Math.abs(c.time - timestampSec);
    if (diff < minDiff) {
      minDiff = diff;
      best = c;
    }
  }

  return best ? best.close : null;
}

