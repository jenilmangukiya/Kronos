import type { FastifyInstance } from "fastify";

import { AppError } from "../../errors/app-error.js";
import { liveTickStore } from "../market-data/live/live-tick.store.js";
import type { CreatePaperOrderInput, ExitPaperPositionInput } from "./types.js";

export class PaperTradingService {
  constructor(private readonly db: FastifyInstance["db"]) {}

  async createOrder(userId: string, input: CreatePaperOrderInput) {
    const price = input.price ?? this.getLivePrice(input);

    if (!price || price <= 0) {
      throw new AppError(
        "Valid price not available for paper order",
        400,
        "PAPER_ORDER_PRICE_MISSING",
      );
    }

    const existingPosition = await this.db.paperPosition.findFirst({
      where: {
        userId,
        token: input.token,
        status: "OPEN",
        strategyId: input.strategyId ?? null,
      },
    });

    if (!existingPosition) {
      return this.openPosition(userId, input, price);
    }

    if (existingPosition.side === "LONG") {
      if (input.side === "BUY") {
        return this.addToPosition(userId, input, price, existingPosition);
      }

      return this.reduceLongPosition(userId, input, price, existingPosition);
    }

    if (existingPosition.side === "SHORT") {
      if (input.side === "SELL") {
        return this.addToPosition(userId, input, price, existingPosition);
      }

      return this.reduceShortPosition(userId, input, price, existingPosition);
    }

    throw new AppError("Invalid paper position", 400, "INVALID_PAPER_POSITION");
  }

  async getOrders(userId: string) {
    return this.db.paperOrder.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async getPositions(userId: string) {
    const positions = await this.db.paperPosition.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return positions.map((position) => {
      const livePrice =
        position.status === "OPEN"
          ? (liveTickStore.getTick(
              position.brokerAccountId ?? "manual",
              position.token,
            )?.ltp ?? null)
          : null;

      const unrealizedPnl =
        position.status === "OPEN" && livePrice
          ? position.side === "LONG"
            ? (livePrice - position.avgPrice) * position.quantity
            : (position.avgPrice - livePrice) * position.quantity
          : 0;

      return {
        ...position,
        ltp: livePrice,
        unrealizedPnl,
        totalPnl: position.realizedPnl + unrealizedPnl,
      };
    });
  }

  async exitPosition(
    userId: string,
    positionId: string,
    input: ExitPaperPositionInput,
  ) {
    const position = await this.db.paperPosition.findFirst({
      where: {
        id: positionId,
        userId,
        status: "OPEN",
      },
    });

    if (!position) {
      throw new AppError(
        "Open paper position not found",
        404,
        "PAPER_POSITION_NOT_FOUND",
      );
    }

    const livePrice =
      input.price ??
      liveTickStore.getTick(
        position.brokerAccountId ?? "manual",
        position.token,
      )?.ltp;

    if (!livePrice || livePrice <= 0) {
      throw new AppError(
        "Valid exit price not available",
        400,
        "PAPER_EXIT_PRICE_MISSING",
      );
    }

    const exitSide = position.side === "LONG" ? "SELL" : "BUY";

    const pnl =
      position.side === "LONG"
        ? (livePrice - position.avgPrice) * position.quantity
        : (position.avgPrice - livePrice) * position.quantity;

    return this.db.$transaction(async (tx) => {
      const order = await tx.paperOrder.create({
        data: {
          userId,
          brokerAccountId: position.brokerAccountId,
          instrumentType: position.instrumentType,
          token: position.token,
          symbol: position.symbol,
          exchangeType: position.exchangeType,
          exchange: position.exchange,
          side: exitSide,
          quantity: position.quantity,
          price: livePrice,
          status: "FILLED",
        },
      });

      const closedPosition = await tx.paperPosition.update({
        where: { id: position.id },
        data: {
          quantity: 0,
          status: "CLOSED",
          realizedPnl: pnl,
          closedAt: new Date(),
        },
      });

      return {
        order,
        position: closedPosition,
        realizedPnl: pnl,
      };
    });
  }

  async exitPositionByStrategy(
    userId: string,
    strategyId: string,
    price?: number,
  ) {
    const position = await this.db.paperPosition.findFirst({
      where: {
        userId,
        strategyId,
        status: "OPEN",
      },
    });

    if (!position) {
      return null;
    }

    return this.exitPosition(userId, position.id, { price });
  }

  private async openPosition(
    userId: string,
    input: CreatePaperOrderInput,
    price: number,
  ) {
    const positionSide = input.side === "BUY" ? "LONG" : "SHORT";

    return this.db.$transaction(async (tx) => {
      const order = await tx.paperOrder.create({
        data: {
          userId,
          strategyId: input.strategyId,
          brokerAccountId: input.brokerAccountId,
          instrumentType: input.instrumentType,
          token: input.token,
          symbol: input.symbol,
          exchangeType: input.exchangeType,
          exchange: input.exchange,
          side: input.side,
          quantity: input.quantity,
          price,
          status: "FILLED",
        },
      });

      const position = await tx.paperPosition.create({
        data: {
          userId,
          strategyId: input.strategyId,
          brokerAccountId: input.brokerAccountId,
          instrumentType: input.instrumentType,
          token: input.token,
          symbol: input.symbol,
          exchangeType: input.exchangeType,
          exchange: input.exchange,
          side: positionSide,
          quantity: input.quantity,
          avgPrice: price,
          status: "OPEN",
        },
      });

      return { order, position };
    });
  }

  private async addToPosition(
    userId: string,
    input: CreatePaperOrderInput,
    price: number,
    existingPosition: {
      id: string;
      quantity: number;
      avgPrice: number;
      side: "LONG" | "SHORT";
      realizedPnl: number;
    },
  ) {
    const newQuantity = existingPosition.quantity + input.quantity;

    const newAvgPrice =
      (existingPosition.avgPrice * existingPosition.quantity +
        price * input.quantity) /
      newQuantity;

    return this.db.$transaction(async (tx) => {
      const order = await tx.paperOrder.create({
        data: {
          userId,
          strategyId: input.strategyId,
          brokerAccountId: input.brokerAccountId,
          instrumentType: input.instrumentType,
          token: input.token,
          symbol: input.symbol,
          exchangeType: input.exchangeType,
          exchange: input.exchange,
          side: input.side,
          quantity: input.quantity,
          price,
          status: "FILLED",
        },
      });

      const position = await tx.paperPosition.update({
        where: { id: existingPosition.id },
        data: {
          quantity: newQuantity,
          avgPrice: newAvgPrice,
        },
      });

      return { order, position };
    });
  }

  private async reduceLongPosition(
    userId: string,
    input: CreatePaperOrderInput,
    price: number,
    existingPosition: {
      id: string;
      brokerAccountId: string | null;
      instrumentType: "EQUITY" | "FUTURE" | "OPTION";
      token: string;
      symbol: string;
      exchangeType: number;
      exchange: string;
      quantity: number;
      avgPrice: number;
      realizedPnl: number;
    },
  ) {
    if (input.quantity > existingPosition.quantity) {
      throw new AppError(
        "Sell quantity cannot be greater than open long quantity",
        400,
        "PAPER_SELL_QUANTITY_TOO_HIGH",
      );
    }

    const realizedPnl = (price - existingPosition.avgPrice) * input.quantity;
    const remainingQuantity = existingPosition.quantity - input.quantity;

    return this.closeOrReducePosition(
      userId,
      input,
      price,
      existingPosition,
      realizedPnl,
      remainingQuantity,
    );
  }

  private async reduceShortPosition(
    userId: string,
    input: CreatePaperOrderInput,
    price: number,
    existingPosition: {
      id: string;
      brokerAccountId: string | null;
      instrumentType: "EQUITY" | "FUTURE" | "OPTION";
      token: string;
      symbol: string;
      exchangeType: number;
      exchange: string;
      quantity: number;
      avgPrice: number;
      realizedPnl: number;
    },
  ) {
    if (input.quantity > existingPosition.quantity) {
      throw new AppError(
        "Buy quantity cannot be greater than open short quantity",
        400,
        "PAPER_BUY_QUANTITY_TOO_HIGH",
      );
    }

    const realizedPnl = (existingPosition.avgPrice - price) * input.quantity;
    const remainingQuantity = existingPosition.quantity - input.quantity;

    return this.closeOrReducePosition(
      userId,
      input,
      price,
      existingPosition,
      realizedPnl,
      remainingQuantity,
    );
  }

  private async closeOrReducePosition(
    userId: string,
    input: CreatePaperOrderInput,
    price: number,
    existingPosition: {
      id: string;
      quantity: number;
      realizedPnl: number;
    },
    realizedPnl: number,
    remainingQuantity: number,
  ) {
    return this.db.$transaction(async (tx) => {
      const order = await tx.paperOrder.create({
        data: {
          userId,
          strategyId: input.strategyId,
          brokerAccountId: input.brokerAccountId,
          instrumentType: input.instrumentType,
          token: input.token,
          symbol: input.symbol,
          exchangeType: input.exchangeType,
          exchange: input.exchange,
          side: input.side,
          quantity: input.quantity,
          price,
          status: "FILLED",
        },
      });

      const position = await tx.paperPosition.update({
        where: { id: existingPosition.id },
        data: {
          quantity: remainingQuantity,
          status: remainingQuantity === 0 ? "CLOSED" : "OPEN",
          realizedPnl: existingPosition.realizedPnl + realizedPnl,
          closedAt: remainingQuantity === 0 ? new Date() : null,
        },
      });

      return {
        order,
        position,
        realizedPnl,
      };
    });
  }

  private getLivePrice(input: CreatePaperOrderInput) {
    if (!input.brokerAccountId) {
      return null;
    }

    return (
      liveTickStore.getTick(input.brokerAccountId, input.token)?.ltp ?? null
    );
  }
}
