export const UNDERLYING_TOKENS = {
  NIFTY: {
    token: "99926000",
    exchangeType: 1,
  },
  BANKNIFTY: {
    token: "99926009",
    exchangeType: 1,
  },
};

export const SYMBOL_OPTIONS = [
  { value: "NIFTY", label: "NIFTY" },
  { value: "BANKNIFTY", label: "BANKNIFTY" },
];

export const INSTRUMENT_TYPE_OPTIONS = [
  { value: "FUTURE", label: "FUTURE" },
  { value: "OPTION", label: "OPTION" },
];

export const RULE_TYPE_OPTIONS = [
  { value: "UNDERLYING_CROSS_ABOVE", label: "UNDERLYING_CROSS_ABOVE" },
  { value: "UNDERLYING_CROSS_BELOW", label: "UNDERLYING_CROSS_BELOW" },
];
