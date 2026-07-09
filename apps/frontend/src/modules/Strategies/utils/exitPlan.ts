import { PaperPosition } from "../../../services/paper-trading/PaperTradingService";
import { StrategyRisk } from "../../../services/strategies/StrategyService";

export interface ExitPlan {
  side: "LONG" | "SHORT";
  avgPrice: number;
  quantity: number;
  symbol: string;
  targetPrice: number | null;
  stopLossPrice: number | null;
  exitAction: "SELL" | "BUY";
  targetExplanation: string;
  stopLossExplanation: string;
  pointsToTarget: number | null;
  pointsToStopLoss: number | null;
  percentToTarget: number | null;
  percentToStopLoss: number | null;
  isTargetHit: boolean;
  isStopLossHit: boolean;
}

export function getExitPlan(
  position: PaperPosition,
  risk: StrategyRisk | undefined,
  currentPrice?: number | null
): ExitPlan {
  const isLong = position.side === "LONG";
  const avgPrice = position.avgPrice;
  const side = position.side;
  const quantity = position.quantity;
  const symbol = position.symbol;

  const targetPercent = risk?.targetPercent ?? 0;
  const stopLossPercent = risk?.stopLossPercent ?? 0;

  const targetPrice = targetPercent > 0
    ? (isLong ? avgPrice * (1 + targetPercent / 100) : avgPrice * (1 - targetPercent / 100))
    : null;

  const stopLossPrice = stopLossPercent > 0
    ? (isLong ? avgPrice * (1 - stopLossPercent / 100) : avgPrice * (1 + stopLossPercent / 100))
    : null;

  const exitAction = isLong ? "SELL" : "BUY";

  const targetExplanation = isLong
    ? "If price reaches targetPrice, strategy will SELL to exit with profit"
    : "If price reaches targetPrice, strategy will BUY to exit with profit";

  const stopLossExplanation = isLong
    ? "If price reaches stopLossPrice, strategy will SELL to exit with loss"
    : "If price reaches stopLossPrice, strategy will BUY to exit with loss";

  let pointsToTarget: number | null = null;
  let pointsToStopLoss: number | null = null;
  let percentToTarget: number | null = null;
  let percentToStopLoss: number | null = null;
  let isTargetHit = false;
  let isStopLossHit = false;

  if (currentPrice !== undefined && currentPrice !== null && currentPrice > 0) {
    if (targetPrice !== null) {
      if (isLong) {
        isTargetHit = currentPrice >= targetPrice;
        pointsToTarget = targetPrice - currentPrice;
      } else {
        isTargetHit = currentPrice <= targetPrice;
        pointsToTarget = currentPrice - targetPrice;
      }
      percentToTarget = (pointsToTarget / currentPrice) * 100;
    }

    if (stopLossPrice !== null) {
      if (isLong) {
        isStopLossHit = currentPrice <= stopLossPrice;
        pointsToStopLoss = currentPrice - stopLossPrice;
      } else {
        isStopLossHit = currentPrice >= stopLossPrice;
        pointsToStopLoss = stopLossPrice - currentPrice;
      }
      percentToStopLoss = (pointsToStopLoss / currentPrice) * 100;
    }
  }

  return {
    side,
    avgPrice,
    quantity,
    symbol,
    targetPrice,
    stopLossPrice,
    exitAction,
    targetExplanation,
    stopLossExplanation,
    pointsToTarget,
    pointsToStopLoss,
    percentToTarget,
    percentToStopLoss,
    isTargetHit,
    isStopLossHit,
  };
}
