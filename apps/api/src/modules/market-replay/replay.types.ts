export interface ReplayCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface ReplayLog {
  id: string;
  message: string;
  meta?: any;
  createdAt: Date;
}

export interface ReplayPosition {
  id: string;
  symbol: string;
  token: string;
  quantity: number;
  avgPrice: number;
  entryPrice: number;
  currentPrice: number;
  status: "OPEN" | "CLOSED";
  side: "LONG" | "SHORT";
  realizedPnl: number;
  pnl: number;
  openedAt: Date;
  closedAt?: Date | null;
  openedAtMarketTime?: number;
  closedAtMarketTime?: number;
}

export interface ReplaySession {
  id: string;
  userId: string;
  strategyId: string;
  brokerAccountId: string;
  isRunning: boolean;
  speed: number;
  currentIndex: number;
  candles: ReplayCandle[];
  logs: ReplayLog[];
  positions: ReplayPosition[];
  startedAt: Date;
  currentTime?: number | string | null;
  currentUnderlyingPrice?: number | null;
  currentTradePrice?: number | null;
  totalCandles?: number | null;
  totalTrades?: number;
  winningTrades?: number;
  losingTrades?: number;
  totalPnl?: number;
  maxProfit?: number;
  maxLoss?: number;
  isPaused?: boolean;
  shouldStep?: boolean;
  yesterdayHigh?: number;
  yesterdayLow?: number;
  optionCandles?: Map<string, ReplayCandle[]>;
}

export interface StartReplayInput {
  strategyId: string;
  brokerAccountId: string;
  speed?: number;
  date?: string;
  yesterdayHigh?: number;
  yesterdayLow?: number;
}
