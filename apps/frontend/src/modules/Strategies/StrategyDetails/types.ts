import { Strategy, StrategyLog } from "../../../services/strategies/StrategyService";

export interface StrategyDetailsState {
  strategy: Strategy | null;
  logs: StrategyLog[];
  isLoading: boolean;
  error: string | null;
}
