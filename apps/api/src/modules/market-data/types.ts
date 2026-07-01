export interface LtpQuery {
  brokerAccountId: string;
  exchange: string;
  tradingsymbol: string;
  symboltoken: string;
}

export interface QuoteQuery {
  brokerAccountId: string;
  exchange: string;
  symboltoken: string;
  mode?: "LTP" | "OHLC" | "FULL";
}

export interface CandlesQuery {
  brokerAccountId: string;
  exchange: string;
  symboltoken: string;
  interval:
    | "ONE_MINUTE"
    | "THREE_MINUTE"
    | "FIVE_MINUTE"
    | "TEN_MINUTE"
    | "FIFTEEN_MINUTE"
    | "THIRTY_MINUTE"
    | "ONE_HOUR"
    | "ONE_DAY";

  fromDate: string;
  toDate: string;
}

export interface InstrumentSearchQuery {
  query: string;
  exchange?: string;
  instrumentType?: string;
  limit?: number;
}

export interface AngelInstrument {
  token: string;
  symbol: string;
  name: string;
  expiry: string;
  strike: string;
  lotsize: string;
  instrumenttype: string;
  exch_seg: string;
  tick_size: string;
}
