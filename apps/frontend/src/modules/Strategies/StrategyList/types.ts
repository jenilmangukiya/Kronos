import { Strategy } from "../../../services/strategies/StrategyService";

export interface StrategyListState {
  strategies: Strategy[];
  isLoading: boolean;
  error: string | null;
}
