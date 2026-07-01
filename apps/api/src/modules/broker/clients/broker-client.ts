import type {
  BrokerSessionResult,
  CreateBrokerSessionInput,
} from "../types.js";

export interface BrokerClient {
  getName(): string;

  createSession(params: {
    clientId: string;
    apiKey: string;
    input: CreateBrokerSessionInput;
  }): Promise<BrokerSessionResult>;
}
