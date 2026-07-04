import { PaperOrder, PaperPosition } from "../../../services/paper-trading/PaperTradingService";

export interface DashboardSummary {
  openPositionsCount: number;
  closedPositionsCount: number;
  totalRealizedPnl: number;
  totalUnrealizedPnl: number;
  totalPnl: number;
}
