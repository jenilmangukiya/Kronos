import { liveTickStore } from "../../../../market-data/live/live-tick.store.js";
import { AppError } from "../../../../../errors/app-error.js";
import { PaperTradingService } from "../../../../paper-trading/service.js";
import { AngelMarketDataProvider } from "../../../../market-data/providers/angel.provider.js";
import type { StrategyContext } from "../types.js";
import type { CreatePaperOrderInput, ExitPaperPositionInput } from "../../../../paper-trading/types.js";
import { getYesterdayHighLow, get1MinuteCandles, addStrategyLog, updateStrategyState } from "./utils.js";

// Lazy-loaded replay dependencies to avoid circular imports
let replaySessions: any = null;
let ReplayPaperService: any = null;
let getOptionPriceAtTimeFn: any = null;
let liveMarketDataService: any = null;

async function loadReplayDeps() {
  if (!replaySessions) {
    const mod = await import("../../../../market-replay/replay.session.js");
    replaySessions = mod.replaySessions;
  }
  if (!ReplayPaperService || !getOptionPriceAtTimeFn) {
    const mod = await import("../../../../market-replay/replay.service.js");
    ReplayPaperService = mod.ReplayPaperService;
    getOptionPriceAtTimeFn = mod.getOptionPriceAtTime;
  }
}

async function loadLiveDeps() {
  if (!liveMarketDataService) {
    const mod = await import("../../../../market-data/live/live-market-data.service.js");
    liveMarketDataService = mod.liveMarketDataService;
  }
}

export interface StandardizedOrderResult {
  id: string;
  avgPrice: number;
  quantity: number;
  symbol: string;
  token: string;
}

export interface ExecutionEnvironment {
  isReplay: boolean;
  getCurrentTime(): Date;
  addLog(message: string, meta?: any): Promise<void>;
  updateState(state: any): Promise<void>;
  getTick(token: string): any;
  getOptionPrice(
    optionToken: string,
    timestampSec: number,
    type: "CE" | "PE",
    strike?: number,
    underlyingPrice?: number,
    optionSymbol?: string
  ): Promise<number>;
  isPositionOpen(positionId: string): Promise<boolean>;
  get1MinuteCandles(exchange: string, symbolToken: string, currentTime: Date): Promise<any[]>;
  getYesterdayHighLow(
    exchange: string,
    symbolToken: string,
    currentTime: Date
  ): Promise<{ high: number; low: number }>;
  fetchLtp(
    exchange: string,
    symbol: string,
    token: string,
    timestampSec: number,
    type: "CE" | "PE",
    strike?: number,
    underlyingPrice?: number
  ): Promise<number>;
  createOrder(input: CreatePaperOrderInput): Promise<StandardizedOrderResult>;
  exitPosition(positionId: string, input: ExitPaperPositionInput): Promise<any>;
  subscribe(subscriptions: { exchangeType: number; tokens: string[] }[]): Promise<void>;
  unsubscribe(subscriptions: { exchangeType: number; tokens: string[] }[]): Promise<void>;
}

export class LiveExecutionEnvironment implements ExecutionEnvironment {
  readonly isReplay = false;

  constructor(private readonly context: StrategyContext) {}

  getCurrentTime(): Date {
    return new Date();
  }

  async addLog(message: string, meta?: any): Promise<void> {
    await addStrategyLog(this.context, message, meta);
  }

  async updateState(state: any): Promise<void> {
    await updateStrategyState(this.context, state);
  }

  getTick(token: string): any {
    const brokerAccountId = this.context.strategy.brokerAccountId || "manual";
    return liveTickStore.getTick(brokerAccountId, token);
  }

  async getOptionPrice(
    optionToken: string,
    timestampSec: number,
    type: "CE" | "PE",
    strike?: number,
    underlyingPrice?: number,
    optionSymbol?: string
  ): Promise<number> {
    const brokerAccountId = this.context.strategy.brokerAccountId || "manual";
    const optTick = liveTickStore.getTick(brokerAccountId, optionToken);
    if (optTick && optTick.ltp > 0) {
      return optTick.ltp;
    }
    if (optionSymbol) {
      try {
        const brokerAccount = await this.context.app.db.brokerAccount.findUnique({
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
              tradingsymbol: optionSymbol,
              symboltoken: optionToken,
            },
          });
          if (ltpRes && ltpRes.status && ltpRes.data && ltpRes.data.ltp) {
            return Number(ltpRes.data.ltp);
          }
        }
      } catch (err) {
        this.context.app.log.error(err, `Failed to fetch live LTP for option ${optionSymbol}`);
      }
    }
    return 0;
  }

  async isPositionOpen(positionId: string): Promise<boolean> {
    const pos = await this.context.app.db.paperPosition.findFirst({
      where: { id: positionId, status: "OPEN" },
    });
    return !!pos;
  }

  async get1MinuteCandles(exchange: string, symbolToken: string, currentTime: Date): Promise<any[]> {
    const brokerAccountId = this.context.strategy.brokerAccountId;
    if (!brokerAccountId) {
      return [];
    }
    return get1MinuteCandles(this.context.app, brokerAccountId, exchange, symbolToken, currentTime);
  }

  async getYesterdayHighLow(
    exchange: string,
    symbolToken: string,
    currentTime: Date
  ): Promise<{ high: number; low: number }> {
    const brokerAccountId = this.context.strategy.brokerAccountId;
    if (!brokerAccountId) {
      throw new AppError("Broker account ID missing", 400, "BROKER_SESSION_ERROR");
    }
    return getYesterdayHighLow(this.context.app, brokerAccountId, exchange, symbolToken, currentTime);
  }

  async fetchLtp(
    exchange: string,
    symbol: string,
    token: string,
    timestampSec: number,
    type: "CE" | "PE",
    strike?: number,
    underlyingPrice?: number
  ): Promise<number> {
    const brokerAccountId = this.context.strategy.brokerAccountId;
    if (!brokerAccountId) {
      throw new AppError("Broker account ID missing", 400, "BROKER_SESSION_ERROR");
    }
    const brokerAccount = await this.context.app.db.brokerAccount.findUnique({
      where: { id: brokerAccountId },
    });
    if (!brokerAccount || !brokerAccount.apiKey || !brokerAccount.accessToken) {
      throw new AppError("Broker account session is missing", 400, "BROKER_SESSION_ERROR");
    }

    const provider = new AngelMarketDataProvider();
    const ltpRes = await provider.getLtp({
      apiKey: brokerAccount.apiKey,
      accessToken: brokerAccount.accessToken,
      query: {
        brokerAccountId,
        exchange,
        tradingsymbol: symbol,
        symboltoken: token,
      },
    });

    if (ltpRes && ltpRes.status && ltpRes.data && ltpRes.data.ltp) {
      return Number(ltpRes.data.ltp);
    }
    return 0;
  }

  async createOrder(input: CreatePaperOrderInput): Promise<StandardizedOrderResult> {
    const paperService = new PaperTradingService(this.context.app.db);
    const orderResult = await paperService.createOrder(this.context.strategy.userId, input);
    return {
      id: orderResult.position.id,
      avgPrice: orderResult.position.avgPrice,
      quantity: orderResult.position.quantity,
      symbol: orderResult.position.symbol,
      token: orderResult.position.token,
    };
  }

  async exitPosition(positionId: string, input: ExitPaperPositionInput): Promise<any> {
    const paperService = new PaperTradingService(this.context.app.db);
    return paperService.exitPosition(this.context.strategy.userId, positionId, input);
  }

  async subscribe(subscriptions: { exchangeType: number; tokens: string[] }[]): Promise<void> {
    await loadLiveDeps();
    const brokerAccountId = this.context.strategy.brokerAccountId;
    if (brokerAccountId) {
      liveMarketDataService.subscribe(this.context.strategy.userId, brokerAccountId, subscriptions as any);
    }
  }

  async unsubscribe(subscriptions: { exchangeType: number; tokens: string[] }[]): Promise<void> {
    await loadLiveDeps();
    const brokerAccountId = this.context.strategy.brokerAccountId;
    if (brokerAccountId) {
      liveMarketDataService.unsubscribe(this.context.strategy.userId, brokerAccountId, subscriptions as any);
    }
  }
}

export class ReplayExecutionEnvironment implements ExecutionEnvironment {
  readonly isReplay = true;

  constructor(private readonly context: StrategyContext) {}

  private async getSession(): Promise<any> {
    await loadReplayDeps();
    const session = replaySessions.get(this.context.strategy.id);
    if (!session) {
      throw new AppError("No active replay session found for strategy", 404, "REPLAY_SESSION_NOT_FOUND");
    }
    return session;
  }

  getCurrentTime(): Date {
    const session = replaySessions?.get(this.context.strategy.id);
    if (session && session.currentTime) {
      return new Date(Number(session.currentTime) * 1000);
    }
    return new Date();
  }

  async addLog(message: string, meta?: any): Promise<void> {
    const session = await this.getSession();
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
      meta: meta || {},
      createdAt: new Date(),
    });
  }

  async updateState(state: any): Promise<void> {
    this.context.strategy.state = state;
  }

  getTick(token: string): any {
    const virtualBrokerId = `replay_${this.context.strategy.id}`;
    return liveTickStore.getTick(virtualBrokerId, token);
  }

  async getOptionPrice(
    optionToken: string,
    timestampSec: number,
    type: "CE" | "PE",
    strike?: number,
    underlyingPrice?: number,
    optionSymbol?: string
  ): Promise<number> {
    const session = await this.getSession();
    let price = getOptionPriceAtTimeFn(session, optionToken, timestampSec);
    if (price !== null && price > 0) {
      return price;
    }

    try {
      const mod = await import("../../../../market-replay/replay.service.js");
      const replayService = new mod.ReplayService(this.context.app);
      const sessionTime = new Date(Number(session.currentTime) * 1000);
      const dateStr = sessionTime.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
      const getKolkataDateOnly = (dStr: string) => {
        const d = new Date(dStr);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const dy = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${dy}`;
      };
      const date = getKolkataDateOnly(dateStr);
      await replayService.fetchOptionCandles(session, optionToken, "NFO", date);
      price = getOptionPriceAtTimeFn(session, optionToken, timestampSec);
    } catch (err: any) {
      await this.addLog(`[ERROR] Dynamic option candle fetch failed for token ${optionToken}: ${err.message}`);
    }

    if (price !== null && price > 0) {
      return price;
    }

    const candles = session.optionCandles?.get(optionToken) || [];
    const count = candles.length;
    const firstCandleTime = count > 0 ? new Date(candles[0].time * 1000).toISOString() : "N/A";
    const lastCandleTime = count > 0 ? new Date(candles[count - 1].time * 1000).toISOString() : "N/A";
    const requestedTimeStr = new Date(timestampSec * 1000).toISOString();

    await this.addLog(
      `[OPTION DEBUG]\nToken: ${optionToken}\nRequested Time: ${requestedTimeStr}\nAvailable candles: ${count}\nFirst candle time: ${firstCandleTime}\nLast candle time: ${lastCandleTime}`
    );
    await this.addLog(
      `[OPTION ERROR] Option price not available for token ${optionToken} at ${requestedTimeStr}. Skipping trade.`
    );
    return 0;
  }

  async isPositionOpen(positionId: string): Promise<boolean> {
    const session = await this.getSession();
    const pos = session.positions.find((p: any) => p.id === positionId && p.status === "OPEN");
    return !!pos;
  }

  async get1MinuteCandles(exchange: string, symbolToken: string, currentTime: Date): Promise<any[]> {
    const session = await this.getSession();
    return session.candles.slice(0, session.currentIndex + 1);
  }

  async getYesterdayHighLow(
    exchange: string,
    symbolToken: string,
    currentTime: Date
  ): Promise<{ high: number; low: number }> {
    const session = await this.getSession();
    if (!session.yesterdayHigh || !session.yesterdayLow) {
      throw new AppError("Replay session is missing yesterday's High/Low.", 400, "CANDLE_FETCH_ERROR");
    }
    return {
      high: session.yesterdayHigh,
      low: session.yesterdayLow,
    };
  }

  async fetchLtp(
    exchange: string,
    symbol: string,
    token: string,
    timestampSec: number,
    type: "CE" | "PE",
    strike?: number,
    underlyingPrice?: number
  ): Promise<number> {
    return this.getOptionPrice(token, timestampSec, type, strike, underlyingPrice, symbol);
  }

  async createOrder(input: CreatePaperOrderInput): Promise<StandardizedOrderResult> {
    const session = await this.getSession();
    const paperService = new ReplayPaperService(session);
    const orderResult = await paperService.createOrder(this.context.strategy.userId, input);
    return {
      id: orderResult.id,
      avgPrice: orderResult.avgPrice,
      quantity: orderResult.quantity,
      symbol: orderResult.symbol,
      token: orderResult.token,
    };
  }

  async exitPosition(positionId: string, input: ExitPaperPositionInput): Promise<any> {
    const session = await this.getSession();
    const paperService = new ReplayPaperService(session);
    return paperService.exitPosition(this.context.strategy.userId, positionId, input);
  }

  async subscribe(subscriptions: { exchangeType: number; tokens: string[] }[]): Promise<void> {
    // websocket subscribe is a no-op in replay
  }

  async unsubscribe(subscriptions: { exchangeType: number; tokens: string[] }[]): Promise<void> {
    // websocket unsubscribe is a no-op in replay
  }
}

export function createExecutionEnvironment(context: StrategyContext): ExecutionEnvironment {
  if (context.isReplay) {
    return new ReplayExecutionEnvironment(context);
  }
  return new LiveExecutionEnvironment(context);
}
