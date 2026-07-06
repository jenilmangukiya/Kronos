import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBrokerAccounts } from "../../../services/broker/BrokerQueries";
import { useCreateStrategy } from "../../../services/strategies/StrategyQueries";
import { useGetFutures, useOptionExpiries, useOptionChainQuery } from "../../../services/market-data/MarketDataQueries";
import { UNDERLYING_TOKENS } from "./constants";
import { StrategyFormValues } from "./types";
import { CreateStrategyRequest } from "../../../services/strategies/StrategyService";

export const useStrategyCreate = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<StrategyFormValues>({
    name: "",
    symbol: "NIFTY",
    instrumentType: "FUTURE",
    mode: "PAPER",
    ruleType: "UNDERLYING_CROSS_ABOVE",
    triggerPrice: 0,
    tradeSide: "BUY",
    tradeQuantity: 65, // Nifty lot size default
    tradeToken: "",
    tradeSymbol: "",
    tradeExpiry: "",
    maxTradesPerDay: 1,
    stopLossPercent: undefined,
    targetPercent: undefined,
    reEntryMode: "NO_REENTRY",
  });

  const [validationError, setValidationError] = useState<string | null>(null);

  // Fetch broker accounts
  const { data: brokerAccounts = [], isLoading: isAccountsLoading } = useBrokerAccounts();

  // Find active account where hasSession === true and sessionExpired === false
  const activeAccount = brokerAccounts.find(
    (acc) => acc.hasSession === true && acc.sessionExpired === false
  );

  const brokerAccountId = activeAccount?.id || "";

  // Query futures
  const isFuture = form.instrumentType === "FUTURE";
  const { data: futuresData, isLoading: isFuturesLoading } = useGetFutures(
    { brokerAccountId, symbol: form.symbol },
    { enabled: Boolean(brokerAccountId && isFuture) }
  );
  const futures = futuresData?.rows || [];

  // Query option expiries
  const isOption = form.instrumentType === "OPTION";
  const { data: expiries = [], isLoading: isExpiriesLoading } = useOptionExpiries(form.symbol, {
    enabled: Boolean(isOption),
  });

  // Query option chain
  const { data: optionChain, isLoading: isOptionChainLoading } = useOptionChainQuery(
    brokerAccountId,
    form.symbol,
    form.tradeExpiry || "",
    10,
    { enabled: Boolean(brokerAccountId && isOption && form.tradeExpiry) }
  );

  const createMutation = useCreateStrategy();

  // Reset trade specific fields when symbol or instrumentType change
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      tradeToken: "",
      tradeSymbol: "",
      tradeExpiry: "",
      tradeQuantity: prev.symbol === "NIFTY" ? 65 : 15,
    }));
  }, [form.symbol, form.instrumentType]);

  // Set first expiry date as default when expiries load
  useEffect(() => {
    if (isOption && expiries.length > 0 && !form.tradeExpiry) {
      setForm((prev) => ({ ...prev, tradeExpiry: expiries[0] }));
    }
  }, [expiries, isOption]);

  const setFieldValue = (field: keyof StrategyFormValues, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    setValidationError(null);

    // Basic validation
    if (!form.name.trim()) {
      setValidationError("Strategy name is required");
      return;
    }
    if (form.triggerPrice <= 0) {
      setValidationError("Trigger price must be greater than 0");
      return;
    }
    if (!form.tradeToken || !form.tradeSymbol) {
      setValidationError("Please select a contract or trade asset for execution");
      return;
    }
    if (form.tradeQuantity <= 0) {
      setValidationError("Trade quantity must be greater than 0");
      return;
    }

    const underlying = UNDERLYING_TOKENS[form.symbol];

    const body: CreateStrategyRequest = {
      brokerAccountId,
      name: form.name,
      symbol: form.symbol,
      instrumentType: form.instrumentType,
      mode: "PAPER",
      rules: {
        type: form.ruleType,
        underlyingToken: underlying.token,
        underlyingExchangeType: underlying.exchangeType,
        triggerPrice: Number(form.triggerPrice),
      },
      trade: {
        instrumentType: form.instrumentType,
        token: form.tradeToken,
        symbol: form.tradeSymbol,
        exchangeType: 2, // NFO exchangeType
        exchange: "NFO",
        side: form.tradeSide,
        quantity: Number(form.tradeQuantity),
      },
      risk: {
        maxTradesPerDay: Number(form.maxTradesPerDay),
        stopLossPercent: form.stopLossPercent ? Number(form.stopLossPercent) : undefined,
        targetPercent: form.targetPercent ? Number(form.targetPercent) : undefined,
        reEntryMode: form.reEntryMode,
      },
    };

    try {
      const response = await createMutation.mutateAsync(body);
      if (response && response.id) {
        navigate(`/dashboard/strategies/${response.id}`);
      } else {
        navigate("/dashboard/strategies");
      }
    } catch (err: any) {
      setValidationError(err?.response?.data?.message || err?.message || "Failed to create strategy");
    }
  };

  return {
    form,
    setFieldValue,
    activeAccount,
    isAccountsLoading,
    futures,
    isFuturesLoading,
    expiries,
    isExpiriesLoading,
    optionChain,
    isOptionChainLoading,
    handleCreate,
    isCreating: createMutation.isPending,
    validationError,
    setValidationError,
  };
};
