import { z } from "zod";

export const ltpQuerySchema = z.object({
  brokerAccountId: z.string().min(1),
  exchange: z.string().min(1),
  tradingsymbol: z.string().min(1),
  symboltoken: z.string().min(1),
});

export const quoteQuerySchema = z.object({
  brokerAccountId: z.string().min(1),
  exchange: z.string().min(1),
  symboltoken: z.string().min(1),
  mode: z.enum(["LTP", "OHLC", "FULL"]).default("FULL"),
});

export const candlesQuerySchema = z.object({
  brokerAccountId: z.string().min(1),
  exchange: z.string().min(1),
  symboltoken: z.string().min(1),
  interval: z.enum([
    "ONE_MINUTE",
    "THREE_MINUTE",
    "FIVE_MINUTE",
    "TEN_MINUTE",
    "FIFTEEN_MINUTE",
    "THIRTY_MINUTE",
    "ONE_HOUR",
    "ONE_DAY",
  ]),
  fromDate: z.string().min(1),
  toDate: z.string().min(1),
});

export const anyResponseSchema = z.any();

export type LtpQueryInput = z.infer<typeof ltpQuerySchema>;
export type QuoteQueryInput = z.infer<typeof quoteQuerySchema>;
export type CandlesQueryInput = z.infer<typeof candlesQuerySchema>;

export const instrumentSearchQuerySchema = z.object({
  query: z.string().min(1),
  exchange: z.string().optional(),
  instrumentType: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(25),
});

export type InstrumentSearchQueryInput = z.infer<
  typeof instrumentSearchQuerySchema
>;

export const optionExpiriesQuerySchema = z.object({
  symbol: z.string().min(1),
  exchange: z.string().default("NFO"),
  instrumentType: z.string().default("OPTIDX"),
});

export type OptionExpiriesQueryInput = z.infer<
  typeof optionExpiriesQuerySchema
>;

export const optionChainQuerySchema = z.object({
  brokerAccountId: z.string().min(1),
  symbol: z.string().min(1),
  expiry: z.string().min(1),
  strikeRange: z.coerce.number().min(1).max(30).default(10),
});

export type OptionChainQueryInput = z.infer<typeof optionChainQuerySchema>;

export const optionGreeksQuerySchema = z.object({
  brokerAccountId: z.string().min(1),
  symbol: z.string().min(1),
  expiry: z.string().min(1),
});

export type OptionGreeksQueryInput = z.infer<typeof optionGreeksQuerySchema>;
