import { liveTickStore } from "../../../market-data/live/live-tick.store.js";
import { AppError } from "../../../../errors/app-error.js";
import type {
  StrategyContext,
  StrategyDecision,
  StrategyHandler,
} from "./types.js";
import { AngelInstrumentProvider } from "../../../market-data/providers/angel-instrument.provider.js";
import { AngelMarketDataProvider } from "../../../market-data/providers/angel.provider.js";
import { PaperTradingService } from "../../../paper-trading/service.js";

// Lazy-loaded dependencies to break circular imports at load time
let replaySessions: any = null;
let ReplayPaperService: any = null;
let ReplayServiceClass: any = null;
let getOptionPriceAtTimeFn: any = null;
let liveMarketDataService: any = null;

async function loadDeps() {
  if (!replaySessions) {
    const mod = await import("../../../market-replay/replay.session.js");
    replaySessions = mod.replaySessions;
  }
  if (!ReplayPaperService || !ReplayServiceClass || !getOptionPriceAtTimeFn) {
    const mod = await import("../../../market-replay/replay.service.js");
    ReplayPaperService = mod.ReplayPaperService;
    ReplayServiceClass = mod.ReplayService;
    getOptionPriceAtTimeFn = mod.getOptionPriceAtTime;
  }
  if (!liveMarketDataService) {
    const mod = await import("../../../market-data/live/live-market-data.service.js");
    liveMarketDataService = mod.liveMarketDataService;
  }
}

// Helper: check if currentTime is past EOD square-off time (e.g. 15:15) in Asia/Kolkata timezone
function isPastSquareOffTime(currentTime: Date, squareOffTimeStr?: string): boolean {
  const squareOffStr = squareOffTimeStr || "15:15";
  const parts = squareOffStr.split(":");
  const targetHours = Number(parts[0]) || 15;
  const targetMinutes = Number(parts[1]) || 15;

  // Convert currentTime to Kolkata timezone
  const kolkataTime = new Date(currentTime.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const hours = kolkataTime.getHours();
  const minutes = kolkataTime.getMinutes();

  if (hours > targetHours) return true;
  if (hours === targetHours && minutes >= targetMinutes) return true;
  return false;
}

// Helper: group 1-minute candles into 5-minute candles closed before nowSec
function getFiveMinuteCandles(candles1m: any[], nowSec: number) {
  const buckets: Record<number, any[]> = {};
  for (const c of candles1m) {
    if (c.time >= nowSec) continue; // Only process candles before current time
    const bucketStart = Math.floor(c.time / 300) * 300;
    if (!buckets[bucketStart]) {
      buckets[bucketStart] = [];
    }
    buckets[bucketStart].push(c);
  }

  const result: any[] = [];
  const sortedStarts = Object.keys(buckets).map(Number).sort((a, b) => a - b);

  for (const start of sortedStarts) {
    // Closed only if current time has reached the start of the next candle
    if (nowSec < start + 300) {
      continue;
    }

    const group = buckets[start] || [];
    if (group.length === 0) continue;
    group.sort((a, b) => a.time - b.time);

    result.push({
      time: start,
      open: group[0].open,
      high: Math.max(...group.map(g => g.high)),
      low: Math.min(...group.map(g => g.low)),
      close: group[group.length - 1].close,
    });
  }

  return result;
}

// Helper: fetch 1-minute candles for live/paper trading
async function get1MinuteCandles(
  app: any,
  brokerAccountId: string,
  exchange: string,
  symbolToken: string,
  currentTime: Date,
) {
  const brokerAccount = await app.db.brokerAccount.findUnique({
    where: { id: brokerAccountId },
  });
  if (!brokerAccount || !brokerAccount.apiKey || !brokerAccount.accessToken) {
    throw new AppError("Broker account session is missing", 400, "BROKER_SESSION_ERROR");
  }
  const todayStr = currentTime.toISOString().slice(0, 10);
  const fromDateStr = `${todayStr} 09:15`;
  const toDateStr = `${todayStr} 15:30`;

  const provider = new AngelMarketDataProvider();
  const response = await provider.getCandles({
    apiKey: brokerAccount.apiKey,
    accessToken: brokerAccount.accessToken,
    query: {
      brokerAccountId,
      exchange,
      symboltoken: symbolToken,
      interval: "ONE_MINUTE",
      fromDate: fromDateStr,
      toDate: toDateStr,
    },
  });

  if (!response || !response.status || !response.data) {
    return [];
  }

  return response.data.map((item: any) => {
    let isoString = String(item[0]);
    if (!isoString.includes("+") && !isoString.includes("Z")) {
      const cleanTime = isoString.replace(" ", "T");
      isoString = cleanTime.includes("T") ? `${cleanTime}+05:30` : `${cleanTime}T00:00:00+05:30`;
    }
    return {
      time: Math.floor(new Date(isoString).getTime() / 1000),
      open: Number(item[1]),
      high: Number(item[2]),
      low: Number(item[3]),
      close: Number(item[4]),
    };
  });
}

// Helper: fetch yesterday's high/low
async function getYesterdayHighLow(
  app: any,
  brokerAccountId: string,
  exchange: string,
  symbolToken: string,
  currentDate: Date,
): Promise<{ high: number; low: number }> {
  const brokerAccount = await app.db.brokerAccount.findUnique({
    where: { id: brokerAccountId },
  });
  if (!brokerAccount || !brokerAccount.apiKey || !brokerAccount.accessToken) {
    throw new AppError("Broker account session is missing", 400, "BROKER_SESSION_ERROR");
  }

  const toDate = new Date(currentDate);
  toDate.setDate(toDate.getDate() - 1);
  const fromDate = new Date(currentDate);
  fromDate.setDate(fromDate.getDate() - 10);

  const formatDate = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const fromDateStr = `${formatDate(fromDate)} 09:15`;
  const toDateStr = `${formatDate(toDate)} 15:30`;

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

// Helper: update strategy state in DB/session
async function updateStrategyState(context: StrategyContext, state: any) {
  await loadDeps();
  context.strategy.state = state;
  const isReplay = replaySessions.has(context.strategy.userId);
  if (!isReplay) {
    await context.app.db.strategy.update({
      where: { id: context.strategy.id },
      data: { state: state as any },
    });
  }
}

async function addStrategyLog(context: StrategyContext, message: string, meta: any = {}) {
  await loadDeps();
  const isReplay = context.isReplay === true || replaySessions.has(context.strategy.userId);
  if (isReplay) {
    const session = replaySessions.get(context.strategy.userId);
    if (session) {
      const timeStr = session.currentTime
        ? new Date(Number(session.currentTime) * 1000).toLocaleTimeString("en-IN", {
            timeZone: "Asia/Kolkata",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          })
        : "";
      const prefix = timeStr ? `[${timeStr}] ` : "";
      session.logs.push({
        id: `log_${Math.random().toString(36).substring(2, 11)}`,
        message: `${prefix}${message}`,
        meta,
        createdAt: new Date(),
      });
    }
  } else {
    await context.app.db.strategyLog.create({
      data: {
        strategyId: context.strategy.id,
        message,
        meta: meta || {},
      },
    });
  }
}

export class HighLowBreakoutReversalStrategy implements StrategyHandler {
  strategyType = "HIGH_LOW_BREAKOUT_REVERSAL";

  validateConfig(config: {
    rules: unknown;
    trade: unknown;
    risk: unknown;
    instrumentType: string;
    name: string;
  }): void {
    const { rules: rawRules, trade: rawTrade, risk: rawRisk, name } = config;

    if (!name || typeof name !== "string" || name.trim() === "") {
      throw new AppError("Strategy name is required", 400, "INVALID_STRATEGY_CONFIG");
    }

    const rules = rawRules as any;
    if (!rules) {
      throw new AppError("Strategy rules are required", 400, "INVALID_STRATEGY_CONFIG");
    }

    if (!rules.underlyingToken || typeof rules.underlyingToken !== "string") {
      throw new AppError("Underlying token is required", 400, "INVALID_STRATEGY_CONFIG");
    }

    if (!rules.underlyingExchange || typeof rules.underlyingExchange !== "string") {
      throw new AppError("Underlying exchange is required", 400, "INVALID_STRATEGY_CONFIG");
    }

    if (rules.timeframe !== "5m") {
      throw new AppError("Timeframe must be 5m", 400, "INVALID_STRATEGY_CONFIG");
    }

    const trade = rawTrade as any;
    if (!trade) {
      throw new AppError("Trade configuration is required", 400, "INVALID_TRADE_CONFIG");
    }

    if (trade.instrumentType !== "OPTION") {
      throw new AppError("Trade instrument type must be OPTION", 400, "INVALID_TRADE_CONFIG");
    }

    if (!trade.expiry || typeof trade.expiry !== "string") {
      throw new AppError("Trade expiry is required", 400, "INVALID_TRADE_CONFIG");
    }

    if (trade.quantity === undefined || trade.quantity === null || typeof trade.quantity !== "number" || trade.quantity <= 0) {
      throw new AppError("Trade quantity must be greater than 0", 400, "INVALID_TRADE_CONFIG");
    }

    const risk = rawRisk as any;
    if (!risk || typeof risk.rewardRatio !== "number" || risk.rewardRatio <= 0) {
      throw new AppError("Risk rewardRatio must be a positive number", 400, "INVALID_RISK_CONFIG");
    }
  }

  getRequiredSubscriptions(strategy: any): { exchangeType: number; tokens: string[] }[] {
    const rules = strategy.rules as any;
    const exchangeType = rules.underlyingExchange === "NSE" ? 1 : 1;
    return [
      {
        exchangeType,
        tokens: [rules.underlyingToken],
      },
    ];
  }

  async evaluateEntry(context: StrategyContext): Promise<StrategyDecision> {
    return {
      shouldExecute: false,
      reason: "Execution is managed via the execute method",
    };
  }

  async execute(context: StrategyContext): Promise<void> {
    if (!context.strategy.brokerAccountId) return;

    await loadDeps();

    const isReplay = replaySessions.has(context.strategy.userId);
    const replaySession = isReplay ? replaySessions.get(context.strategy.userId) : null;
    const currentTime = replaySession?.currentTime
      ? new Date(Number(replaySession.currentTime) * 1000)
      : new Date();

    const rules = context.strategy.rules as any;
    const trade = context.strategy.trade as any;
    const risk = context.strategy.risk as any;
    const brokerAccountId = context.strategy.brokerAccountId;
    const exchange = rules.underlyingExchange || "NSE";
    const underlyingToken = rules.underlyingToken;

    // Load or initialize state
    let state = (context.strategy.state as any) || {};
    if (!state.putTrack || !state.callTrack) {
      let yesterdayHigh = 0;
      let yesterdayLow = 0;

      try {
        if (isReplay) {
          yesterdayHigh = replaySession?.yesterdayHigh ?? 24000;
          yesterdayLow = replaySession?.yesterdayLow ?? 23800;
        } else {
          const yesterday = await getYesterdayHighLow(
            context.app,
            brokerAccountId,
            exchange,
            underlyingToken,
            currentTime,
          );
          yesterdayHigh = yesterday.high;
          yesterdayLow = yesterday.low;
        }
      } catch (err: any) {
        context.app.log.warn(err, `Failed to fetch yesterday's High/Low. Using baseline fallbacks.`);
        // Fallbacks based on typical index prices
        yesterdayHigh = 24000;
        yesterdayLow = 23800;
      }

      state = {
        lastLoggedCandleTime: 0,
        putTrack: {
          referenceHigh: yesterdayHigh,
          waitingForConfirmation: false,
          decisionCandle: null,
          isTradeOpen: false,
          lastCandleTime: 0,
          candleBStartLogged: false,
          hasLoggedWaiting: false,
          hasLoggedCandleBStart: false,
        },
        callTrack: {
          referenceLow: yesterdayLow,
          waitingForConfirmation: false,
          decisionCandle: null,
          isTradeOpen: false,
          lastCandleTime: 0,
          candleBStartLogged: false,
          hasLoggedWaiting: false,
          hasLoggedCandleBStart: false,
        },
      };
      await updateStrategyState(context, state);
    }

    // 1. EOD Square-off Check
    const squareOffTime = rules.squareOffTime || risk?.squareOffTime || "15:15";
    if (isPastSquareOffTime(currentTime, squareOffTime)) {
      let stateChanged = false;
      const eodNowSec = currentTime.getTime() / 1000;
      const eodTick = liveTickStore.getTick(brokerAccountId, underlyingToken);
      const eodUnderlyingLtp = eodTick?.ltp ?? 0;

      // Close PUT if open
      if (state.putTrack.isTradeOpen && state.putTrack.currentPositionId) {
        let optionLtp = state.putTrack.optionEntryPrice;
        if (isReplay && replaySession) {
          const replayOptPrice = getOptionPriceAtTimeFn(replaySession, state.putTrack.optionToken, eodNowSec);
          if (replayOptPrice !== null) {
            optionLtp = replayOptPrice;
          } else {
            optionLtp = state.putTrack.optionEntryPrice - (eodUnderlyingLtp - state.putTrack.underlyingEntryPrice) * 0.5;
          }
        } else {
          const tick = liveTickStore.getTick(brokerAccountId, underlyingToken);
          if (tick) {
            optionLtp = state.putTrack.optionEntryPrice - (tick.ltp - state.putTrack.underlyingEntryPrice) * 0.5;
          }
        }

        if (isReplay) {
          const paperService = new ReplayPaperService(replaySession!);
          await paperService.exitPosition(context.strategy.userId, state.putTrack.currentPositionId, { price: optionLtp });
        } else {
          const paperService = new PaperTradingService(context.app.db);
          await paperService.exitPosition(context.strategy.userId, state.putTrack.currentPositionId, { price: optionLtp });
          try {
            liveMarketDataService.unsubscribe(context.strategy.userId, brokerAccountId, [
              { exchangeType: 2, tokens: [state.putTrack.optionToken] }
            ]);
          } catch {}
        }
        await addStrategyLog(context, `[EXIT] EOD square-off executed. Closed PUT option position.`);
        state.putTrack.isTradeOpen = false;
        state.putTrack.currentPositionId = undefined;
        stateChanged = true;
      }

      // Close CALL if open
      if (state.callTrack.isTradeOpen && state.callTrack.currentPositionId) {
        let optionLtp = state.callTrack.optionEntryPrice;
        if (isReplay && replaySession) {
          const replayOptPrice = getOptionPriceAtTimeFn(replaySession, state.callTrack.optionToken, eodNowSec);
          if (replayOptPrice !== null) {
            optionLtp = replayOptPrice;
          } else {
            optionLtp = state.callTrack.optionEntryPrice + (eodUnderlyingLtp - state.callTrack.underlyingEntryPrice) * 0.5;
          }
        } else {
          const tick = liveTickStore.getTick(brokerAccountId, underlyingToken);
          if (tick) {
            optionLtp = state.callTrack.optionEntryPrice + (tick.ltp - state.callTrack.underlyingEntryPrice) * 0.5;
          }
        }

        if (isReplay) {
          const paperService = new ReplayPaperService(replaySession!);
          await paperService.exitPosition(context.strategy.userId, state.callTrack.currentPositionId, { price: optionLtp });
        } else {
          const paperService = new PaperTradingService(context.app.db);
          await paperService.exitPosition(context.strategy.userId, state.callTrack.currentPositionId, { price: optionLtp });
          try {
            liveMarketDataService.unsubscribe(context.strategy.userId, brokerAccountId, [
              { exchangeType: 2, tokens: [state.callTrack.optionToken] }
            ]);
          } catch {}
        }
        await addStrategyLog(context, `[EXIT] EOD square-off executed. Closed CALL option position.`);
        state.callTrack.isTradeOpen = false;
        state.callTrack.currentPositionId = undefined;
        stateChanged = true;
      }

      if (stateChanged) {
        await updateStrategyState(context, state);
      }
      return;
    }

    // 2. Fetch candles and group
    let candles1m: any[] = [];
    if (isReplay) {
      candles1m = replaySession!.candles;
    } else {
      candles1m = await get1MinuteCandles(context.app, brokerAccountId, exchange, underlyingToken, currentTime);
    }

    const closedCandles = getFiveMinuteCandles(candles1m, currentTime.getTime() / 1000);
    if (closedCandles.length === 0) return;

    const lastCandle = closedCandles[closedCandles.length - 1];
    const tick = liveTickStore.getTick(brokerAccountId, underlyingToken);
    const underlyingLtp = tick?.ltp ?? lastCandle.close;

    const nowSec = currentTime.getTime() / 1000;
    const currentCandleTime = Math.floor(nowSec / 300) * 300;

    let candleLogged = false;
    for (const c of closedCandles) {
      if (c.time > (state.lastLoggedCandleTime || 0)) {
        state.lastLoggedCandleTime = c.time;
        candleLogged = true;
      }
    }
    if (candleLogged) {
      await updateStrategyState(context, state);
    }

    // 3. Process PUT Track
    if (state.putTrack.isTradeOpen) {
      let isOpen = false;
      if (isReplay) {
        const pos = replaySession!.positions.find((p: any) => p.id === state.putTrack.currentPositionId && p.status === "OPEN");
        isOpen = !!pos;
      } else {
        const pos = await context.app.db.paperPosition.findFirst({
          where: { id: state.putTrack.currentPositionId, status: "OPEN" }
        });
        isOpen = !!pos;
      }

      if (!isOpen) {
        state.putTrack.isTradeOpen = false;
        state.putTrack.currentPositionId = undefined;
        await updateStrategyState(context, state);
      } else {
        const simulatedOptionPrice = state.putTrack.optionEntryPrice - (underlyingLtp - state.putTrack.underlyingEntryPrice) * 0.5;
        let optionLtp: number;
        if (isReplay && replaySession) {
          const replayOptPrice = getOptionPriceAtTimeFn(replaySession, state.putTrack.optionToken, nowSec);
          optionLtp = replayOptPrice !== null ? replayOptPrice : simulatedOptionPrice;
        } else {
          const optTick = liveTickStore.getTick(brokerAccountId, state.putTrack.optionToken);
          optionLtp = optTick?.ltp ?? simulatedOptionPrice;
        }

        let triggerExit = false;
        let exitReason = "";

        if (underlyingLtp >= state.putTrack.stopLoss) {
          triggerExit = true;
          exitReason = `PUT Stop Loss hit at underlying ₹${underlyingLtp} (SL: ₹${state.putTrack.stopLoss})`;
        } else if (optionLtp >= state.putTrack.optionTarget) {
          triggerExit = true;
          exitReason = `PUT Target hit at option ₹${optionLtp} (Target: ₹${state.putTrack.optionTarget})`;
        }

        if (triggerExit) {
          if (isReplay) {
            const paperService = new ReplayPaperService(replaySession!);
            await paperService.exitPosition(context.strategy.userId, state.putTrack.currentPositionId, { price: optionLtp });
          } else {
            const paperService = new PaperTradingService(context.app.db);
            await paperService.exitPosition(context.strategy.userId, state.putTrack.currentPositionId, { price: optionLtp });
            try {
              liveMarketDataService.unsubscribe(context.strategy.userId, brokerAccountId, [
                { exchangeType: 2, tokens: [state.putTrack.optionToken] }
              ]);
            } catch {}
          }
          await addStrategyLog(context, `[EXIT] ${exitReason}`, { underlyingLtp, optionLtp });

          const refHigh = state.putTrack.decisionCandle ? state.putTrack.decisionCandle.high : state.putTrack.decisionCandleHigh;
          state.putTrack.referenceHigh = refHigh;
          state.putTrack.isTradeOpen = false;
          state.putTrack.currentPositionId = undefined;
          state.putTrack.decisionCandle = null;
          state.putTrack.hasLoggedWaiting = false;
          state.putTrack.hasLoggedCandleBStart = false;
          await updateStrategyState(context, state);
        }
      }
    } else {
      // Step 2 — Confirmation Candle B
      if (state.putTrack.waitingForConfirmation) {
        if (currentCandleTime > state.putTrack.decisionCandle.time + 300) {
          await addStrategyLog(context, "[FAILED] No confirmation in candle B");
          state.putTrack.waitingForConfirmation = false;
          state.putTrack.decisionCandle = null;
          state.putTrack.candleBStartLogged = false;
          state.putTrack.hasLoggedWaiting = false;
          state.putTrack.hasLoggedCandleBStart = false;
          await updateStrategyState(context, state);
        } else if (currentCandleTime === state.putTrack.decisionCandle.time + 300) {
          if (!state.putTrack.hasLoggedCandleBStart) {
            await addStrategyLog(context, `[CANDLE B START] Time: ${new Date(currentCandleTime * 1000).toISOString()}`);
            state.putTrack.candleBStartLogged = true;
            state.putTrack.hasLoggedCandleBStart = true;
            await updateStrategyState(context, state);
          }

          if (underlyingLtp < state.putTrack.decisionCandle.low) {
            await addStrategyLog(context, `[CHECK B SUCCESS] LTP: ${underlyingLtp} < DecisionLow: ${state.putTrack.decisionCandle.low}`);

            const provider = new AngelInstrumentProvider();
            const contracts = await provider.getOptionContracts({
              symbol: (context.strategy as any).symbol,
              expiry: trade.expiry,
            });

            if (contracts.length > 0) {
              const strikes = [...new Set(contracts.map(c => c.strike))].sort((a, b) => a - b);
              const firstStrike = strikes[0] || 0;
              const atmStrike = strikes.reduce((nearest, strike) => {
                if (nearest === undefined) return strike;
                return Math.abs(strike - underlyingLtp) < Math.abs(nearest - underlyingLtp) ? strike : nearest;
              }, firstStrike);

              const peContract = contracts.find(c => c.strike === atmStrike && c.optionType === "PE");
              if (peContract) {
                let optionEntryPrice = underlyingLtp * 0.01;
                let positionId = "";

                if (isReplay) {
                  // Fetch real historical option candles for this PE contract
                  const replayService = new ReplayServiceClass(context.app);
                  const replayDate = new Date(Number(replaySession!.currentTime) * 1000)
                    .toISOString().slice(0, 10);
                  await replayService.fetchOptionCandles(replaySession!, peContract.token, "NFO", replayDate);
                  const realPrice = getOptionPriceAtTimeFn(replaySession!, peContract.token, nowSec);
                  if (realPrice !== null && realPrice > 0) {
                    optionEntryPrice = realPrice;
                  }

                  await addStrategyLog(context,
                    `[OPTION MAP] Underlying: ${underlyingLtp}, Strike: ${atmStrike}, Expiry: ${trade.expiry}, Symbol: ${peContract.symbol}, Token: ${peContract.token}, Price: ${optionEntryPrice}`);

                  const paperService = new ReplayPaperService(replaySession!);
                  const orderResult = await paperService.createOrder(context.strategy.userId, {
                    strategyId: context.strategy.id,
                    brokerAccountId: replaySession!.brokerAccountId,
                    instrumentType: "OPTION",
                    token: peContract.token,
                    symbol: peContract.symbol,
                    exchangeType: 2,
                    exchange: "NFO",
                    side: "BUY",
                    quantity: trade.quantity,
                    price: optionEntryPrice,
                  });
                  positionId = orderResult.id;
                } else {
                  const paperService = new PaperTradingService(context.app.db);
                  const orderResult = await paperService.createOrder(context.strategy.userId, {
                    strategyId: context.strategy.id,
                    brokerAccountId,
                    instrumentType: "OPTION",
                    token: peContract.token,
                    symbol: peContract.symbol,
                    exchangeType: 2,
                    exchange: "NFO",
                    side: "BUY",
                    quantity: trade.quantity,
                  });
                  optionEntryPrice = orderResult.position.avgPrice;
                  positionId = orderResult.position.id;

                  liveMarketDataService.subscribe(context.strategy.userId, brokerAccountId, [
                    { exchangeType: 2, tokens: [peContract.token] }
                  ]);
                }

                const riskPoints = Math.abs(state.putTrack.decisionCandle.high - underlyingLtp);
                const riskValue = riskPoints * 0.5;
                const rewardRatio = risk?.rewardRatio || 3;
                const underlyingSL = state.putTrack.decisionCandle.high;
                const underlyingTarget = underlyingLtp - (rewardRatio * riskPoints);
                const optionTarget = optionEntryPrice + rewardRatio * riskValue;
                const optionSL = optionEntryPrice - riskValue;

                state.putTrack = {
                  ...state.putTrack,
                  isTradeOpen: true,
                  waitingForConfirmation: false,
                  candleBStartLogged: false,
                  currentPositionId: positionId,
                  underlyingEntryPrice: underlyingLtp,
                  optionToken: peContract.token,
                  optionSymbol: peContract.symbol,
                  optionEntryPrice,
                  optionTarget,
                  stopLoss: underlyingSL,
                  decisionCandleHigh: state.putTrack.decisionCandle.high,
                  lastCandleTime: currentCandleTime,
                  hasLoggedWaiting: false,
                  hasLoggedCandleBStart: false,
                };
                await updateStrategyState(context, state);
                await addStrategyLog(context, `[ENTRY]\nUnderlying: ${underlyingLtp}\nOption Entry: ₹${optionEntryPrice.toFixed(2)}`);
                await addStrategyLog(context, `[PLAN]\n\nUnderlying:\nEntry: ${underlyingLtp}\nStop Loss: ${underlyingSL}\nTarget: ${underlyingTarget.toFixed(2)}\n\nOption:\nEntry: ₹${optionEntryPrice.toFixed(2)}\nStop Loss: ₹${optionSL.toFixed(2)}\nTarget: ₹${optionTarget.toFixed(2)}\n\nRisk: ₹${riskValue.toFixed(2)}\nReward: ₹${(rewardRatio * riskValue).toFixed(2)}\nRR: 1:${rewardRatio}`);
              }
            }
          }
        }
      }

      // Step 1 — Detect Candle A (only check on closed candle when no trade is open and not waiting for confirmation)
      if (!state.putTrack.isTradeOpen && !state.putTrack.waitingForConfirmation) {
        const isNewClosedCandle = lastCandle.time !== state.putTrack.lastEvaluatedCandleTime;
        if (isNewClosedCandle) {
          const hasCrossed = lastCandle.high > state.putTrack.referenceHigh;
          const isBearish = lastCandle.close < lastCandle.open;

          if (hasCrossed && isBearish) {
            await addStrategyLog(
              context,
              `[CANDLE A DETECTED] Time: ${new Date(lastCandle.time * 1000).toISOString()}, High: ${lastCandle.high}, Low: ${lastCandle.low}`
            );
            if (!state.putTrack.hasLoggedWaiting) {
              await addStrategyLog(context, "[WAITING] Waiting for confirmation");
              state.putTrack.hasLoggedWaiting = true;
            }
            state.putTrack.decisionCandle = {
              time: lastCandle.time,
              open: lastCandle.open,
              high: lastCandle.high,
              low: lastCandle.low,
              close: lastCandle.close,
            };
            state.putTrack.decisionCandleHigh = lastCandle.high;
            state.putTrack.waitingForConfirmation = true;
            state.putTrack.lastEvaluatedCandleTime = lastCandle.time;
            await updateStrategyState(context, state);
          } else {
            state.putTrack.lastEvaluatedCandleTime = lastCandle.time;
            await updateStrategyState(context, state);
          }
        }
      }
    }

    // 4. Process CALL Track
    if (state.callTrack.isTradeOpen) {
      let isOpen = false;
      if (isReplay) {
        const pos = replaySession!.positions.find((p: any) => p.id === state.callTrack.currentPositionId && p.status === "OPEN");
        isOpen = !!pos;
      } else {
        const pos = await context.app.db.paperPosition.findFirst({
          where: { id: state.callTrack.currentPositionId, status: "OPEN" }
        });
        isOpen = !!pos;
      }

      if (!isOpen) {
        state.callTrack.isTradeOpen = false;
        state.callTrack.currentPositionId = undefined;
        await updateStrategyState(context, state);
      } else {
        const simulatedOptionPrice = state.callTrack.optionEntryPrice + (underlyingLtp - state.callTrack.underlyingEntryPrice) * 0.5;
        let optionLtp: number;
        if (isReplay && replaySession) {
          const replayOptPrice = getOptionPriceAtTimeFn(replaySession, state.callTrack.optionToken, nowSec);
          optionLtp = replayOptPrice !== null ? replayOptPrice : simulatedOptionPrice;
        } else {
          const optTick = liveTickStore.getTick(brokerAccountId, state.callTrack.optionToken);
          optionLtp = optTick?.ltp ?? simulatedOptionPrice;
        }

        let triggerExit = false;
        let exitReason = "";

        if (underlyingLtp <= state.callTrack.stopLoss) {
          triggerExit = true;
          exitReason = `CALL Stop Loss hit at underlying ₹${underlyingLtp} (SL: ₹${state.callTrack.stopLoss})`;
        } else if (optionLtp >= state.callTrack.optionTarget) {
          triggerExit = true;
          exitReason = `CALL Target hit at option ₹${optionLtp} (Target: ₹${state.callTrack.optionTarget})`;
        }

        if (triggerExit) {
          if (isReplay) {
            const paperService = new ReplayPaperService(replaySession!);
            await paperService.exitPosition(context.strategy.userId, state.callTrack.currentPositionId, { price: optionLtp });
          } else {
            const paperService = new PaperTradingService(context.app.db);
            await paperService.exitPosition(context.strategy.userId, state.callTrack.currentPositionId, { price: optionLtp });
            try {
              liveMarketDataService.unsubscribe(context.strategy.userId, brokerAccountId, [
                { exchangeType: 2, tokens: [state.callTrack.optionToken] }
              ]);
            } catch {}
          }
          await addStrategyLog(context, `[EXIT] ${exitReason}`, { underlyingLtp, optionLtp });

          const refLow = state.callTrack.decisionCandle ? state.callTrack.decisionCandle.low : state.callTrack.decisionCandleLow;
          state.callTrack.referenceLow = refLow;
          state.callTrack.isTradeOpen = false;
          state.callTrack.currentPositionId = undefined;
          state.callTrack.decisionCandle = null;
          state.callTrack.hasLoggedWaiting = false;
          state.callTrack.hasLoggedCandleBStart = false;
          await updateStrategyState(context, state);
        }
      }
    } else {
      // Step 2 — Confirmation Candle B
      if (state.callTrack.waitingForConfirmation) {
        if (currentCandleTime > state.callTrack.decisionCandle.time + 300) {
          await addStrategyLog(context, "[FAILED] No confirmation in candle B");
          state.callTrack.waitingForConfirmation = false;
          state.callTrack.decisionCandle = null;
          state.callTrack.candleBStartLogged = false;
          state.callTrack.hasLoggedWaiting = false;
          state.callTrack.hasLoggedCandleBStart = false;
          await updateStrategyState(context, state);
        } else if (currentCandleTime === state.callTrack.decisionCandle.time + 300) {
          if (!state.callTrack.hasLoggedCandleBStart) {
            await addStrategyLog(context, `[CANDLE B START] Time: ${new Date(currentCandleTime * 1000).toISOString()}`);
            state.callTrack.candleBStartLogged = true;
            state.callTrack.hasLoggedCandleBStart = true;
            await updateStrategyState(context, state);
          }

          if (underlyingLtp > state.callTrack.decisionCandle.high) {
            await addStrategyLog(context, `[CHECK B SUCCESS] LTP: ${underlyingLtp} > DecisionHigh: ${state.callTrack.decisionCandle.high}`);

            const provider = new AngelInstrumentProvider();
            const contracts = await provider.getOptionContracts({
              symbol: (context.strategy as any).symbol,
              expiry: trade.expiry,
            });

            if (contracts.length > 0) {
              const strikes = [...new Set(contracts.map(c => c.strike))].sort((a, b) => a - b);
              const firstStrike = strikes[0] || 0;
              const atmStrike = strikes.reduce((nearest, strike) => {
                if (nearest === undefined) return strike;
                return Math.abs(strike - underlyingLtp) < Math.abs(nearest - underlyingLtp) ? strike : nearest;
              }, firstStrike);

              const ceContract = contracts.find(c => c.strike === atmStrike && c.optionType === "CE");
              if (ceContract) {
                let optionEntryPrice = underlyingLtp * 0.01;
                let positionId = "";

                if (isReplay) {
                  // Fetch real historical option candles for this CE contract
                  const replayService = new ReplayServiceClass(context.app);
                  const replayDate = new Date(Number(replaySession!.currentTime) * 1000)
                    .toISOString().slice(0, 10);
                  await replayService.fetchOptionCandles(replaySession!, ceContract.token, "NFO", replayDate);
                  const realPrice = getOptionPriceAtTimeFn(replaySession!, ceContract.token, nowSec);
                  if (realPrice !== null && realPrice > 0) {
                    optionEntryPrice = realPrice;
                  }

                  await addStrategyLog(context,
                    `[OPTION MAP] Underlying: ${underlyingLtp}, Strike: ${atmStrike}, Expiry: ${trade.expiry}, Symbol: ${ceContract.symbol}, Token: ${ceContract.token}, Price: ${optionEntryPrice}`);

                  const paperService = new ReplayPaperService(replaySession!);
                  const orderResult = await paperService.createOrder(context.strategy.userId, {
                    strategyId: context.strategy.id,
                    brokerAccountId: replaySession!.brokerAccountId,
                    instrumentType: "OPTION",
                    token: ceContract.token,
                    symbol: ceContract.symbol,
                    exchangeType: 2,
                    exchange: "NFO",
                    side: "BUY",
                    quantity: trade.quantity,
                    price: optionEntryPrice,
                  });
                  positionId = orderResult.id;
                } else {
                  const paperService = new PaperTradingService(context.app.db);
                  const orderResult = await paperService.createOrder(context.strategy.userId, {
                    strategyId: context.strategy.id,
                    brokerAccountId,
                    instrumentType: "OPTION",
                    token: ceContract.token,
                    symbol: ceContract.symbol,
                    exchangeType: 2,
                    exchange: "NFO",
                    side: "BUY",
                    quantity: trade.quantity,
                  });
                  optionEntryPrice = orderResult.position.avgPrice;
                  positionId = orderResult.position.id;

                  liveMarketDataService.subscribe(context.strategy.userId, brokerAccountId, [
                    { exchangeType: 2, tokens: [ceContract.token] }
                  ]);
                }

                const riskPoints = Math.abs(underlyingLtp - state.callTrack.decisionCandle.low);
                const riskValue = riskPoints * 0.5;
                const rewardRatio = risk?.rewardRatio || 3;
                const underlyingSL = state.callTrack.decisionCandle.low;
                const underlyingTarget = underlyingLtp + (rewardRatio * riskPoints);
                const optionTarget = optionEntryPrice + rewardRatio * riskValue;
                const optionSL = optionEntryPrice - riskValue;

                state.callTrack = {
                  ...state.callTrack,
                  isTradeOpen: true,
                  waitingForConfirmation: false,
                  candleBStartLogged: false,
                  currentPositionId: positionId,
                  underlyingEntryPrice: underlyingLtp,
                  optionToken: ceContract.token,
                  optionSymbol: ceContract.symbol,
                  optionEntryPrice,
                  optionTarget,
                  stopLoss: underlyingSL,
                  decisionCandleLow: state.callTrack.decisionCandle.low,
                  lastCandleTime: currentCandleTime,
                  hasLoggedWaiting: false,
                  hasLoggedCandleBStart: false,
                };
                await updateStrategyState(context, state);
                await addStrategyLog(context, `[ENTRY]\nUnderlying: ${underlyingLtp}\nOption Entry: ₹${optionEntryPrice.toFixed(2)}`);
                await addStrategyLog(context, `[PLAN]\n\nUnderlying:\nEntry: ${underlyingLtp}\nStop Loss: ${underlyingSL}\nTarget: ${underlyingTarget.toFixed(2)}\n\nOption:\nEntry: ₹${optionEntryPrice.toFixed(2)}\nStop Loss: ₹${optionSL.toFixed(2)}\nTarget: ₹${optionTarget.toFixed(2)}\n\nRisk: ₹${riskValue.toFixed(2)}\nReward: ₹${(rewardRatio * riskValue).toFixed(2)}\nRR: 1:${rewardRatio}`);
              }
            }
          }
        }
      }

      // Step 1 — Detect Candle A (only check on closed candle when no trade is open and not waiting for confirmation)
      if (!state.callTrack.isTradeOpen && !state.callTrack.waitingForConfirmation) {
        const isNewClosedCandle = lastCandle.time !== state.callTrack.lastEvaluatedCandleTime;
        if (isNewClosedCandle) {
          const hasCrossed = lastCandle.low < state.callTrack.referenceLow;
          const isBullish = lastCandle.close > lastCandle.open;

          if (hasCrossed && isBullish) {
            await addStrategyLog(
              context,
              `[CANDLE A DETECTED] Time: ${new Date(lastCandle.time * 1000).toISOString()}, High: ${lastCandle.high}, Low: ${lastCandle.low}`
            );
            if (!state.callTrack.hasLoggedWaiting) {
              await addStrategyLog(context, "[WAITING] Waiting for confirmation");
              state.callTrack.hasLoggedWaiting = true;
            }
            state.callTrack.decisionCandle = {
              time: lastCandle.time,
              open: lastCandle.open,
              high: lastCandle.high,
              low: lastCandle.low,
              close: lastCandle.close,
            };
            state.callTrack.decisionCandleLow = lastCandle.low;
            state.callTrack.waitingForConfirmation = true;
            state.callTrack.lastEvaluatedCandleTime = lastCandle.time;
            await updateStrategyState(context, state);
          } else {
            state.callTrack.lastEvaluatedCandleTime = lastCandle.time;
            await updateStrategyState(context, state);
          }
        }
      }
    }
  }
}
