import type { FastifyInstance } from "fastify";
import { replaySessions } from "./replay.session.js";
import { ReplaySession, StartReplayInput, ReplayCandle, ReplayPosition, ReplayLog } from "./replay.types.js";
import { AppError } from "../../errors/app-error.js";
import { AngelMarketDataProvider } from "../market-data/providers/angel.provider.js";
import { AngelInstrumentProvider } from "../market-data/providers/angel-instrument.provider.js";
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
      message: `${prefix}Entered ${input.side} at ₹${price} for ${input.symbol}`,
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
        const pnl =
          existingPosition.side === "LONG"
            ? (price - existingPosition.entryPrice) * existingPosition.quantity
            : (existingPosition.entryPrice - price) * existingPosition.quantity;
        existingPosition.realizedPnl = pnl;
        existingPosition.pnl = pnl;
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

    const pnl =
      position.side === "LONG"
        ? (price - position.entryPrice) * position.quantity
        : (position.entryPrice - price) * position.quantity;
    position.realizedPnl = pnl;
    position.pnl = pnl;
    position.currentPrice = price;

    const timeStr = formatReplayTime(session.currentTime);
    const prefix = timeStr ? `[${timeStr}] ` : "";
    session.logs.push({
      id: `log_${Math.random().toString(36).substring(2, 11)}`,
      message: `${prefix}Exited at ₹${price} (PnL: ₹${pnl})`,
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

  async startReplay(userId: string, input: StartReplayInput): Promise<ReplaySession> {
    if (replaySessions.has(userId)) {
      throw new AppError(
        "Active replay session already exists for this user",
        400,
        "REPLAY_SESSION_ALREADY_EXISTS",
      );
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

  async getSession(userId: string): Promise<ReplaySession | null> {
    return replaySessions.get(userId) || null;
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

        // Push tick to liveTickStore
        liveTickStore.setTick(session.brokerAccountId, {
          token: underlyingToken,
          sequenceNumber: "",
          exchangeTimestamp: Date.now(),
          ltp: price,
        });

        // Update session live details
        session.currentTime = candle.time;
        session.currentUnderlyingPrice = price;
        session.currentTradePrice = liveTickStore.getTick(session.brokerAccountId, trade.token)?.ltp ?? price;
        session.totalCandles = session.candles.length;

        // Update positions current price and PnL
        for (const pos of session.positions) {
          if (pos.status === "OPEN") {
            pos.currentPrice = price;
            pos.pnl =
              pos.side === "LONG"
                ? (price - pos.entryPrice) * pos.quantity
                : (pos.entryPrice - price) * pos.quantity;
          }
        }

        // Evaluate Strategy
        const handler = strategyRegistry.get(strategy.strategyType);
        if (handler) {
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
                  message: `${prefix}${exitReason}`,
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
                message: `${prefix}Entry Signal: ${decision.reason}`,
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

    const instrumentProvider = new AngelInstrumentProvider();
    const indexInstrument = instrumentProvider.getIndexInstrument(input.symbol);

    let exchange: string;
    let symboltoken: string;

    if (indexInstrument) {
      exchange = indexInstrument.exchange;
      symboltoken = indexInstrument.symboltoken;
    } else {
      const results = await instrumentProvider.search({ query: input.symbol });
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
    });

    session.candles = normalizedCandles;

    return normalizedCandles;
  }
}

