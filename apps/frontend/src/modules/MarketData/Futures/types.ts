import { FutureContract } from "../../../services/market-data/MarketDataService";

export interface FutureContractUI extends FutureContract {
  direction?: "up" | "down" | "flat";
  change: number | null;
  changePercent: number | null;
}

export interface FuturesSummaryData {
  symbol: string;
  contractCount: number;
  nearMonthLtp: number | null;
  nearMonthExpiry: string | null;
  totalOi: number;
  totalVolume: number;
}
