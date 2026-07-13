const toTitleCase = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

export const formatStrategyType = (strategyType?: string): string => {
  if (!strategyType) return "-";
  switch (strategyType) {
    case "PRICE_BREAKOUT":
      return "Price Breakout";
    case "HIGH_LOW_BREAKOUT_REVERSAL":
      return "High/Low Breakout Reversal";
    default:
      return toTitleCase(strategyType);
  }
};

export const formatRuleType = (ruleType?: string): string => {
  if (!ruleType) return "-";
  switch (ruleType) {
    case "UNDERLYING_CROSS_ABOVE":
      return "Underlying Cross Above";
    case "UNDERLYING_CROSS_BELOW":
      return "Underlying Cross Below";
    default:
      return toTitleCase(ruleType);
  }
};

export const formatTradeSide = (side?: string): string => {
  if (!side) return "-";
  const upperSide = side.toUpperCase();
  switch (upperSide) {
    case "BUY":
    case "LONG":
      return "BUY";
    case "SELL":
    case "SHORT":
      return "SELL";
    default:
      return toTitleCase(side);
  }
};

export const formatInstrumentType = (instrumentType?: string): string => {
  if (!instrumentType) return "-";
  switch (instrumentType) {
    case "EQUITY":
      return "Equity";
    case "FUTURE":
      return "Future";
    case "OPTION":
      return "Option";
    default:
      return toTitleCase(instrumentType);
  }
};

export const formatReEntryMode = (value?: string): string => {
  if (!value) return "No Re-entry";
  switch (value) {
    case "NO_REENTRY":
      return "No Re-entry";
    case "AFTER_EXIT":
      return "After Exit";
    case "AFTER_NEW_SIGNAL":
      return "After New Signal";
    default:
      return toTitleCase(value);
  }
};
