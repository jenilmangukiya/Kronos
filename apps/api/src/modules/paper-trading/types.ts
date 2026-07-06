export type PaperInstrumentType = "EQUITY" | "FUTURE" | "OPTION";

export type PaperOrderSide = "BUY" | "SELL";

export interface CreatePaperOrderInput {
  brokerAccountId?: string;
  strategyId?: string;
  instrumentType: PaperInstrumentType;
  token: string;
  symbol: string;
  exchangeType: number;
  exchange: string;
  side: PaperOrderSide;
  quantity: number;
  price?: number;
}

export interface ExitPaperPositionInput {
  price?: number;
}
