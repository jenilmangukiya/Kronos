import { z } from "zod";

export const createPaperOrderBodySchema = z.object({
  brokerAccountId: z.string().optional(),
  strategyId: z.string().optional(),
  instrumentType: z.enum(["EQUITY", "FUTURE", "OPTION"]),
  token: z.string().min(1),
  symbol: z.string().min(1),
  exchangeType: z.number(),
  exchange: z.string().min(1),
  side: z.enum(["BUY", "SELL"]),
  quantity: z.number().int().positive(),
  price: z.number().positive().optional(),
});

export const exitPaperPositionParamsSchema = z.object({
  id: z.string().min(1),
});

export const exitPaperPositionBodySchema = z.object({
  price: z.number().positive().optional(),
});

export const anyResponseSchema = z.any();

export type CreatePaperOrderBodyInput = z.infer<
  typeof createPaperOrderBodySchema
>;

export type ExitPaperPositionBodyInput = z.infer<
  typeof exitPaperPositionBodySchema
>;
