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
