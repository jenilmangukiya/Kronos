import { liveTickStore } from "../../../../market-data/live/live-tick.store.js";
import { AppError } from "../../../../../errors/app-error.js";
import type {
  StrategyContext,
  StrategyDecision,
  StrategyHandler,
} from "../types.js";
import { angelInstrumentProvider } from "../../../../market-data/providers/angel-instrument.provider.js";
import { AngelMarketDataProvider } from "../../../../market-data/providers/angel.provider.js";
import { PaperTradingService } from "../../../../paper-trading/service.js";

import {
  loadDeps,
  getReplaySessions,
  getReplayPaperService,
  getLiveMarketDataService,
  getRealtimeService,
  getKolkataDateStr,
  isPastSquareOffTime,
  getFiveMinuteCandles,
  get1MinuteCandles,
  getYesterdayHighLow,
  updateStrategyState,
  addStrategyLog,
  getReplayOptionPriceWithFallback
} from "./utils.js";

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

    const isReplay = getReplaySessions().has(context.strategy.userId);
    const replaySession = isReplay ? getReplaySessions().get(context.strategy.userId) : null;
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

    const todayStr = getKolkataDateStr(currentTime);
    if (!state.todayStr || state.todayStr !== todayStr) {
      state.putTrack = undefined;
      state.callTrack = undefined;
      state.todayStr = todayStr;
      await updateStrategyState(context, state);
    }

    if (isReplay) {
      state.isSubscribed = true;
      state.isDataReady = true;
    } else {
      if (state.isSubscribed === undefined) {
        state.isSubscribed = false;
        state.isDataReady = false;
        state.subscriptionStartTime = 0;
        await updateStrategyState(context, state);
      }

      if (!state.isSubscribed) {
        const subscriptions = this.getRequiredSubscriptions(context.strategy);
        getLiveMarketDataService().subscribe(context.strategy.userId, brokerAccountId, subscriptions as any);
        state.isSubscribed = true;
        state.subscriptionStartTime = Date.now();
        await updateStrategyState(context, state);
        await addStrategyLog(context, "[SUBSCRIBE] Request sent");
      }

      if (!state.isDataReady) {
        const tick = liveTickStore.getTick(brokerAccountId, underlyingToken);
        if (tick && tick.ltp !== undefined && tick.ltp !== null) {
          state.isDataReady = true;
          await updateStrategyState(context, state);
          await addStrategyLog(context, "[READY] Data received, strategy active");
        } else {
          const elapsed = Date.now() - state.subscriptionStartTime;
          if (elapsed > 10000) {
            await addStrategyLog(context, "[ERROR] Subscription failed");
            await context.app.db.strategy.update({
              where: { id: context.strategy.id },
              data: { status: "STOPPED" },
            });
            try {
              const subscriptions = this.getRequiredSubscriptions(context.strategy);
              getLiveMarketDataService().unsubscribe(context.strategy.userId, brokerAccountId, subscriptions as any);
              await addStrategyLog(context, "Live market data unsubscribed");
            } catch {}
            await addStrategyLog(context, "Strategy stopped");
            getRealtimeService().publishStrategyDataChanged(context.strategy.id, [
              "logs",
              "strategy",
              "runtime",
            ]);
            return;
          }
        }
      }
    }

    if (!state.isDataReady) {
      return;
    }
    if (!state.putTrack || !state.callTrack) {
      let yesterdayHigh = 0;
      let yesterdayLow = 0;

      try {
        if (isReplay) {
          if (!replaySession?.yesterdayHigh || !replaySession?.yesterdayLow) {
            context.app.log.warn("Replay session is missing yesterday's High/Low.");
            return;
          }
          yesterdayHigh = replaySession.yesterdayHigh;
          yesterdayLow = replaySession.yesterdayLow;
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
        context.app.log.warn(err, `Failed to fetch yesterday's High/Low. Will retry on next tick.`);
        if (!isReplay) {
          const now = Date.now();
          const lastLogged = state.lastLoggedErrorTime || 0;
          if (now - lastLogged > 60 * 1000) {
            state.lastLoggedErrorTime = now;
            await updateStrategyState(context, state);
            await addStrategyLog(context, `[WARNING] Failed to fetch yesterday's High/Low: ${err.message}. Retrying...`);
          }
        }
        return;
      }

      state = {
        ...state,
        lastLoggedCandleTime: 0,
        yesterdayHigh,
        yesterdayLow,
        lastProcessedCandleTime: 0,
        putTrack: {
          referenceHigh: yesterdayHigh,
          yesterdayHigh,
          yesterdayLow,
          waitingForConfirmation: false,
          decisionCandle: null,
          isTradeOpen: false,
          lastCandleTime: 0,
          candleBStartLogged: false,
          hasLoggedWaiting: false,
          hasLoggedCandleBStart: false,
          lastProcessedCandleTime: 0,
          hasProcessedCandle: false,
          hasEnteredTrade: false,
        },
        callTrack: {
          referenceLow: yesterdayLow,
          yesterdayHigh,
          yesterdayLow,
          waitingForConfirmation: false,
          decisionCandle: null,
          isTradeOpen: false,
          lastCandleTime: 0,
          candleBStartLogged: false,
          hasLoggedWaiting: false,
          hasLoggedCandleBStart: false,
          lastProcessedCandleTime: 0,
          hasProcessedCandle: false,
          hasEnteredTrade: false,
        },
      };
      await updateStrategyState(context, state);
      await addStrategyLog(context, `[INIT] Yesterday High: ${yesterdayHigh}, Low: ${yesterdayLow}`);
    }

    if (!state.putTrack || !state.callTrack) {
      return;
    }

    // Fetch underlying LTP and update/reset currentCandle state
    const tick = liveTickStore.getTick(brokerAccountId, underlyingToken);
    const underlyingLtp = tick?.ltp ?? 0;
    if (underlyingLtp <= 0) {
      return;
    }

    const nowSec = currentTime.getTime() / 1000;
    const startTime = Math.floor(nowSec / 300) * 300;

    if (!state.currentCandle || state.currentCandle.startTime !== startTime) {
      if (state.currentCandle) {
        state.closedCandle = { ...state.currentCandle };
      }
      state.currentCandle = {
        startTime,
        open: underlyingLtp,
        high: underlyingLtp,
        low: underlyingLtp,
        close: underlyingLtp,
      };
    } else {
      state.currentCandle.high = Math.max(state.currentCandle.high, underlyingLtp);
      state.currentCandle.low = Math.min(state.currentCandle.low, underlyingLtp);
      state.currentCandle.close = underlyingLtp;
    }
    context.strategy.state = state;
    await updateStrategyState(context, state);

    // 1. EOD Square-off Check
    const squareOffTime = rules.squareOffTime || risk?.squareOffTime || "15:15";
    if (isPastSquareOffTime(currentTime, squareOffTime)) {
      let stateChanged = false;
      const eodNowSec = currentTime.getTime() / 1000;
      const eodUnderlyingLtp = state.currentCandle.close;

      // Close PUT if open
      if (state.putTrack.isTradeOpen && state.putTrack.currentPositionId) {
        let optionLtp = 0;
        if (isReplay && replaySession) {
          optionLtp = await getReplayOptionPriceWithFallback(
            context,
            replaySession,
            state.putTrack.optionToken,
            eodNowSec,
            "PE",
            state.putTrack.strike,
            eodUnderlyingLtp
          );
        } else {
          const optTick = liveTickStore.getTick(brokerAccountId, state.putTrack.optionToken);
          if (optTick && optTick.ltp > 0) {
            optionLtp = optTick.ltp;
          } else {
            try {
              const brokerAccount = await context.app.db.brokerAccount.findUnique({
                where: { id: brokerAccountId },
              });
              if (brokerAccount && brokerAccount.apiKey && brokerAccount.accessToken) {
                const provider = new AngelMarketDataProvider();
                const ltpRes = await provider.getLtp({
                  apiKey: brokerAccount.apiKey,
                  accessToken: brokerAccount.accessToken,
                  query: {
                    brokerAccountId,
                    exchange: "NFO",
                    tradingsymbol: state.putTrack.optionSymbol,
                    symboltoken: state.putTrack.optionToken,
                  },
                });
                if (ltpRes && ltpRes.status && ltpRes.data && ltpRes.data.ltp) {
                  optionLtp = Number(ltpRes.data.ltp);
                }
              }
            } catch (err) {
              context.app.log.error(err, `Failed to fetch live LTP for PE contract during EOD`);
            }
          }
        }

        if (optionLtp <= 0) {
          await addStrategyLog(context, `[ERROR] Live option price not available for EOD exit of PUT`);
          return;
        }

        if (isReplay) {
          const paperService = new (getReplayPaperService())(replaySession!);
          await paperService.exitPosition(context.strategy.userId, state.putTrack.currentPositionId, { price: optionLtp });
        } else {
          const paperService = new PaperTradingService(context.app.db);
          await paperService.exitPosition(context.strategy.userId, state.putTrack.currentPositionId, { price: optionLtp });
          try {
            getLiveMarketDataService().unsubscribe(context.strategy.userId, brokerAccountId, [
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
        let optionLtp = 0;
        if (isReplay && replaySession) {
          optionLtp = await getReplayOptionPriceWithFallback(
            context,
            replaySession,
            state.callTrack.optionToken,
            eodNowSec,
            "CE",
            state.callTrack.strike,
            eodUnderlyingLtp
          );
        } else {
          const optTick = liveTickStore.getTick(brokerAccountId, state.callTrack.optionToken);
          if (optTick && optTick.ltp > 0) {
            optionLtp = optTick.ltp;
          } else {
            try {
              const brokerAccount = await context.app.db.brokerAccount.findUnique({
                where: { id: brokerAccountId },
              });
              if (brokerAccount && brokerAccount.apiKey && brokerAccount.accessToken) {
                const provider = new AngelMarketDataProvider();
                const ltpRes = await provider.getLtp({
                  apiKey: brokerAccount.apiKey,
                  accessToken: brokerAccount.accessToken,
                  query: {
                    brokerAccountId,
                    exchange: "NFO",
                    tradingsymbol: state.callTrack.optionSymbol,
                    symboltoken: state.callTrack.optionToken,
                  },
                });
                if (ltpRes && ltpRes.status && ltpRes.data && ltpRes.data.ltp) {
                  optionLtp = Number(ltpRes.data.ltp);
                }
              }
            } catch (err) {
              context.app.log.error(err, `Failed to fetch live LTP for CE contract during EOD`);
            }
          }
        }

        if (optionLtp <= 0) {
          await addStrategyLog(context, `[ERROR] Live option price not available for EOD exit of CALL`);
          return;
        }

        if (isReplay) {
          const paperService = new (getReplayPaperService())(replaySession!);
          await paperService.exitPosition(context.strategy.userId, state.callTrack.currentPositionId, { price: optionLtp });
        } else {
          const paperService = new PaperTradingService(context.app.db);
          await paperService.exitPosition(context.strategy.userId, state.callTrack.currentPositionId, { price: optionLtp });
          try {
            getLiveMarketDataService().unsubscribe(context.strategy.userId, brokerAccountId, [
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
        context.strategy.state = state;
        await updateStrategyState(context, state);
      }
      return;
    }

    // 2. Process PUT Track Exits (Real-time SL/Target checks)
    if (state.putTrack.isTradeOpen && state.putTrack.currentPositionId) {
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
        context.strategy.state = state;
        await updateStrategyState(context, state);
      } else {
        let optionLtp = 0;
        if (isReplay && replaySession) {
          optionLtp = await getReplayOptionPriceWithFallback(
            context,
            replaySession,
            state.putTrack.optionToken,
            nowSec,
            "PE",
            state.putTrack.strike,
            underlyingLtp
          );
        } else {
          const optTick = liveTickStore.getTick(brokerAccountId, state.putTrack.optionToken);
          if (optTick && optTick.ltp > 0) {
            optionLtp = optTick.ltp;
          }
        }

        if (optionLtp <= 0) {
          await addStrategyLog(context, `[WARNING] Option price not available for PUT trade tracking, skipping exit check for this tick`);
        } else {
          let triggerExit = false;
          let exitReason = "";
          if (state.currentCandle.high >= state.putTrack.stopLoss) {
            triggerExit = true;
            exitReason = `PUT Stop Loss hit at underlying ₹${state.currentCandle.high} (SL: ₹${state.putTrack.stopLoss})`;
          } else if (state.currentCandle.low <= (state.putTrack.underlyingTarget ?? 0)) {
            triggerExit = true;
            exitReason = `PUT Target hit at underlying ₹${state.currentCandle.low} (Target: ₹${state.putTrack.underlyingTarget})`;
          }

          if (triggerExit) {
            if (isReplay) {
              const paperService = new (getReplayPaperService())(replaySession!);
              await paperService.exitPosition(context.strategy.userId, state.putTrack.currentPositionId, { price: optionLtp });
            } else {
              const paperService = new PaperTradingService(context.app.db);
              await paperService.exitPosition(context.strategy.userId, state.putTrack.currentPositionId, { price: optionLtp });
              try {
                getLiveMarketDataService().unsubscribe(context.strategy.userId, brokerAccountId, [
                  { exchangeType: 2, tokens: [state.putTrack.optionToken] }
                ]);
              } catch {}
            }
            await addStrategyLog(context, `[EXIT] ${exitReason}`, { underlyingLtp: state.currentCandle.close, optionLtp });
            const refHigh = state.putTrack.decisionCandle ? state.putTrack.decisionCandle.high : state.putTrack.decisionCandleHigh;
            state.putTrack.referenceHigh = refHigh;
            state.putTrack.isTradeOpen = false;
            state.putTrack.currentPositionId = undefined;
            state.putTrack.decisionCandle = null;
            state.putTrack.waitingForConfirmation = false;
            state.putTrack.hasLoggedWaiting = false;
            state.putTrack.hasLoggedCandleBStart = false;
            context.strategy.state = state;
            await updateStrategyState(context, state);
          }
        }
      }
    }

    // 3. Process CALL Track Exits (Real-time SL/Target checks)
    if (state.callTrack.isTradeOpen && state.callTrack.currentPositionId) {
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
        context.strategy.state = state;
        await updateStrategyState(context, state);
      } else {
        let optionLtp = 0;
        if (isReplay && replaySession) {
          optionLtp = await getReplayOptionPriceWithFallback(
            context,
            replaySession,
            state.callTrack.optionToken,
            nowSec,
            "CE",
            state.callTrack.strike,
            underlyingLtp
          );
        } else {
          const optTick = liveTickStore.getTick(brokerAccountId, state.callTrack.optionToken);
          if (optTick && optTick.ltp > 0) {
            optionLtp = optTick.ltp;
          }
        }

        if (optionLtp <= 0) {
          await addStrategyLog(context, `[WARNING] Option price not available for CALL trade tracking, skipping exit check for this tick`);
        } else {
          let triggerExit = false;
          let exitReason = "";
          if (state.currentCandle.low <= state.callTrack.stopLoss) {
            triggerExit = true;
            exitReason = `CALL Stop Loss hit at underlying ₹${state.currentCandle.low} (SL: ₹${state.callTrack.stopLoss})`;
          } else if (state.currentCandle.high >= (state.callTrack.underlyingTarget ?? 999999)) {
            triggerExit = true;
            exitReason = `CALL Target hit at underlying ₹${state.currentCandle.high} (Target: ₹${state.callTrack.underlyingTarget})`;
          }

          if (triggerExit) {
            if (isReplay) {
              const paperService = new (getReplayPaperService())(replaySession!);
              await paperService.exitPosition(context.strategy.userId, state.callTrack.currentPositionId, { price: optionLtp });
            } else {
              const paperService = new PaperTradingService(context.app.db);
              await paperService.exitPosition(context.strategy.userId, state.callTrack.currentPositionId, { price: optionLtp });
              try {
                getLiveMarketDataService().unsubscribe(context.strategy.userId, brokerAccountId, [
                  { exchangeType: 2, tokens: [state.callTrack.optionToken] }
                ]);
              } catch {}
            }
            await addStrategyLog(context, `[EXIT] ${exitReason}`, { underlyingLtp: state.currentCandle.close, optionLtp });
            const refLow = state.callTrack.decisionCandle ? state.callTrack.decisionCandle.low : state.callTrack.decisionCandleLow;
            state.callTrack.referenceLow = refLow;
            state.callTrack.isTradeOpen = false;
            state.callTrack.currentPositionId = undefined;
            state.callTrack.decisionCandle = null;
            state.callTrack.waitingForConfirmation = false;
            state.callTrack.hasLoggedWaiting = false;
            state.callTrack.hasLoggedCandleBStart = false;
            context.strategy.state = state;
            await updateStrategyState(context, state);
          }
        }
      }
    }

    // 2. Fetch candles and group
    let candles1m: any[] = [];
    if (isReplay) {
      // Slice visible candles up to the current session index
      candles1m = replaySession!.candles.slice(0, replaySession!.currentIndex + 1);
    } else {
      try {
        candles1m = await get1MinuteCandles(context.app, brokerAccountId, exchange, underlyingToken, currentTime);
      } catch (err: any) {
        const isAuthError = (e: any): boolean => {
          if (!e) return false;
          const msg = String(e.message || "").toLowerCase();
          const code = String(e.code || "").toLowerCase();
          const status = e.statusCode || 0;
          return (
            status === 401 ||
            status === 403 ||
            msg.includes("401") ||
            msg.includes("403") ||
            msg.includes("session expired") ||
            msg.includes("invalid token") ||
            code.includes("session_expired") ||
            code.includes("token_expired")
          );
        };

        if (isAuthError(err)) {
          const now = Date.now();
          const lastLogged = state.lastLoggedErrorTime || 0;
          if (now - lastLogged > 5 * 60 * 1000) {
            state.lastLoggedErrorTime = now;
            context.strategy.state = state;
            await updateStrategyState(context, state);
            await addStrategyLog(context, "[WARNING] Broker session expired/invalid. Strategy remains running; it will resume automatically once you log back in.");
          }
        }
        return;
      }
    }

    const closedCandles = getFiveMinuteCandles(candles1m);
    if (closedCandles.length === 0) return;
    const lastCandle = closedCandles[closedCandles.length - 1];

    // 3. CLOSED CANDLE GUARD (Make Replay Deterministic)
    if (state.lastProcessedCandleTime === lastCandle.time) {
      return;
    }
    state.lastProcessedCandleTime = lastCandle.time;
    context.strategy.state = state;
    await updateStrategyState(context, state);

    // 4. Process PUT Track Entry
    if (!state.putTrack.isTradeOpen) {
      const candleIndex = closedCandles.length - 1;
      const isNewClosedCandle = lastCandle.time !== (state.putTrack.lastProcessedCandleTime || 0);
      if (isNewClosedCandle) {
        state.putTrack.lastProcessedCandleTime = lastCandle.time;
        state.putTrack.hasProcessedCandle = false;
        state.putTrack.hasEnteredTrade = false;
        context.strategy.state = state;
        await updateStrategyState(context, state);

        if (candleIndex < 2) {
          const hasCrossed = lastCandle.high > state.putTrack.referenceHigh;
          const isBearish = lastCandle.close < lastCandle.open;
          if (hasCrossed && isBearish) {
            await addStrategyLog(context, `[SKIPPED]\nReason: Breakout detected on early candle (candleIndex: ${candleIndex}) before 09:25`);
          }
        } else {
          if (state.putTrack.hasProcessedCandle) return;
          state.putTrack.hasProcessedCandle = true;
          context.strategy.state = state;

          if (state.putTrack.waitingForConfirmation) {
            const decisionCandle = state.putTrack.decisionCandle;
            if (lastCandle.time > decisionCandle.time + 300) {
              await addStrategyLog(context, `[SKIPPED]\nReason: Missed Candle B window. Resetting state.`);
              state.putTrack.waitingForConfirmation = false;
              state.putTrack.decisionCandle = null;
              context.strategy.state = state;
              await updateStrategyState(context, state);
            } else if (lastCandle.time === decisionCandle.time + 300) {
              await addStrategyLog(
                context,
                `[CANDLE B CHECK]\nTime: ${new Date(lastCandle.time * 1000).toISOString()}\nDecisionLow: ${decisionCandle.low}\nCurrentLow: ${lastCandle.low}`
              );

              if (lastCandle.low < decisionCandle.low) {
                const contracts = await angelInstrumentProvider.getOptionContracts({
                  symbol: (context.strategy as any).symbol,
                  expiry: trade.expiry,
                });

                if (contracts.length > 0) {
                  const strikes = [...new Set(contracts.map(c => c.strike))].sort((a, b) => a - b);
                  const firstStrike = strikes[0] || 0;
                  const atmStrike = strikes.reduce((nearest, strike) => {
                    if (nearest === undefined) return strike;
                    return Math.abs(strike - lastCandle.close) < Math.abs(nearest - lastCandle.close) ? strike : nearest;
                  }, firstStrike);

                  const peContract = contracts.find(c => c.strike === atmStrike && c.optionType === "PE");
                  if (peContract) {
                    let optionEntryPrice = 0;
                    let positionId = "";

                    if (isReplay) {
                      const realPrice = await getReplayOptionPriceWithFallback(
                        context,
                        replaySession!,
                        peContract.token,
                        nowSec,
                        "PE",
                        atmStrike,
                        lastCandle.close
                      );
                      optionEntryPrice = realPrice;

                      await addStrategyLog(
                        context,
                        `[VALIDATION]\nUnderlying Price: ${lastCandle.close}\nOption Price: ${optionEntryPrice}\nStrike: ${atmStrike}`
                      );

                      // Strict entry guard
                      if (!peContract.token || !optionEntryPrice) {
                        await addStrategyLog(context, `[ERROR] Strict entry guard failed. token: ${peContract.token}, price: ${optionEntryPrice}`);
                        state.putTrack.waitingForConfirmation = false;
                        state.putTrack.decisionCandle = null;
                        context.strategy.state = state;
                        await updateStrategyState(context, state);
                        return;
                      }

                      if (state.putTrack.hasEnteredTrade) return;
                      state.putTrack.hasEnteredTrade = true;
                      context.strategy.state = state;

                      const paperService = new (getReplayPaperService())(replaySession!);
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
                      const brokerAccount = await context.app.db.brokerAccount.findUnique({
                        where: { id: brokerAccountId },
                      });
                      if (!brokerAccount || !brokerAccount.apiKey || !brokerAccount.accessToken) {
                        throw new AppError("Broker account session is missing", 400, "BROKER_SESSION_ERROR");
                      }

                      let livePrice = 0;
                      try {
                        const provider = new AngelMarketDataProvider();
                        const ltpRes = await provider.getLtp({
                          apiKey: brokerAccount.apiKey,
                          accessToken: brokerAccount.accessToken,
                          query: {
                            brokerAccountId,
                            exchange: "NFO",
                            tradingsymbol: peContract.symbol,
                            symboltoken: peContract.token,
                          },
                        });
                        if (ltpRes && ltpRes.status && ltpRes.data && ltpRes.data.ltp) {
                          livePrice = Number(ltpRes.data.ltp);
                        }
                      } catch (err) {
                        context.app.log.error(err, `Failed to fetch live LTP for PE contract ${peContract.symbol}`);
                      }

                      if (!livePrice || livePrice <= 0) {
                        await addStrategyLog(context, `[ERROR] Live option price not available for PE contract ${peContract.symbol}, skipping trade`);
                        state.putTrack.waitingForConfirmation = false;
                        state.putTrack.decisionCandle = null;
                        context.strategy.state = state;
                        await updateStrategyState(context, state);
                        return;
                      }
                      optionEntryPrice = livePrice;

                      await addStrategyLog(
                        context,
                        `[VALIDATION]\nUnderlying Price: ${lastCandle.close}\nOption Price: ${optionEntryPrice}\nStrike: ${atmStrike}`
                      );

                      // Strict entry guard
                      if (!peContract.token || !optionEntryPrice) {
                        await addStrategyLog(context, `[ERROR] Strict entry guard failed. token: ${peContract.token}, price: ${optionEntryPrice}`);
                        state.putTrack.waitingForConfirmation = false;
                        state.putTrack.decisionCandle = null;
                        context.strategy.state = state;
                        await updateStrategyState(context, state);
                        return;
                      }

                      if (state.putTrack.hasEnteredTrade) return;
                      state.putTrack.hasEnteredTrade = true;
                      context.strategy.state = state;

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
                        price: optionEntryPrice,
                      });
                      optionEntryPrice = orderResult.position.avgPrice;
                      positionId = orderResult.position.id;

                      getLiveMarketDataService().subscribe(context.strategy.userId, brokerAccountId, [
                        { exchangeType: 2, tokens: [peContract.token] }
                      ]);
                    }

                    const candleRange = decisionCandle.high - lastCandle.close;
                    let stopLoss: number;
                    let mode: string;
                    if (candleRange < 10) {
                      stopLoss = lastCandle.close + 10;
                      mode = "FIXED_10";
                    } else {
                      stopLoss = decisionCandle.high;
                      mode = "CANDLE_BASED";
                    }

                    await addStrategyLog(
                      context,
                      `[SL LOGIC]\nCandle Range: ${candleRange}\nApplied SL: ${stopLoss}\nMode: ${mode}`
                    );

                    const actualRisk = Math.abs(stopLoss - lastCandle.close);
                    const riskValue = actualRisk * 0.5;
                    const rewardRatio = risk?.rewardRatio || 3;
                    const underlyingSL = stopLoss;
                    const underlyingTarget = lastCandle.close - (rewardRatio * actualRisk);
                    const optionTarget = optionEntryPrice + rewardRatio * riskValue;
                    const optionSL = optionEntryPrice - riskValue;

                    state.putTrack = {
                      ...state.putTrack,
                      isTradeOpen: true,
                      waitingForConfirmation: false,
                      currentPositionId: positionId,
                      underlyingEntryPrice: lastCandle.close,
                      optionToken: peContract.token,
                      optionSymbol: peContract.symbol,
                      optionEntryPrice,
                      optionTarget,
                      stopLoss: underlyingSL,
                      decisionCandleHigh: decisionCandle.high,
                      lastCandleTime: lastCandle.time,
                      decisionCandle: null,
                      strike: atmStrike,
                      underlyingTarget,
                    };
                    context.strategy.state = state;
                    await updateStrategyState(context, state);
                    await addStrategyLog(context, `[ENTRY]\nTime: ${new Date(lastCandle.time * 1000).toISOString()}\nReason: Candle B broke Candle A low\nUnderlying: ${lastCandle.close}\nOption Entry: ₹${optionEntryPrice.toFixed(2)}`);
                    await addStrategyLog(context, `[PLAN]\n\nUnderlying:\nEntry: ${lastCandle.close}\nStop Loss: ${underlyingSL}\nTarget: ${underlyingTarget.toFixed(2)}\n\nOption:\nEntry: ₹${optionEntryPrice.toFixed(2)}\nStop Loss: ₹${optionSL.toFixed(2)}\nTarget: ₹${optionTarget.toFixed(2)}\n\nRisk: ₹${riskValue.toFixed(2)}\nReward: ₹${(rewardRatio * riskValue).toFixed(2)}\nRR: 1:${rewardRatio}`);
                  } else {
                    await addStrategyLog(
                      context,
                      `[SKIPPED]\nReason: No PE option contract found for strike ${atmStrike} and expiry ${trade.expiry || "N/A"}. Resetting confirmation state.`
                    );
                    state.putTrack.waitingForConfirmation = false;
                    state.putTrack.decisionCandle = null;
                    context.strategy.state = state;
                    await updateStrategyState(context, state);
                  }
                } else {
                  await addStrategyLog(
                    context,
                    `[SKIPPED]\nReason: No option contracts found for expiry ${trade.expiry || "N/A"}. Please check if the expiry has passed. Resetting confirmation state.`
                  );
                  state.putTrack.waitingForConfirmation = false;
                  state.putTrack.decisionCandle = null;
                  context.strategy.state = state;
                  await updateStrategyState(context, state);
                }
              } else {
                await addStrategyLog(context, `[SKIPPED]\nReason: Candle B low (${lastCandle.low}) did not break Candle A low (${decisionCandle.low})`);
                state.putTrack.waitingForConfirmation = false;
                state.putTrack.decisionCandle = null;
                context.strategy.state = state;
                await updateStrategyState(context, state);
              }
            }
          } else {
            const hasCrossed = lastCandle.high > state.putTrack.referenceHigh;
            const isBearish = lastCandle.close < lastCandle.open;

            if (hasCrossed && isBearish) {
              await addStrategyLog(
                context,
                `[CANDLE A FOUND]\nTime: ${new Date(lastCandle.time * 1000).toISOString()}\nHigh: ${lastCandle.high}\nLow: ${lastCandle.low}\nClose: ${lastCandle.close}\nColor: RED`
              );
              state.putTrack.decisionCandle = {
                time: lastCandle.time,
                open: lastCandle.open,
                high: lastCandle.high,
                low: lastCandle.low,
                close: lastCandle.close,
              };
              state.putTrack.decisionCandleHigh = lastCandle.high;
              state.putTrack.waitingForConfirmation = true;
              context.strategy.state = state;
              await updateStrategyState(context, state);
            } else {
              if (hasCrossed && !isBearish) {
                await addStrategyLog(context, `[SKIPPED]\nReason: Candle crossed referenceHigh but closed GREEN (not RED)`);
              }
            }
          }
        }
      }
    }

    // 5. Process CALL Track Entry
    if (!state.callTrack.isTradeOpen) {
      const candleIndex = closedCandles.length - 1;
      const isNewClosedCandle = lastCandle.time !== (state.callTrack.lastProcessedCandleTime || 0);
      if (isNewClosedCandle) {
        state.callTrack.lastProcessedCandleTime = lastCandle.time;
        state.callTrack.hasProcessedCandle = false;
        state.callTrack.hasEnteredTrade = false;
        context.strategy.state = state;
        await updateStrategyState(context, state);

        if (candleIndex < 2) {
          const hasCrossed = lastCandle.low < state.callTrack.referenceLow;
          const isBullish = lastCandle.close > lastCandle.open;
          if (hasCrossed && isBullish) {
            await addStrategyLog(context, `[SKIPPED]\nReason: Breakout detected on early candle (candleIndex: ${candleIndex}) before 09:25`);
          }
        } else {
          if (state.callTrack.hasProcessedCandle) return;
          state.callTrack.hasProcessedCandle = true;
          context.strategy.state = state;

          if (state.callTrack.waitingForConfirmation) {
            const decisionCandle = state.callTrack.decisionCandle;
            if (lastCandle.time > decisionCandle.time + 300) {
              await addStrategyLog(context, `[SKIPPED]\nReason: Missed Candle B window. Resetting state.`);
              state.callTrack.waitingForConfirmation = false;
              state.callTrack.decisionCandle = null;
              context.strategy.state = state;
              await updateStrategyState(context, state);
            } else if (lastCandle.time === decisionCandle.time + 300) {
              await addStrategyLog(
                context,
                `[CANDLE B CHECK]\nTime: ${new Date(lastCandle.time * 1000).toISOString()}\nDecisionHigh: ${decisionCandle.high}\nCurrentHigh: ${lastCandle.high}`
              );

              if (lastCandle.high > decisionCandle.high) {
                const contracts = await angelInstrumentProvider.getOptionContracts({
                  symbol: (context.strategy as any).symbol,
                  expiry: trade.expiry,
                });

                if (contracts.length > 0) {
                  const strikes = [...new Set(contracts.map(c => c.strike))].sort((a, b) => a - b);
                  const firstStrike = strikes[0] || 0;
                  const atmStrike = strikes.reduce((nearest, strike) => {
                    if (nearest === undefined) return strike;
                    return Math.abs(strike - lastCandle.close) < Math.abs(nearest - lastCandle.close) ? strike : nearest;
                  }, firstStrike);

                  const ceContract = contracts.find(c => c.strike === atmStrike && c.optionType === "CE");
                  if (ceContract) {
                    let optionEntryPrice = 0;
                    let positionId = "";

                    if (isReplay) {
                      const realPrice = await getReplayOptionPriceWithFallback(
                        context,
                        replaySession!,
                        ceContract.token,
                        nowSec,
                        "CE",
                        atmStrike,
                        lastCandle.close
                      );
                      optionEntryPrice = realPrice;

                      await addStrategyLog(
                        context,
                        `[VALIDATION]\nUnderlying Price: ${lastCandle.close}\nOption Price: ${optionEntryPrice}\nStrike: ${atmStrike}`
                      );

                      // Strict entry guard
                      if (!ceContract.token || !optionEntryPrice) {
                        await addStrategyLog(context, `[ERROR] Strict entry guard failed. token: ${ceContract.token}, price: ${optionEntryPrice}`);
                        state.callTrack.waitingForConfirmation = false;
                        state.callTrack.decisionCandle = null;
                        context.strategy.state = state;
                        await updateStrategyState(context, state);
                        return;
                      }

                      if (state.callTrack.hasEnteredTrade) return;
                      state.callTrack.hasEnteredTrade = true;
                      context.strategy.state = state;

                      const paperService = new (getReplayPaperService())(replaySession!);
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
                      const brokerAccount = await context.app.db.brokerAccount.findUnique({
                        where: { id: brokerAccountId },
                      });
                      if (!brokerAccount || !brokerAccount.apiKey || !brokerAccount.accessToken) {
                        throw new AppError("Broker account session is missing", 400, "BROKER_SESSION_ERROR");
                      }

                      let livePrice = 0;
                      try {
                        const provider = new AngelMarketDataProvider();
                        const ltpRes = await provider.getLtp({
                          apiKey: brokerAccount.apiKey,
                          accessToken: brokerAccount.accessToken,
                          query: {
                            brokerAccountId,
                            exchange: "NFO",
                            tradingsymbol: ceContract.symbol,
                            symboltoken: ceContract.token,
                          },
                        });
                        if (ltpRes && ltpRes.status && ltpRes.data && ltpRes.data.ltp) {
                          livePrice = Number(ltpRes.data.ltp);
                        }
                      } catch (err) {
                        context.app.log.error(err, `Failed to fetch live LTP for CE contract ${ceContract.symbol}`);
                      }

                      if (!livePrice || livePrice <= 0) {
                        await addStrategyLog(context, `[ERROR] Live option price not available for CE contract ${ceContract.symbol}, skipping trade`);
                        state.callTrack.waitingForConfirmation = false;
                        state.callTrack.decisionCandle = null;
                        context.strategy.state = state;
                        await updateStrategyState(context, state);
                        return;
                      }
                      optionEntryPrice = livePrice;

                      await addStrategyLog(
                        context,
                        `[VALIDATION]\nUnderlying Price: ${lastCandle.close}\nOption Price: ${optionEntryPrice}\nStrike: ${atmStrike}`
                      );

                      // Strict entry guard
                      if (!ceContract.token || !optionEntryPrice) {
                        await addStrategyLog(context, `[ERROR] Strict entry guard failed. token: ${ceContract.token}, price: ${optionEntryPrice}`);
                        state.callTrack.waitingForConfirmation = false;
                        state.callTrack.decisionCandle = null;
                        context.strategy.state = state;
                        await updateStrategyState(context, state);
                        return;
                      }

                      if (state.callTrack.hasEnteredTrade) return;
                      state.callTrack.hasEnteredTrade = true;
                      context.strategy.state = state;

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
                        price: optionEntryPrice,
                      });
                      optionEntryPrice = orderResult.position.avgPrice;
                      positionId = orderResult.position.id;

                      getLiveMarketDataService().subscribe(context.strategy.userId, brokerAccountId, [
                        { exchangeType: 2, tokens: [ceContract.token] }
                      ]);
                    }

                    const candleRange = lastCandle.close - decisionCandle.low;
                    let stopLoss: number;
                    let mode: string;
                    if (candleRange < 10) {
                      stopLoss = lastCandle.close - 10;
                      mode = "FIXED_10";
                    } else {
                      stopLoss = decisionCandle.low;
                      mode = "CANDLE_BASED";
                    }

                    await addStrategyLog(
                      context,
                      `[SL LOGIC]\nCandle Range: ${candleRange}\nApplied SL: ${stopLoss}\nMode: ${mode}`
                    );

                    const actualRisk = Math.abs(stopLoss - lastCandle.close);
                    const riskValue = actualRisk * 0.5;
                    const rewardRatio = risk?.rewardRatio || 3;
                    const underlyingSL = stopLoss;
                    const underlyingTarget = lastCandle.close + (rewardRatio * actualRisk);
                    const optionTarget = optionEntryPrice + rewardRatio * riskValue;
                    const optionSL = optionEntryPrice - riskValue;

                    state.callTrack = {
                      ...state.callTrack,
                      isTradeOpen: true,
                      waitingForConfirmation: false,
                      currentPositionId: positionId,
                      underlyingEntryPrice: lastCandle.close,
                      optionToken: ceContract.token,
                      optionSymbol: ceContract.symbol,
                      optionEntryPrice,
                      optionTarget,
                      stopLoss: underlyingSL,
                      decisionCandleLow: decisionCandle.low,
                      lastCandleTime: lastCandle.time,
                      decisionCandle: null,
                      strike: atmStrike,
                      underlyingTarget,
                    };
                    context.strategy.state = state;
                    await updateStrategyState(context, state);
                    await addStrategyLog(context, `[ENTRY]\nTime: ${new Date(lastCandle.time * 1000).toISOString()}\nReason: Candle B broke Candle A high\nUnderlying: ${lastCandle.close}\nOption Entry: ₹${optionEntryPrice.toFixed(2)}`);
                    await addStrategyLog(context, `[PLAN]\n\nUnderlying:\nEntry: ${lastCandle.close}\nStop Loss: ${underlyingSL}\nTarget: ${underlyingTarget.toFixed(2)}\n\nOption:\nEntry: ₹${optionEntryPrice.toFixed(2)}\nStop Loss: ₹${optionSL.toFixed(2)}\nTarget: ₹${optionTarget.toFixed(2)}\n\nRisk: ₹${riskValue.toFixed(2)}\nReward: ₹${(rewardRatio * riskValue).toFixed(2)}\nRR: 1:${rewardRatio}`);
                  } else {
                    await addStrategyLog(
                      context,
                      `[SKIPPED]\nReason: No CE option contract found for strike ${atmStrike} and expiry ${trade.expiry || "N/A"}. Resetting confirmation state.`
                    );
                    state.callTrack.waitingForConfirmation = false;
                    state.callTrack.decisionCandle = null;
                    context.strategy.state = state;
                    await updateStrategyState(context, state);
                  }
                } else {
                  await addStrategyLog(
                    context,
                    `[SKIPPED]\nReason: No option contracts found for expiry ${trade.expiry || "N/A"}. Please check if the expiry has passed. Resetting confirmation state.`
                  );
                  state.callTrack.waitingForConfirmation = false;
                  state.callTrack.decisionCandle = null;
                  context.strategy.state = state;
                  await updateStrategyState(context, state);
                }
              } else {
                await addStrategyLog(context, `[SKIPPED]\nReason: Candle B high (${lastCandle.high}) did not break Candle A high (${decisionCandle.high})`);
                state.callTrack.waitingForConfirmation = false;
                state.callTrack.decisionCandle = null;
                context.strategy.state = state;
                await updateStrategyState(context, state);
              }
            }
          } else {
            const hasCrossed = lastCandle.low < state.callTrack.referenceLow;
            const isBullish = lastCandle.close > lastCandle.open;

            if (hasCrossed && isBullish) {
              await addStrategyLog(
                context,
                `[CANDLE A FOUND]\nTime: ${new Date(lastCandle.time * 1000).toISOString()}\nHigh: ${lastCandle.high}\nLow: ${lastCandle.low}\nClose: ${lastCandle.close}\nColor: GREEN`
              );
              state.callTrack.decisionCandle = {
                time: lastCandle.time,
                open: lastCandle.open,
                high: lastCandle.high,
                low: lastCandle.low,
                close: lastCandle.close,
              };
              state.callTrack.decisionCandleLow = lastCandle.low;
              state.callTrack.waitingForConfirmation = true;
              context.strategy.state = state;
              await updateStrategyState(context, state);
            } else {
              if (hasCrossed && !isBullish) {
                await addStrategyLog(context, `[SKIPPED]\nReason: Candle crossed referenceLow but closed RED (not GREEN)`);
              }
            }
          }
        }
      }
    }
  }
}
