import { z } from "zod";

export const connectBrokerFormSchema = z.object({
  broker: z.enum(["ANGEL_ONE", "KOTAK"]),
  clientId: z.string().min(1, "Client ID is required"),
  apiKey: z.string().min(1, "API Key is required"),
});

export type ConnectBrokerFormData = z.infer<typeof connectBrokerFormSchema>;

export const createSessionFormSchema = z.object({
  mpin: z.string().min(1, "MPIN is required"),
  totp: z.string().min(6, "TOTP must be at least 6 digits"),
});

export type CreateSessionFormData = z.infer<typeof createSessionFormSchema>;
