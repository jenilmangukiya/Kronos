import { liveTickStore } from "../../../../market-data/live/live-tick.store.js";
import { AppError } from "../../../../../errors/app-error.js";
import type { StrategyContext } from "../types.js";
import { candlesCache } from "../../../../market-data/candles-cache.js";
import { AngelMarketDataProvider } from "../../../../market-data/providers/angel.provider.js";

// Lazy-loaded dependencies to break circular imports at load time
let replaySessions: any = null;
let ReplayPaperService: any = null;
let ReplayServiceClass: any = null;
let getOptionPriceAtTimeFn: any = null;
let liveMarketDataService: any = null;
let realtimeService: any = null;

export function getReplaySessions() {
  return replaySessions;
}

export function getReplayPaperService() {
  return ReplayPaperService;
}

export function getLiveMarketDataService() {
  return liveMarketDataService;
}

export function getRealtimeService() {
  return realtimeService;
}

export async function loadDeps() {
  if (!replaySessions) {
    const mod = await import("../../../../market-replay/replay.session.js");
    replaySessions = mod.replaySessions;
  }
  if (!ReplayPaperService || !ReplayServiceClass || !getOptionPriceAtTimeFn) {
    const mod = await import("../../../../market-replay/replay.service.js");
    ReplayPaperService = mod.ReplayPaperService;
    ReplayServiceClass = mod.ReplayService;
    getOptionPriceAtTimeFn = mod.getOptionPriceAtTime;
  }
  if (!liveMarketDataService) {
    const mod = await import("../../../../market-data/live/live-market-data.service.js");
    liveMarketDataService = mod.liveMarketDataService;
  }
  if (!realtimeService) {
    const mod = await import("../../../../realtime/realtime.service.js");
    realtimeService = mod.realtimeService;
  }
}

export function getKolkataDateStr(date: Date): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const getVal = (type: string) => parts.find((p) => p.type === type)?.value || "";
  return `${getVal("year")}-${getVal("month")}-${getVal("day")}`;
}

export function isPastSquareOffTime(currentTime: Date, squareOffTimeStr?: string): boolean {
  const squareOffStr = squareOffTimeStr || "15:15";
  const parts = squareOffStr.split(":");
  const targetHours = Number(parts[0]) || 15;
  const targetMinutes = Number(parts[1]) || 15;

  const kolkataTime = new Date(currentTime.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const hours = kolkataTime.getHours();
  const minutes = kolkataTime.getMinutes();

  if (hours > targetHours) return true;
  if (hours === targetHours && minutes >= targetMinutes) return true;
  return false;
}

export function getFiveMinuteCandles(candles1m: any[]) {
  const buckets: Record<number, any[]> = {};
  for (const c of candles1m) {
    const bucketStart = Math.floor(c.time / 300) * 300;
    if (!buckets[bucketStart]) {
      buckets[bucketStart] = [];
    }
    buckets[bucketStart].push(c);
  }

  const result: any[] = [];
  const sortedStarts = Object.keys(buckets).map(Number).sort((a, b) => a - b);
  const maxTime = candles1m.length > 0 ? candles1m[candles1m.length - 1].time : 0;

  for (const start of sortedStarts) {
    if (maxTime < start + 300) {
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

export async function get1MinuteCandles(
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
  const formatKolkata = (date: Date) => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const getVal = (type: string) => parts.find((p) => p.type === type)?.value || "";
    return {
      dateStr: `${getVal("year")}-${getVal("month")}-${getVal("day")}`,
      timeStr: `${getVal("hour")}:${getVal("minute")}`,
    };
  };

  const kolkataTime = formatKolkata(currentTime);
  const toDateStr = `${kolkataTime.dateStr} ${kolkataTime.timeStr}`;
  const fromDateStr = `${kolkataTime.dateStr} 09:15`;

  const cached = candlesCache.get(
    brokerAccountId,
    exchange,
    symbolToken,
    "ONE_MINUTE",
    fromDateStr,
    toDateStr,
  );

  let responseData: any;
  if (cached) {
    responseData = cached;
  } else {
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
    responseData = response.data;
    candlesCache.set(
      brokerAccountId,
      exchange,
      symbolToken,
      "ONE_MINUTE",
      fromDateStr,
      toDateStr,
      responseData,
    );
  }

  return responseData.map((item: any) => {
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

export async function getYesterdayHighLow(
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

export async function updateStrategyState(context: StrategyContext, state: any) {
  context.strategy.state = state;
  await loadDeps();
  const isReplay = replaySessions.has(context.strategy.userId);
  if (!isReplay) {
    await context.app.db.strategy.update({
      where: { id: context.strategy.id },
      data: { state: state as any },
    });
  }
}

export async function addStrategyLog(context: StrategyContext, message: string, meta: any = {}) {
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

export async function getReplayOptionPriceWithFallback(
  context: StrategyContext,
  replaySession: any,
  optionToken: string,
  timestampSec: number,
  fallbackOptionType: "CE" | "PE",
  strike: number | undefined,
  underlyingPrice: number,
): Promise<number> {
  let price = getOptionPriceAtTimeFn(replaySession, optionToken, timestampSec);
  if (price !== null && price > 0) {
    return price;
  }

  try {
    const replayService = new ReplayServiceClass(context.app);
    const sessionTime = new Date(Number(replaySession.currentTime) * 1000);
    const date = getKolkataDateStr(sessionTime);
    
    await replayService.fetchOptionCandles(replaySession, optionToken, "NFO", date);
    
    price = getOptionPriceAtTimeFn(replaySession, optionToken, timestampSec);
  } catch (err: any) {
    await addStrategyLog(context, `[ERROR] Dynamic option candle fetch failed for token ${optionToken}: ${err.message}`);
  }

  if (price !== null && price > 0) {
    return price;
  }

  const candles = replaySession.optionCandles?.get(optionToken) || [];
  const count = candles.length;
  const firstCandleTime = count > 0 ? new Date(candles[0].time * 1000).toISOString() : "N/A";
  const lastCandleTime = count > 0 ? new Date(candles[count - 1].time * 1000).toISOString() : "N/A";
  const requestedTimeStr = new Date(timestampSec * 1000).toISOString();

  await addStrategyLog(
    context,
    `[OPTION DEBUG]\nToken: ${optionToken}\nRequested Time: ${requestedTimeStr}\nAvailable candles: ${count}\nFirst candle time: ${firstCandleTime}\nLast candle time: ${lastCandleTime}`
  );

  await addStrategyLog(
    context,
    `[OPTION ERROR] Option price not available for token ${optionToken} at ${requestedTimeStr}. Skipping trade.`
  );

  return 0;
}
