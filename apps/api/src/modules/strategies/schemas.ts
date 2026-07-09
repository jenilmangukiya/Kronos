import { z } from "zod";

export const strategyRulesSchema = z.object({
  type: z.enum(["UNDERLYING_CROSS_ABOVE", "UNDERLYING_CROSS_BELOW"]),
  underlyingToken: z.string().min(1),
  underlyingExchangeType: z.number().int(),
  triggerPrice: z.number().positive(),
});

export const strategyTradeSchema = z.object({
  instrumentType: z.enum(["EQUITY", "FUTURE", "OPTION"]),
  token: z.string().min(1),
  symbol: z.string().min(1),
  exchangeType: z.number().int(),
  exchange: z.string().min(1),
  side: z.enum(["BUY", "SELL"]),
  quantity: z.number().int().positive(),
});

export const strategyRiskSchema = z.object({
  maxTradesPerDay: z.number().int().positive().optional(),
  stopLossPercent: z.number().positive().optional(),
  targetPercent: z.number().positive().optional(),
  reEntryMode: z
    .enum(["NO_REENTRY", "AFTER_EXIT", "AFTER_NEW_SIGNAL"])
    .default("NO_REENTRY")
    .optional(),
});

export const createStrategyBodySchema = z.object({
  brokerAccountId: z.string().optional(),
  name: z.string().min(1),
  symbol: z.string().min(1),
  strategyType: z.string().default("PRICE_BREAKOUT"),
  instrumentType: z.enum(["EQUITY", "FUTURE", "OPTION"]),
  mode: z.enum(["PAPER", "LIVE"]).default("PAPER"),
  rules: z.unknown(),
  trade: z.unknown(),
  risk: z.unknown().optional(),
});

export const updateStrategyBodySchema = z.object({
  name: z.string().min(1).optional(),
  strategyType: z.string().optional(),
  instrumentType: z.enum(["EQUITY", "FUTURE", "OPTION"]).optional(),
  symbol: z.string().min(1).optional(),
  rules: z.unknown().optional(),
  trade: z.unknown().optional(),
  risk: z.unknown().optional(),
  mode: z.enum(["PAPER", "LIVE"]).optional(),
  brokerAccountId: z.string().optional(),
});

export const strategyParamsSchema = z.object({
  id: z.string().min(1),
});

export const anyResponseSchema = z.any();

export type CreateStrategyBodyInput = z.infer<typeof createStrategyBodySchema>;
export type UpdateStrategyBodyInput = z.infer<typeof updateStrategyBodySchema>;
