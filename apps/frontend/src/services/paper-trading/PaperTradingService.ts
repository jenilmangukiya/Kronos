import { axiosAuth } from "../api/axios";
import {
  CREATE_PAPER_ORDER,
  GET_PAPER_ORDERS,
  GET_PAPER_POSITIONS,
  EXIT_PAPER_POSITION,
} from "./PaperTradingApiRoutes";

export type PaperInstrumentType = "EQUITY" | "FUTURE" | "OPTION";
export type PaperOrderSide = "BUY" | "SELL";
export type PaperPositionStatus = "OPEN" | "CLOSED";

export interface CreatePaperOrderRequest {
  brokerAccountId?: string;
  instrumentType: PaperInstrumentType;
  token: string;
  symbol: string;
  exchangeType: number;
  exchange: string;
  side: PaperOrderSide;
  quantity: number;
  price?: number;
}

export interface PaperOrder {
  id: string;
  userId: string;
  strategyId?: string | null;
  brokerAccountId?: string | null;
  instrumentType: PaperInstrumentType;
  token: string;
  symbol: string;
  exchangeType: number;
  exchange: string;
  side: PaperOrderSide;
  quantity: number;
  price: number;
  status: "FILLED" | "CANCELLED";
  createdAt: string;
}

export interface PaperPosition {
  id: string;
  userId: string;
  strategyId?: string | null;
  brokerAccountId?: string | null;
  instrumentType: PaperInstrumentType;
  side: "LONG" | "SHORT";
  token: string;
  symbol: string;
  exchangeType: number;
  exchange: string;
  quantity: number;
  avgPrice: number;
  status: PaperPositionStatus;
  realizedPnl: number;
  ltp: number | null;
  unrealizedPnl: number;
  totalPnl: number;
  openedAt: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const createPaperOrder = async (
  data: CreatePaperOrderRequest
): Promise<PaperOrder> => {
  const response = await axiosAuth.post<PaperOrder>(CREATE_PAPER_ORDER, data);
  return response.data;
};

export const getPaperOrders = async (): Promise<PaperOrder[]> => {
  const response = await axiosAuth.get<PaperOrder[]>(GET_PAPER_ORDERS);
  return response.data;
};

export const getPaperPositions = async (): Promise<PaperPosition[]> => {
  const response = await axiosAuth.get<PaperPosition[]>(GET_PAPER_POSITIONS);
  return response.data;
};

export const exitPaperPosition = async ({
  id,
  price,
}: {
  id: string;
  price: number;
}): Promise<PaperPosition> => {
  const response = await axiosAuth.post<PaperPosition>(EXIT_PAPER_POSITION(id), { price });
  return response.data;
};
