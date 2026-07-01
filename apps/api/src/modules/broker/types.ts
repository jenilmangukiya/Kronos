import { z } from "zod";
import {
  brokerNameSchema,
  connectBrokerBodySchema,
  createBrokerSessionBodySchema,
} from "./schemas.js";

export type BrokerName = z.infer<typeof brokerNameSchema>;

export type ConnectBrokerInput = z.infer<typeof connectBrokerBodySchema>;

export type CreateBrokerSessionInput = z.infer<typeof createBrokerSessionBodySchema>;

export interface BrokerSessionResult {
  accessToken: string;
  tokenExpiresAt: Date;

  refreshToken?: string;
  feedToken?: string;

  sessionSid?: string;
  sessionBaseUrl?: string;
}

export interface BrokerAccountResponse {
  id: string;
  broker: string;
  clientId: string;
  createdAt: Date;
}
