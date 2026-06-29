export type BrokerName = "KOTAK";

export interface ConnectBrokerInput {
  broker: BrokerName;
  clientId: string;
}

export interface BrokerAccountResponse {
  id: string;
  broker: string;
  clientId: string;
  createdAt: Date;
}
