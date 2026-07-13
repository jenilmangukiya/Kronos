import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useBrokerAccounts } from "../../../services/broker/BrokerQueries";
import { useCreateStrategy, useGetStrategy, useUpdateStrategy } from "../../../services/strategies/StrategyQueries";
import { useGetFutures, useOptionExpiries, useOptionChainQuery, useLiveLatestTick } from "../../../services/market-data/MarketDataQueries";
import { UNDERLYING_TOKENS } from "./constants";
import { StrategyFormValues } from "./types";
import { CreateStrategyRequest } from "../../../services/strategies/StrategyService";
import { getStrategyTypeConfig } from "../strategyTypes";

export const useStrategyCreate = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

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
    tradeStrike: "",
    tradeOptionType: "CE",
    tradeLots: 1,
    strategyType: "PRICE_BREAKOUT",
    squareOffTime: "15:15",
    rewardRatio: 3,
  });

  const [validationError, setValidationError] = useState<string | null>(null);
  const [hasPrefilled, setHasPrefilled] = useState(false);

  const lastSymbol = useRef(form.symbol);
  const lastInstrumentType = useRef(form.instrumentType);

  // Fetch broker accounts
  const { data: brokerAccounts = [], isLoading: isAccountsLoading } = useBrokerAccounts();

  // Fetch strategy if editing
  const { data: existingStrategy, isLoading: isStrategyLoading } = useGetStrategy(id || "", {
    enabled: isEditMode,
  });

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
    { enabled: Boolean(brokerAccountId && isOption && form.tradeExpiry && form.strategyType !== "HIGH_LOW_BREAKOUT_REVERSAL") }
  );

  const underlyingToken = UNDERLYING_TOKENS[form.symbol]?.token;
  const { data: underlyingTick } = useLiveLatestTick(brokerAccountId, underlyingToken, {
    enabled: Boolean(brokerAccountId && underlyingToken),
    refetchInterval: 5000,
  });

  const underlyingLtp = underlyingTick?.tick?.ltp || (!isOption ? undefined : optionChain?.underlying?.ltp);

  const triggerPriceWarning = (() => {
    if (!underlyingLtp || form.triggerPrice <= 0) return null;
    const diffPercent = (Math.abs(form.triggerPrice - underlyingLtp) / underlyingLtp) * 100;
    if (diffPercent > 5) {
      return "Trigger price is far from current underlying price. This may trigger immediately or never trigger.";
    }
    return null;
  })();

  const isSubmitDisabled = (() => {
    if (!form.name || !form.name.trim()) return true;

    const currentStrategyType = form.strategyType || "PRICE_BREAKOUT";
    const config = getStrategyTypeConfig(currentStrategyType);
    if (config?.isFormValid && !config.isFormValid(form)) return true;

    if (form.maxTradesPerDay === undefined || form.maxTradesPerDay === null || (form.maxTradesPerDay as any) === "" || Number(form.maxTradesPerDay) < 1) return true;
    if (!form.reEntryMode) return true;

    if (currentStrategyType !== "HIGH_LOW_BREAKOUT_REVERSAL") {
      if (form.stopLossPercent !== undefined && form.stopLossPercent !== null && (form.stopLossPercent as any) !== "" && Number(form.stopLossPercent) <= 0) return true;
      if (form.targetPercent !== undefined && form.targetPercent !== null && (form.targetPercent as any) !== "" && Number(form.targetPercent) <= 0) return true;
    }

    if (form.instrumentType === "FUTURE") {
      if (!form.tradeToken || !form.tradeSymbol) return true;
      if (!form.tradeLots || Number(form.tradeLots) < 1) return true;
    } else if (form.instrumentType === "OPTION") {
      if (!form.tradeExpiry) return true;
      if (currentStrategyType !== "HIGH_LOW_BREAKOUT_REVERSAL") {
        if (!form.tradeStrike) return true;
        if (!form.tradeOptionType) return true;
        if (!form.tradeToken || !form.tradeSymbol) return true;
      }
      if (!form.tradeLots || Number(form.tradeLots) < 1) return true;
    } else {
      return true;
    }

    return false;
  })();

  const createMutation = useCreateStrategy();
  const updateMutation = useUpdateStrategy();

  // Prefill form values in edit mode once strategy is loaded
  useEffect(() => {
    if (isEditMode && existingStrategy && !hasPrefilled) {
      const isOpt = existingStrategy.instrumentType === "OPTION";
      let parsedExpiry = "";
      let parsedStrike = "";
      let parsedOptionType: "CE" | "PE" = "CE";
      let parsedLots = 1;

      const lotSize = existingStrategy.symbol === "BANKNIFTY" ? 15 : existingStrategy.symbol === "NIFTY" ? 65 : 1;
      parsedLots = Math.round(existingStrategy.trade.quantity / lotSize);
      if (parsedLots < 1) parsedLots = 1;

      if (isOpt && existingStrategy.trade.symbol) {
        const tradeSymbol = existingStrategy.trade.symbol;
        parsedOptionType = tradeSymbol.endsWith("PE") ? "PE" : "CE";
        const symbolWithoutType = tradeSymbol.slice(0, -2);
        const match = symbolWithoutType.match(/^(NIFTY|BANKNIFTY)(.*?)(\d+)$/);
        if (match) {
          parsedExpiry = match[2] || "";
          parsedStrike = match[3] || "";
        }
      }

      const prefilledForm: StrategyFormValues = {
        name: existingStrategy.name,
        symbol: existingStrategy.symbol as "NIFTY" | "BANKNIFTY",
        instrumentType: existingStrategy.instrumentType,
        mode: existingStrategy.mode,
        ruleType: existingStrategy.rules.type,
        triggerPrice: existingStrategy.rules.triggerPrice || 0,
        tradeSide: existingStrategy.trade.side,
        tradeQuantity: existingStrategy.trade.quantity,
        tradeToken: existingStrategy.trade.token || "",
        tradeSymbol: existingStrategy.trade.symbol || "",
        tradeExpiry: parsedExpiry,
        maxTradesPerDay: existingStrategy.risk?.maxTradesPerDay ?? 1,
        stopLossPercent: existingStrategy.risk?.stopLossPercent ?? undefined,
        targetPercent: existingStrategy.risk?.targetPercent ?? undefined,
        reEntryMode: existingStrategy.risk?.reEntryMode ?? "NO_REENTRY",
        tradeStrike: parsedStrike,
        tradeOptionType: parsedOptionType,
        tradeLots: parsedLots,
        strategyType: existingStrategy.strategyType || "PRICE_BREAKOUT",
        squareOffTime: existingStrategy.rules.squareOffTime || "15:15",
        rewardRatio: existingStrategy.risk?.rewardRatio ?? 3,
      };

      setForm(prefilledForm);
      lastSymbol.current = prefilledForm.symbol;
      lastInstrumentType.current = prefilledForm.instrumentType;
      setHasPrefilled(true);
    }
  }, [isEditMode, existingStrategy, hasPrefilled]);

  // Reset trade specific fields when symbol or instrumentType change
  useEffect(() => {
    // Skip reset during prefilling in edit mode
    if (isEditMode && !hasPrefilled) {
      lastSymbol.current = form.symbol;
      lastInstrumentType.current = form.instrumentType;
      return;
    }

    // Only reset if they actually changed from the last known value
    if (lastSymbol.current !== form.symbol || lastInstrumentType.current !== form.instrumentType) {
      setForm((prev) => ({
        ...prev,
        tradeToken: "",
        tradeSymbol: "",
        tradeExpiry: "",
        tradeStrike: "",
        tradeOptionType: "CE",
        tradeLots: 1,
        tradeQuantity: prev.symbol === "NIFTY" ? 65 : 15,
      }));
      lastSymbol.current = form.symbol;
      lastInstrumentType.current = form.instrumentType;
    }
  }, [form.symbol, form.instrumentType, isEditMode, hasPrefilled]);

  // Set first expiry date as default when expiries load
  useEffect(() => {
    if (isOption && expiries.length > 0 && !form.tradeExpiry) {
      setForm((prev) => ({ ...prev, tradeExpiry: expiries[0] }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiries, isOption]);

  const setFieldValue = (field: keyof StrategyFormValues, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    setValidationError(null);

    // Basic validation before submit
    if (!form.name.trim()) {
      setValidationError("Strategy name is required");
      return;
    }

    const currentStrategyType = form.strategyType || "PRICE_BREAKOUT";

    if (currentStrategyType !== "HIGH_LOW_BREAKOUT_REVERSAL") {
      if (form.triggerPrice <= 0) {
        setValidationError("Trigger price must be greater than 0");
        return;
      }
    }

    if (form.maxTradesPerDay === undefined || form.maxTradesPerDay === null || (form.maxTradesPerDay as any) === "" || Number(form.maxTradesPerDay) < 1) {
      setValidationError("Max trades per day must be at least 1");
      return;
    }
    if (!form.reEntryMode) {
      setValidationError("Re-entry mode is required");
      return;
    }

    if (currentStrategyType !== "HIGH_LOW_BREAKOUT_REVERSAL") {
      // Stop Loss / Target validation
      if (form.stopLossPercent !== undefined && form.stopLossPercent !== null && (form.stopLossPercent as any) !== "" && Number(form.stopLossPercent) <= 0) {
        setValidationError("Stop loss percent must be greater than 0 if filled");
        return;
      }
      if (form.targetPercent !== undefined && form.targetPercent !== null && (form.targetPercent as any) !== "" && Number(form.targetPercent) <= 0) {
        setValidationError("Target percent must be greater than 0 if filled");
        return;
      }
    }

    if (form.instrumentType === "OPTION") {
      if (!form.tradeExpiry) {
        setValidationError("Option expiry is required");
        return;
      }
      if (currentStrategyType !== "HIGH_LOW_BREAKOUT_REVERSAL") {
        if (!form.tradeStrike) {
          setValidationError("Strike price is required");
          return;
        }
        if (!form.tradeOptionType) {
          setValidationError("Option type is required");
          return;
        }
        if (!form.tradeToken || !form.tradeSymbol) {
          setValidationError("Option contract token is required");
          return;
        }
      }
      if (!form.tradeLots || Number(form.tradeLots) < 1) {
        setValidationError("Lots must be greater than or equal to 1");
        return;
      }
    } else if (form.instrumentType === "FUTURE") {
      if (!form.tradeToken || !form.tradeSymbol) {
        setValidationError("Future contract is required");
        return;
      }
      if (!form.tradeLots || Number(form.tradeLots) < 1) {
        setValidationError("Lots must be greater than or equal to 1");
        return;
      }
    } else {
      setValidationError("Invalid instrument type selected");
      return;
    }

    const lotSize = form.symbol === "BANKNIFTY" ? 15 : form.symbol === "NIFTY" ? 65 : 1;
    const futureContract = futures.find((f) => f.token === form.tradeToken);
    const resolvedLotSize = form.instrumentType === "FUTURE" && futureContract ? futureContract.lotSize : lotSize;
    const quantity = (form.tradeLots || 0) * resolvedLotSize;

    const config = getStrategyTypeConfig(currentStrategyType);
    const rules = config?.buildRulesPayload ? config.buildRulesPayload(form) : {};

    const tradePayload = currentStrategyType === "HIGH_LOW_BREAKOUT_REVERSAL"
      ? {
          instrumentType: "OPTION",
          token: "",
          symbol: "",
          exchangeType: 2,
          exchange: "NFO",
          side: "BUY",
          quantity: quantity,
          expiry: form.tradeExpiry,
        }
      : {
          instrumentType: form.instrumentType,
          token: form.tradeToken,
          symbol: form.tradeSymbol,
          exchangeType: 2, // NFO exchangeType
          exchange: "NFO",
          side: form.tradeSide,
          quantity: quantity,
        };

    const riskPayload = currentStrategyType === "HIGH_LOW_BREAKOUT_REVERSAL"
      ? {
          rewardRatio: Number(form.rewardRatio ?? 3),
          maxTradesPerDay: Number(form.maxTradesPerDay),
          reEntryMode: form.reEntryMode,
        }
      : {
          maxTradesPerDay: Number(form.maxTradesPerDay),
          stopLossPercent: form.stopLossPercent ? Number(form.stopLossPercent) : undefined,
          targetPercent: form.targetPercent ? Number(form.targetPercent) : undefined,
          reEntryMode: form.reEntryMode,
        };

    const body: any = {
      brokerAccountId,
      name: form.name,
      symbol: form.symbol,
      strategyType: currentStrategyType,
      instrumentType: form.instrumentType,
      mode: "PAPER",
      rules,
      trade: tradePayload,
      risk: riskPayload,
    };

    try {
      if (isEditMode) {
        await updateMutation.mutateAsync({ id: id!, data: body });
        navigate(`/dashboard/strategies/${id}`);
      } else {
        const response = await createMutation.mutateAsync(body);
        if (response && response.id) {
          navigate(`/dashboard/strategies/${response.id}`);
        } else {
          navigate("/dashboard/strategies");
        }
      }
    } catch (err: any) {
      const serverMessage = err?.response?.data?.error?.message || err?.response?.data?.message;
      setValidationError(serverMessage || err?.message || `Failed to ${isEditMode ? "update" : "create"} strategy`);
    }
  };

  return {
    form,
    setFieldValue,
    activeAccount,
    isAccountsLoading: isAccountsLoading || (isEditMode && isStrategyLoading),
    futures,
    isFuturesLoading,
    expiries,
    isExpiriesLoading,
    optionChain,
    isOptionChainLoading,
    handleCreate,
    isCreating: createMutation.isPending || updateMutation.isPending,
    validationError,
    setValidationError,
    isEditMode,
    underlyingLtp,
    triggerPriceWarning,
    isSubmitDisabled,
  };
};
