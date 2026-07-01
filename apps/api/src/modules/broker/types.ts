export type BrokerName = "KOTAK" | "ANGEL_ONE";

export interface ConnectBrokerInput {
  broker: BrokerName;
  clientId: string;
  apiKey: string;
}

export interface CreateBrokerSessionInput {
  mpin: string;
  totp: string;

  // Needed only for Kotak. Angel does not need mobileNumber.
  mobileNumber?: string;
}

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
