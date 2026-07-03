export const GET_ACCOUNTS = "/broker/accounts";
export const CONNECT_BROKER = "/broker/connect";
export const CREATE_SESSION = (id: string) => `/broker/${id}/session`;
export const GET_PROFILE = (id: string) => `/broker/${id}/profile`;
export const GET_FUNDS = (id: string) => `/broker/${id}/funds`;
export const GET_HOLDINGS = (id: string) => `/broker/${id}/holdings`;
export const GET_POSITIONS = (id: string) => `/broker/${id}/positions`;
