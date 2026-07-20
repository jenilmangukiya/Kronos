import { AppError } from "../../../../../errors/app-error.js";
import type {
  StrategyContext,
  StrategyDecision,
  StrategyHandler,
} from "../types.js";
import { angelInstrumentProvider } from "../../../../market-data/providers/angel-instrument.provider.js";
import { createExecutionEnvironment } from "./environment.js";

import {
  loadDeps,
  getKolkataDateStr,
  isPastSquareOffTime,
  getFiveMinuteCandles,
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
    const env = createExecutionEnvironment(context);
    const currentTime = env.getCurrentTime();

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
      await env.updateState(state);
    }

    if (env.isReplay) {
      state.isSubscribed = true;
      state.isDataReady = true;
    } else {
      if (state.isSubscribed === undefined) {
        state.isSubscribed = false;
        state.isDataReady = false;
        state.subscriptionStartTime = 0;
        await env.updateState(state);
      }

      if (!state.isSubscribed) {
        const subscriptions = this.getRequiredSubscriptions(context.strategy);
        await env.subscribe(subscriptions);
        state.isSubscribed = true;
        state.subscriptionStartTime = Date.now();
        await env.updateState(state);
        await env.addLog("[SUBSCRIBE] Request sent");
      }

      if (!state.isDataReady) {
        const tick = env.getTick(underlyingToken);
        if (tick && tick.ltp !== undefined && tick.ltp !== null) {
          state.isDataReady = true;
          await env.updateState(state);
          await env.addLog("[READY] Data received, strategy active");
        } else {
          const elapsed = Date.now() - state.subscriptionStartTime;
          if (elapsed > 10000) {
            await env.addLog("[ERROR] Subscription failed");
            await context.app.db.strategy.update({
              where: { id: context.strategy.id },
              data: { status: "STOPPED" },
            });
            try {
              const subscriptions = this.getRequiredSubscriptions(context.strategy);
              await env.unsubscribe(subscriptions);
              await env.addLog("Live market data unsubscribed");
            } catch {}
            await env.addLog("Strategy stopped");
            const mod = await import("../../../../realtime/realtime.service.js");
            mod.realtimeService.publishStrategyDataChanged(context.strategy.id, [
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
        const yesterday = await env.getYesterdayHighLow(exchange, underlyingToken, currentTime);
        yesterdayHigh = yesterday.high;
        yesterdayLow = yesterday.low;
      } catch (err: any) {
        context.app.log.warn(err, `Failed to fetch yesterday's High/Low. Will retry on next tick.`);
        if (!env.isReplay) {
          const now = Date.now();
          const lastLogged = state.lastLoggedErrorTime || 0;
          if (now - lastLogged > 60 * 1000) {
            state.lastLoggedErrorTime = now;
            await env.updateState(state);
            await env.addLog(`[WARNING] Failed to fetch yesterday's High/Low: ${err.message}. Retrying...`);
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
      await env.updateState(state);
      await env.addLog(`[INIT] Yesterday High: ${yesterdayHigh}, Low: ${yesterdayLow}`);
    }

    if (!state.putTrack || !state.callTrack) {
      return;
    }

    // Fetch underlying LTP and update/reset currentCandle state
    const tick = env.getTick(underlyingToken);
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
    await env.updateState(state);

    // 1. EOD Square-off Check
    const squareOffTime = rules.squareOffTime || risk?.squareOffTime || "15:15";
    if (isPastSquareOffTime(currentTime, squareOffTime)) {
      let stateChanged = false;
      const eodNowSec = currentTime.getTime() / 1000;
      const eodUnderlyingLtp = state.currentCandle.close;

      // Close PUT if open
      if (state.putTrack.isTradeOpen && state.putTrack.currentPositionId) {
        const optionLtp = await env.getOptionPrice(
          state.putTrack.optionToken,
          eodNowSec,
          "PE",
          state.putTrack.strike,
          eodUnderlyingLtp,
          state.putTrack.optionSymbol
        );

        if (optionLtp <= 0) {
          await env.addLog(`[ERROR] Live option price not available for EOD exit of PUT`);
          return;
        }

        await env.exitPosition(state.putTrack.currentPositionId, { price: optionLtp });
        await env.unsubscribe([{ exchangeType: 2, tokens: [state.putTrack.optionToken] }]);

        await env.addLog(`[EXIT] EOD square-off executed. Closed PUT option position.`);
        state.putTrack.isTradeOpen = false;
        state.putTrack.currentPositionId = undefined;
        stateChanged = true;
      }

      // Close CALL if open
      if (state.callTrack.isTradeOpen && state.callTrack.currentPositionId) {
        const optionLtp = await env.getOptionPrice(
          state.callTrack.optionToken,
          eodNowSec,
          "CE",
          state.callTrack.strike,
          eodUnderlyingLtp,
          state.callTrack.optionSymbol
        );

        if (optionLtp <= 0) {
          await env.addLog(`[ERROR] Live option price not available for EOD exit of CALL`);
          return;
        }

        await env.exitPosition(state.callTrack.currentPositionId, { price: optionLtp });
        await env.unsubscribe([{ exchangeType: 2, tokens: [state.callTrack.optionToken] }]);

        await env.addLog(`[EXIT] EOD square-off executed. Closed CALL option position.`);
        state.callTrack.isTradeOpen = false;
        state.callTrack.currentPositionId = undefined;
        stateChanged = true;
      }

      if (stateChanged) {
        await env.updateState(state);
      }
      return;
    }

    // 2. Process PUT Track Exits (Real-time SL/Target checks)
    if (state.putTrack.isTradeOpen && state.putTrack.currentPositionId) {
      const isOpen = await env.isPositionOpen(state.putTrack.currentPositionId);

      if (!isOpen) {
        state.putTrack.isTradeOpen = false;
        state.putTrack.currentPositionId = undefined;
        await env.updateState(state);
      } else {
        const optionLtp = await env.getOptionPrice(
          state.putTrack.optionToken,
          nowSec,
          "PE",
          state.putTrack.strike,
          underlyingLtp,
          state.putTrack.optionSymbol
        );

        if (optionLtp <= 0) {
          await env.addLog(`[WARNING] Option price not available for PUT trade tracking, skipping exit check for this tick`);
        } else {
          let triggerExit = false;
          let exitReason = "";
          let exitPrice = optionLtp;
          if (state.currentCandle.high >= state.putTrack.stopLoss) {
            triggerExit = true;
            exitReason = `PUT Stop Loss hit at underlying ₹${state.currentCandle.high} (SL: ₹${state.putTrack.stopLoss})`;
            if (env.isReplay) {
              exitPrice = state.putTrack.optionSL || optionLtp;
            }
          } else if (state.currentCandle.low <= (state.putTrack.underlyingTarget ?? -1)) {
            triggerExit = true;
            exitReason = `PUT Target hit at underlying ₹${state.currentCandle.low} (Target: ₹${state.putTrack.underlyingTarget})`;
            if (env.isReplay) {
              exitPrice = state.putTrack.optionTarget || optionLtp;
            }
          }

          if (triggerExit) {
            await env.exitPosition(state.putTrack.currentPositionId, { price: exitPrice });
            await env.unsubscribe([{ exchangeType: 2, tokens: [state.putTrack.optionToken] }]);

            await env.addLog(`[EXIT] ${exitReason}`, { underlyingLtp: state.currentCandle.close, optionLtp: exitPrice });
            const refHigh = state.putTrack.decisionCandle ? state.putTrack.decisionCandle.high : state.putTrack.decisionCandleHigh;
            state.putTrack.referenceHigh = refHigh;
            state.putTrack.isTradeOpen = false;
            state.putTrack.currentPositionId = undefined;
            state.putTrack.decisionCandle = null;
            state.putTrack.waitingForConfirmation = false;
            state.putTrack.hasLoggedWaiting = false;
            state.putTrack.hasLoggedCandleBStart = false;
            state.putTrack.hasEnteredTrade = false;
            state.putTrack.hasProcessedCandle = false;
            await env.updateState(state);
          }
        }
      }
    }

    // 3. Process CALL Track Exits (Real-time SL/Target checks)
    if (state.callTrack.isTradeOpen && state.callTrack.currentPositionId) {
      const isOpen = await env.isPositionOpen(state.callTrack.currentPositionId);

      if (!isOpen) {
        state.callTrack.isTradeOpen = false;
        state.callTrack.currentPositionId = undefined;
        await env.updateState(state);
      } else {
        const optionLtp = await env.getOptionPrice(
          state.callTrack.optionToken,
          nowSec,
          "CE",
          state.callTrack.strike,
          underlyingLtp,
          state.callTrack.optionSymbol
        );

        if (optionLtp <= 0) {
          await env.addLog(`[WARNING] Option price not available for CALL trade tracking, skipping exit check for this tick`);
        } else {
          let triggerExit = false;
          let exitReason = "";
          let exitPrice = optionLtp;
          if (state.currentCandle.low <= state.callTrack.stopLoss) {
            triggerExit = true;
            exitReason = `CALL Stop Loss hit at underlying ₹${state.currentCandle.low} (SL: ₹${state.callTrack.stopLoss})`;
            if (env.isReplay) {
              exitPrice = state.callTrack.optionSL || optionLtp;
            }
          } else if (state.currentCandle.high >= (state.callTrack.underlyingTarget ?? 999999)) {
            triggerExit = true;
            exitReason = `CALL Target hit at underlying ₹${state.currentCandle.high} (Target: ₹${state.callTrack.underlyingTarget})`;
            if (env.isReplay) {
              exitPrice = state.callTrack.optionTarget || optionLtp;
            }
          }

          if (triggerExit) {
            await env.exitPosition(state.callTrack.currentPositionId, { price: exitPrice });
            await env.unsubscribe([{ exchangeType: 2, tokens: [state.callTrack.optionToken] }]);

            await env.addLog(`[EXIT] ${exitReason}`, { underlyingLtp: state.currentCandle.close, optionLtp: exitPrice });
            const refLow = state.callTrack.decisionCandle ? state.callTrack.decisionCandle.low : state.callTrack.decisionCandleLow;
            state.callTrack.referenceLow = refLow;
            state.callTrack.isTradeOpen = false;
            state.callTrack.currentPositionId = undefined;
            state.callTrack.decisionCandle = null;
            state.callTrack.waitingForConfirmation = false;
            state.callTrack.hasLoggedWaiting = false;
            state.callTrack.hasLoggedCandleBStart = false;
            state.callTrack.hasEnteredTrade = false;
            state.callTrack.hasProcessedCandle = false;
            await env.updateState(state);
          }
        }
      }
    }

    // 2. Fetch candles and group
    let candles1m: any[] = [];
    try {
      candles1m = await env.get1MinuteCandles(exchange, underlyingToken, currentTime);
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
          await env.updateState(state);
          await env.addLog("[WARNING] Broker session expired/invalid. Strategy remains running; it will resume automatically once you log back in.");
        }
      }
      return;
    }

    const closedCandles = getFiveMinuteCandles(candles1m);
    if (closedCandles.length === 0) return;
    const lastCandle = closedCandles[closedCandles.length - 1];

    const formatTimeStr = (t: number) => {
      return new Date(t * 1000).toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    };

    const candleTimeStr = formatTimeStr(lastCandle.time);

    // Prevent re-processing the same candle
    if (state.lastProcessedCandleTime === lastCandle.time) {
      return;
    }

    // A. PUT Entry Evaluation
    if (!state.putTrack.isTradeOpen) {
      if (state.putTrack.waitingForConfirmation) {
        const decisionCandle = state.putTrack.decisionCandle || {
          high: state.putTrack.decisionCandleHigh || 0,
          low: state.putTrack.decisionCandleLow || 0,
        };

        if (lastCandle.time > decisionCandle.time) {
          if (!state.putTrack.hasLoggedCandleBStart) {
            await env.addLog(`[CANDLE B STARTED] Time: ${candleTimeStr}. Waiting to see if it breaks Candle A low (${decisionCandle.low})`);
            state.putTrack.hasLoggedCandleBStart = true;
            await env.updateState(state);
          }

          if (lastCandle.low < decisionCandle.low) {
            if (state.putTrack.hasEnteredTrade) return;
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

                const peLtp = await env.fetchLtp(
                  "NFO",
                  peContract.symbol,
                  peContract.token,
                  nowSec,
                  "PE",
                  atmStrike,
                  lastCandle.close
                );

                if (!peLtp || peLtp <= 0) {
                  await env.addLog(`[ERROR] Option price not available for PE contract ${peContract.symbol}, skipping trade`);
                  state.putTrack.waitingForConfirmation = false;
                  state.putTrack.decisionCandle = null;
                  await env.updateState(state);
                  return;
                }
                optionEntryPrice = peLtp;

                await env.addLog(`[VALIDATION]\nUnderlying Price: ${lastCandle.close}\nOption Price: ${optionEntryPrice}\nStrike: ${atmStrike}`);

                if (!peContract.token || !optionEntryPrice) {
                  await env.addLog(`[ERROR] Strict entry guard failed. token: ${peContract.token}, price: ${optionEntryPrice}`);
                  state.putTrack.waitingForConfirmation = false;
                  state.putTrack.decisionCandle = null;
                  await env.updateState(state);
                  return;
                }

                if (state.putTrack.hasEnteredTrade) return;
                state.putTrack.hasEnteredTrade = true;
                await env.updateState(state);

                const orderResult = await env.createOrder({
                  strategyId: context.strategy.id,
                  brokerAccountId: brokerAccountId || "",
                  instrumentType: "OPTION",
                  token: peContract.token,
                  symbol: peContract.symbol,
                  exchangeType: 2,
                  exchange: "NFO",
                  side: "BUY",
                  quantity: trade.quantity,
                  price: optionEntryPrice,
                });
                optionEntryPrice = orderResult.avgPrice;
                positionId = orderResult.id;

                await env.subscribe([{ exchangeType: 2, tokens: [peContract.token] }]);

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

                await env.addLog(`[SL LOGIC]\nCandle Range: ${candleRange}\nApplied SL: ${stopLoss}\nMode: ${mode}`);

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
                  optionSL,
                  stopLoss: underlyingSL,
                  decisionCandleHigh: decisionCandle.high,
                  lastCandleTime: lastCandle.time,
                  decisionCandle: null,
                  strike: atmStrike,
                  underlyingTarget,
                };
                await env.updateState(state);
                await env.addLog(`[ENTRY]\nTime: ${new Date(lastCandle.time * 1000).toISOString()}\nReason: Candle B broke Candle A low\nUnderlying: ${lastCandle.close}\nOption Entry: ₹${optionEntryPrice.toFixed(2)}`);
                await env.addLog(`[PLAN]\n\nUnderlying:\nEntry: ${lastCandle.close}\nStop Loss: ${underlyingSL}\nTarget: ${underlyingTarget.toFixed(2)}\n\nOption:\nEntry: ₹${optionEntryPrice.toFixed(2)}\nStop Loss: ₹${optionSL.toFixed(2)}\nTarget: ₹${optionTarget.toFixed(2)}\n\nRisk: ₹${riskValue.toFixed(2)}\nReward: ₹${(rewardRatio * riskValue).toFixed(2)}\nRR: 1:${rewardRatio}`);
              } else {
                await env.addLog(`[SKIPPED]\nReason: No PE option contract found for strike ${atmStrike} and expiry ${trade.expiry || "N/A"}. Resetting confirmation state.`);
                state.putTrack.waitingForConfirmation = false;
                state.putTrack.decisionCandle = null;
                await env.updateState(state);
              }
            } else {
              await env.addLog(`[SKIPPED]\nReason: No option contracts found for expiry ${trade.expiry || "N/A"}. Please check if the expiry has passed. Resetting confirmation state.`);
              state.putTrack.waitingForConfirmation = false;
              state.putTrack.decisionCandle = null;
              await env.updateState(state);
            }
          } else {
            await env.addLog(`[SKIPPED]\nReason: Candle B low (${lastCandle.low}) did not break Candle A low (${decisionCandle.low})`);
            state.putTrack.waitingForConfirmation = false;
            state.putTrack.decisionCandle = null;
            await env.updateState(state);
          }
        }
      } else {
        const hasCrossed = lastCandle.high > state.putTrack.referenceHigh;
        const isBearish = lastCandle.close < lastCandle.open;

        if (hasCrossed && isBearish) {
          await env.addLog(`[CANDLE A FOUND]\nTime: ${new Date(lastCandle.time * 1000).toISOString()}\nHigh: ${lastCandle.high}\nLow: ${lastCandle.low}\nClose: ${lastCandle.close}\nColor: RED`);
          state.putTrack.decisionCandle = {
            time: lastCandle.time,
            open: lastCandle.open,
            high: lastCandle.high,
            low: lastCandle.low,
            close: lastCandle.close,
          };
          state.putTrack.decisionCandleHigh = lastCandle.high;
          state.putTrack.waitingForConfirmation = true;
          await env.updateState(state);
        } else {
          if (hasCrossed && !isBearish) {
            await env.addLog(`[SKIPPED]\nReason: Candle crossed referenceHigh but closed GREEN (not RED)`);
          }
        }
      }
    }

    // B. CALL Entry Evaluation
    if (!state.callTrack.isTradeOpen) {
      if (state.callTrack.waitingForConfirmation) {
        const decisionCandle = state.callTrack.decisionCandle || {
          high: state.callTrack.decisionCandleHigh || 0,
          low: state.callTrack.decisionCandleLow || 0,
        };

        if (lastCandle.time > decisionCandle.time) {
          if (!state.callTrack.hasLoggedCandleBStart) {
            await env.addLog(`[CANDLE B STARTED] Time: ${candleTimeStr}. Waiting to see if it breaks Candle A high (${decisionCandle.high})`);
            state.callTrack.hasLoggedCandleBStart = true;
            await env.updateState(state);
          }

          if (lastCandle.high > decisionCandle.high) {
            if (state.callTrack.hasEnteredTrade) return;
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

                const ceLtp = await env.fetchLtp(
                  "NFO",
                  ceContract.symbol,
                  ceContract.token,
                  nowSec,
                  "CE",
                  atmStrike,
                  lastCandle.close
                );

                if (!ceLtp || ceLtp <= 0) {
                  await env.addLog(`[ERROR] Option price not available for CE contract ${ceContract.symbol}, skipping trade`);
                  state.callTrack.waitingForConfirmation = false;
                  state.callTrack.decisionCandle = null;
                  await env.updateState(state);
                  return;
                }
                optionEntryPrice = ceLtp;

                await env.addLog(`[VALIDATION]\nUnderlying Price: ${lastCandle.close}\nOption Price: ${optionEntryPrice}\nStrike: ${atmStrike}`);

                if (!ceContract.token || !optionEntryPrice) {
                  await env.addLog(`[ERROR] Strict entry guard failed. token: ${ceContract.token}, price: ${optionEntryPrice}`);
                  state.callTrack.waitingForConfirmation = false;
                  state.callTrack.decisionCandle = null;
                  await env.updateState(state);
                  return;
                }

                if (state.callTrack.hasEnteredTrade) return;
                state.callTrack.hasEnteredTrade = true;
                await env.updateState(state);

                const orderResult = await env.createOrder({
                  strategyId: context.strategy.id,
                  brokerAccountId: brokerAccountId || "",
                  instrumentType: "OPTION",
                  token: ceContract.token,
                  symbol: ceContract.symbol,
                  exchangeType: 2,
                  exchange: "NFO",
                  side: "BUY",
                  quantity: trade.quantity,
                  price: optionEntryPrice,
                });
                optionEntryPrice = orderResult.avgPrice;
                positionId = orderResult.id;

                await env.subscribe([{ exchangeType: 2, tokens: [ceContract.token] }]);

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

                await env.addLog(`[SL LOGIC]\nCandle Range: ${candleRange}\nApplied SL: ${stopLoss}\nMode: ${mode}`);

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
                  optionSL,
                  stopLoss: underlyingSL,
                  decisionCandleLow: decisionCandle.low,
                  lastCandleTime: lastCandle.time,
                  decisionCandle: null,
                  strike: atmStrike,
                  underlyingTarget,
                };
                await env.updateState(state);
                await env.addLog(`[ENTRY]\nTime: ${new Date(lastCandle.time * 1000).toISOString()}\nReason: Candle B broke Candle A high\nUnderlying: ${lastCandle.close}\nOption Entry: ₹${optionEntryPrice.toFixed(2)}`);
                await env.addLog(`[PLAN]\n\nUnderlying:\nEntry: ${lastCandle.close}\nStop Loss: ${underlyingSL}\nTarget: ${underlyingTarget.toFixed(2)}\n\nOption:\nEntry: ₹${optionEntryPrice.toFixed(2)}\nStop Loss: ₹${optionSL.toFixed(2)}\nTarget: ₹${optionTarget.toFixed(2)}\n\nRisk: ₹${riskValue.toFixed(2)}\nReward: ₹${(rewardRatio * riskValue).toFixed(2)}\nRR: 1:${rewardRatio}`);
              } else {
                await env.addLog(`[SKIPPED]\nReason: No CE option contract found for strike ${atmStrike} and expiry ${trade.expiry || "N/A"}. Resetting confirmation state.`);
                state.callTrack.waitingForConfirmation = false;
                state.callTrack.decisionCandle = null;
                await env.updateState(state);
              }
            } else {
              await env.addLog(`[SKIPPED]\nReason: No option contracts found for expiry ${trade.expiry || "N/A"}. Please check if the expiry has passed. Resetting confirmation state.`);
              state.callTrack.waitingForConfirmation = false;
              state.callTrack.decisionCandle = null;
              await env.updateState(state);
            }
          } else {
            await env.addLog(`[SKIPPED]\nReason: Candle B high (${lastCandle.high}) did not break Candle A high (${decisionCandle.high})`);
            state.callTrack.waitingForConfirmation = false;
            state.callTrack.decisionCandle = null;
            await env.updateState(state);
          }
        }
      } else {
        const hasCrossed = lastCandle.low < state.callTrack.referenceLow;
        const isBullish = lastCandle.close > lastCandle.open;

        if (hasCrossed && isBullish) {
          await env.addLog(`[CANDLE A FOUND]\nTime: ${new Date(lastCandle.time * 1000).toISOString()}\nHigh: ${lastCandle.high}\nLow: ${lastCandle.low}\nClose: ${lastCandle.close}\nColor: GREEN`);
          state.callTrack.decisionCandle = {
            time: lastCandle.time,
            open: lastCandle.open,
            high: lastCandle.high,
            low: lastCandle.low,
            close: lastCandle.close,
          };
          state.callTrack.decisionCandleLow = lastCandle.low;
          state.callTrack.waitingForConfirmation = true;
          await env.updateState(state);
        } else {
          if (hasCrossed && !isBullish) {
            await env.addLog(`[SKIPPED]\nReason: Candle crossed referenceLow but closed RED (not GREEN)`);
          }
        }
      }
    }

    state.lastProcessedCandleTime = lastCandle.time;
    await env.updateState(state);
  }
}
