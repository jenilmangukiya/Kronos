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

export const liveStartQuerySchema = z.object({
  brokerAccountId: z.string().min(1),
});

export const liveSubscribeBodySchema = z.object({
  brokerAccountId: z.string().min(1),
  tokens: z.array(
    z.object({
      exchangeType: z.union([
        z.literal(1),
        z.literal(2),
        z.literal(3),
        z.literal(4),
        z.literal(5),
        z.literal(7),
        z.literal(13),
      ]),
      tokens: z.array(z.string().min(1)).min(1),
    }),
  ),
});

export const liveLatestQuerySchema = z.object({
  brokerAccountId: z.string().min(1),
  token: z.string().min(1),
});

export const liveManyLatestQuerySchema = z.object({
  brokerAccountId: z.string().min(1),
  tokens: z.string().min(1),
});

export const liveStatusQuerySchema = z.object({
  brokerAccountId: z.string().min(1),
});

export const liveStopQuerySchema = z.object({
  brokerAccountId: z.string().min(1),
});
