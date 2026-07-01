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
