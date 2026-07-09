import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useBrokerAccounts } from "../../../services/broker/BrokerQueries";
import { useCreateStrategy, useGetStrategy, useUpdateStrategy } from "../../../services/strategies/StrategyQueries";
import { useGetFutures, useOptionExpiries, useOptionChainQuery } from "../../../services/market-data/MarketDataQueries";
import { UNDERLYING_TOKENS } from "./constants";
import { StrategyFormValues } from "./types";
import { CreateStrategyRequest } from "../../../services/strategies/StrategyService";

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
    { enabled: Boolean(brokerAccountId && isOption && form.tradeExpiry) }
  );

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

      if (isOpt && existingStrategy.trade.symbol) {
        const tradeSymbol = existingStrategy.trade.symbol;
        parsedOptionType = tradeSymbol.endsWith("PE") ? "PE" : "CE";
        const symbolWithoutType = tradeSymbol.slice(0, -2);
        const match = symbolWithoutType.match(/^(NIFTY|BANKNIFTY)(.*?)(\d+)$/);
        if (match) {
          parsedExpiry = match[2] || "";
          parsedStrike = match[3] || "";
        }
        parsedLots = Math.round(existingStrategy.trade.quantity / lotSize);
      }

      const prefilledForm: StrategyFormValues = {
        name: existingStrategy.name,
        symbol: existingStrategy.symbol as "NIFTY" | "BANKNIFTY",
        instrumentType: existingStrategy.instrumentType,
        mode: existingStrategy.mode,
        ruleType: existingStrategy.rules.type,
        triggerPrice: existingStrategy.rules.triggerPrice,
        tradeSide: existingStrategy.trade.side,
        tradeQuantity: existingStrategy.trade.quantity,
        tradeToken: existingStrategy.trade.token,
        tradeSymbol: existingStrategy.trade.symbol,
        tradeExpiry: parsedExpiry,
        maxTradesPerDay: existingStrategy.risk?.maxTradesPerDay ?? 1,
        stopLossPercent: existingStrategy.risk?.stopLossPercent ?? undefined,
        targetPercent: existingStrategy.risk?.targetPercent ?? undefined,
        reEntryMode: existingStrategy.risk?.reEntryMode ?? "NO_REENTRY",
        tradeStrike: parsedStrike,
        tradeOptionType: parsedOptionType,
        tradeLots: parsedLots,
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

    // Stop Loss / Target validation
    if (form.stopLossPercent !== undefined && Number(form.stopLossPercent) <= 0) {
      setValidationError("Stop loss percent must be greater than 0");
      return;
    }
    if (form.targetPercent !== undefined && Number(form.targetPercent) <= 0) {
      setValidationError("Target percent must be greater than 0");
      return;
    }

    if (form.instrumentType === "OPTION") {
      if (!form.tradeExpiry) {
        setValidationError("Option expiry is required");
        return;
      }
      if (!form.tradeStrike) {
        setValidationError("Strike price is required");
        return;
      }
      if (!form.tradeOptionType) {
        setValidationError("Option type is required");
        return;
      }
      if (!form.tradeLots || form.tradeLots <= 0) {
        setValidationError("Lots must be greater than 0");
        return;
      }
      if (!form.tradeToken || !form.tradeSymbol) {
        setValidationError("No option contract found for selected expiry/strike/type.");
        return;
      }
    } else {
      if (!form.tradeToken || !form.tradeSymbol) {
        setValidationError("Please select a contract or trade asset for execution");
        return;
      }
      if (form.tradeQuantity <= 0) {
        setValidationError("Trade quantity must be greater than 0");
        return;
      }
    }

    const underlying = UNDERLYING_TOKENS[form.symbol];
    const lotSize = form.symbol === "BANKNIFTY" ? 15 : form.symbol === "NIFTY" ? 65 : 1;
    const quantity = form.instrumentType === "OPTION"
      ? (form.tradeLots || 0) * lotSize
      : Number(form.tradeQuantity);

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
        quantity: quantity,
      },
      risk: {
        maxTradesPerDay: Number(form.maxTradesPerDay),
        stopLossPercent: form.stopLossPercent ? Number(form.stopLossPercent) : undefined,
        targetPercent: form.targetPercent ? Number(form.targetPercent) : undefined,
        reEntryMode: form.reEntryMode,
      },
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
      setValidationError(err?.response?.data?.message || err?.message || `Failed to ${isEditMode ? "update" : "create"} strategy`);
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
  };
};
