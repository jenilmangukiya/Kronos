import React from "react";
import { PriceBreakoutConfig } from "./priceBreakout.config";

export interface StrategyTypeConfig {
  strategyType: string;
  label: string;
  description: string;
  defaultValues: Record<string, any>;
  FormComponent: React.FC<{
    form: any;
    onChange: (field: any, value: any) => void;
    underlyingLtp?: number;
    triggerPriceWarning: string | null;
  }>;
  PreviewComponent: React.FC<{
    strategy: any;
  }>;
  RuntimeSignalComponent?: React.FC<{
    runtimeStatus: any;
    strategy: any;
  }>;
  getSummaryText: (strategy: any) => string;
  buildRulesPayload: (form: any) => any;
  isFormValid: (form: any) => boolean;
}

const registry: Record<string, StrategyTypeConfig> = {
  PRICE_BREAKOUT: PriceBreakoutConfig as StrategyTypeConfig,
};

export const getStrategyTypeConfig = (type: string): StrategyTypeConfig | undefined => {
  return registry[type];
};

export const getAllStrategyConfigs = (): StrategyTypeConfig[] => {
  return Object.values(registry);
};
