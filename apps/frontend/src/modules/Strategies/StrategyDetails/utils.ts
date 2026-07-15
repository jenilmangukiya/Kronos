import { formatTradeSide } from "./helpers";
import { formatCurrency } from "../../../utils/format";
import { Candle, ChartMarker } from "../../../components/charts/CandleChart";

export const parseExpiryDate = (expiryStr: string | null | undefined): Date | null => {
  if (!expiryStr) return null;
  const match = expiryStr.match(/^(\d{1,2})([A-Z]{3})(\d{4})$/i);
  if (!match || !match[1] || !match[2] || !match[3]) return null;
  const day = parseInt(match[1], 10);
  const monthStr = match[2].toUpperCase();
  const year = parseInt(match[3], 10);

  const months: { [key: string]: number } = {
    JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
    JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
  };
  const month = months[monthStr];
  if (month === undefined) return null;

  return new Date(year, month, day, 23, 59, 59);
};

export const findNearestCandleTime = (orderTimeSec: number, candlesList: Candle[]): number | null => {
  if (candlesList.length === 0) return null;
  let nearestCandle = candlesList[0];
  if (!nearestCandle) return null;
  let minDiff = Math.abs(Number(nearestCandle.time) - orderTimeSec);
  for (let i = 1; i < candlesList.length; i++) {
    const candle = candlesList[i];
    if (!candle) continue;
    const diff = Math.abs(Number(candle.time) - orderTimeSec);
    if (diff < minDiff) {
      minDiff = diff;
      nearestCandle = candle;
    }
  }
  return Number(nearestCandle.time);
};

interface StrategyOrderSubset {
  createdAt: string;
  status: string;
  side: string;
  price: number;
  symbol: string;
  quantity: number;
}

export const getMarkersFromOrders = (candlesList: Candle[], strategyOrdersList: StrategyOrderSubset[]): ChartMarker[] => {
  const chronological = [...strategyOrdersList]
    .filter((order) => order.status === "FILLED")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (chronological.length === 0 || candlesList.length === 0) return [];

  const markersList: ChartMarker[] = [];
  const activePositions: { [symbol: string]: { side: string; qty: number } } = {};

  chronological.forEach((order) => {
    const orderTimeSec = Math.floor(new Date(order.createdAt).getTime() / 1000);
    const nearestTime = findNearestCandleTime(orderTimeSec, candlesList);
    if (nearestTime === null) return;

    const orderSide = formatTradeSide(order.side);
    const symbol = order.symbol;
    
    const posState = activePositions[symbol] || { side: orderSide, qty: 0 };
    
    let isEntry = false;
    let isExit = false;

    if (posState.qty === 0) {
      isEntry = true;
      posState.side = orderSide;
      posState.qty = order.quantity;
    } else {
      if (orderSide === posState.side) {
        isEntry = true;
        posState.qty += order.quantity;
      } else {
        isExit = true;
        posState.qty = Math.max(0, posState.qty - order.quantity);
      }
    }
    activePositions[symbol] = posState;

    let text = "";
    let position: "aboveBar" | "belowBar" = "belowBar";
    let shape: "arrowUp" | "arrowDown" | "circle" = "circle";
    let color = "";

    if (isEntry) {
      if (orderSide === "BUY") {
        text = `ENTRY BUY @ ${formatCurrency(order.price)}`;
        position = "belowBar";
        shape = "arrowUp";
        color = "#10b981"; // green
      } else {
        text = `ENTRY SELL @ ${formatCurrency(order.price)}`;
        position = "aboveBar";
        shape = "arrowDown";
        color = "#ef4444"; // red
      }
    } else if (isExit) {
      if (orderSide === "BUY") {
        text = `EXIT BUY @ ${formatCurrency(order.price)}`;
        position = "belowBar";
        shape = "circle";
        color = "#a855f7"; // purple
      } else {
        text = `EXIT SELL @ ${formatCurrency(order.price)}`;
        position = "aboveBar";
        shape = "circle";
        color = "#a855f7"; // purple
      }
    } else {
      if (orderSide === "BUY") {
        text = `BUY @ ${formatCurrency(order.price)}`;
        position = "belowBar";
        shape = "arrowUp";
        color = "#10b981";
      } else {
        text = `SELL @ ${formatCurrency(order.price)}`;
        position = "aboveBar";
        shape = "arrowDown";
        color = "#ef4444";
      }
    }

    markersList.push({
      time: nearestTime,
      position,
      shape,
      text,
      color,
    });
  });

  return markersList;
};
