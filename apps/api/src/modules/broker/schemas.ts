import { z } from "zod";

export const brokerNameSchema = z.enum(["KOTAK", "ANGEL_ONE"]);

export const connectBrokerBodySchema = z.object({
  broker: brokerNameSchema,
  clientId: z.string().min(1, "Client ID is required"),
  apiKey: z.string().min(1, "API Key is required"),
});

export const connectBrokerResponseSchema = z.object({
  id: z.string(),
  broker: z.string(),
  clientId: z.string(),
  createdAt: z.date().or(z.string()),
});

export const getMyBrokersResponseSchema = z.array(
  z.object({
    id: z.string(),
    broker: z.string(),
    clientId: z.string(),
    tokenExpiresAt: z.date().or(z.string()).nullable(),
    createdAt: z.date().or(z.string()),
  }),
);

export const brokerIdParamSchema = z.object({
  id: z.string().min(1, "ID is required"),
});

export const disconnectResponseSchema = z.object({
  success: z.boolean(),
});

export const createBrokerSessionBodySchema = z.object({
  mpin: z.string().min(1, "MPIN is required"),
  totp: z.string().min(1, "TOTP is required"),
  mobileNumber: z.string().optional(),
});

export const createBrokerSessionResponseSchema = z.object({
  id: z.string(),
  broker: z.string(),
  clientId: z.string(),
  tokenExpiresAt: z.date().or(z.string()).nullable(),
  updatedAt: z.date().or(z.string()),
});

export const getProfileResponseSchema = z.any();
export const getFundsResponseSchema = z.any();
export const getHoldingsResponseSchema = z.any();
export const getPositionsResponseSchema = z.any();
