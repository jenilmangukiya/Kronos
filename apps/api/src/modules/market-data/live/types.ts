export type AngelExchangeType = 1 | 2 | 3 | 4 | 5 | 7 | 13;

export interface AngelSubscribeToken {
  exchangeType: AngelExchangeType;
  tokens: string[];
}

export interface AngelTick {
  token: string;
  sequenceNumber: string;
  exchangeTimestamp: number;
  ltp: number;
}
