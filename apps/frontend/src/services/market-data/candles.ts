import { axiosAuth } from "../api/axios";
import {
  getIndiaMarketFromDate,
  getIndiaMarketToDate,
  convertCandleTimeToChartTime,
  formatISTDateTime,
} from "../../utils/date/marketTime";

export interface Candle {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface CandleResponse {
  status: boolean;
  message: string;
  errorcode: string;
  data: [string, number, number, number, number, number][] | null;
}

export interface GetCandlesParams {
  brokerAccountId: string;
  exchange: string;
  symboltoken: string;
  interval: string;
  fromDate: string;
  toDate: string;
}

export const getCandles = async (params: GetCandlesParams): Promise<CandleResponse> => {
  const response = await axiosAuth.get<CandleResponse>("/market-data/candles", {
    params,
  });
  return response.data;
};

export interface StrategyCandleParams {
  brokerAccountId: string;
  exchange: string;
  symboltoken: string;
  interval?: string;
}

export const getStrategyCandles = async (params: StrategyCandleParams): Promise<Candle[]> => {
  const fromDate = getIndiaMarketFromDate();
  const toDate = getIndiaMarketToDate();
  const interval = params.interval || "FIVE_MINUTE";

  // Task 2: Log request parameters
  console.log("[Candle Service Query] Fetching candles with params:", {
    brokerAccountId: params.brokerAccountId,
    exchange: params.exchange,
    symboltoken: params.symboltoken,
    interval,
    fromDate,
    toDate,
  });

  const response = await getCandles({
    brokerAccountId: params.brokerAccountId,
    exchange: params.exchange,
    symboltoken: params.symboltoken,
    interval,
    fromDate,
    toDate,
  });

  if (!response || !response.status || !Array.isArray(response.data)) {
    console.log("[Candle Service Query] Query failed or empty response data:", response);
    return [];
  }

  // Task 2: Log payload stats
  const totalLength = response.data.length;
  console.log("[Candle Service Query] Response payload length:", totalLength);

  if (totalLength > 0 && response.data) {
    const firstRow = response.data[0];
    const lastRow = response.data[totalLength - 1];
    if (firstRow && lastRow) {
      const rawFirstTime = firstRow[0];
      const rawLastTime = lastRow[0];
      console.log("[Candle Service Query] First raw timestamp:", rawFirstTime);
      console.log("[Candle Service Query] Last raw timestamp:", rawLastTime);

      const firstChartTime = convertCandleTimeToChartTime(rawFirstTime);
      const lastChartTime = convertCandleTimeToChartTime(rawLastTime);
      console.log("[Candle Service Query] Converted first chart time:", firstChartTime, "-> Formatted IST:", formatISTDateTime(firstChartTime));
      console.log("[Candle Service Query] Converted last chart time:", lastChartTime, "-> Formatted IST:", formatISTDateTime(lastChartTime));
    }
  }

  return response.data.map((item: [string, number, number, number, number, number]) => {
    const chartTime = convertCandleTimeToChartTime(item[0]);
    return {
      time: chartTime,
      open: Number(item[1]),
      high: Number(item[2]),
      low: Number(item[3]),
      close: Number(item[4]),
    };
  });
};
