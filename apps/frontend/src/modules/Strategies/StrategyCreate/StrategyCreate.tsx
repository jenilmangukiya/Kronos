import React from "react";
import { Link, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, ShieldAlert, Info } from "lucide-react";
import { useStrategyCreate } from "./useStrategyCreate";
import { StrategyBasicForm } from "./components/StrategyBasicForm";
import { StrategyRuleForm } from "./components/StrategyRuleForm";
import { StrategyTradeForm } from "./components/StrategyTradeForm";
import { StrategyRiskForm } from "./components/StrategyRiskForm";
import { StrategyJsonPreview } from "../StrategyDetails/components/StrategyJsonPreview";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Spinner } from "../../../components/ui/Spinner";
import { UNDERLYING_TOKENS } from "./constants";

export const StrategyCreate: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const {
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
    isCreating,
    validationError,
    isEditMode,
    underlyingLtp,
    triggerPriceWarning,
    isSubmitDisabled,
  } = useStrategyCreate();

  if (isAccountsLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  // If no active session, restrict access
  if (!activeAccount) {
    return (
      <div className="max-w-2xl mx-auto mt-12 space-y-6">
        <Card className="border-slate-800 bg-slate-900/40 p-8 text-center shadow-2xl">
          <ShieldAlert className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-100">No Active Broker Session</h2>
          <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto leading-relaxed">
            No active broker session found. Please connect Angel and create a session first.
          </p>
          <div className="mt-6 flex justify-center">
            <Link to="/dashboard/broker">
              <Button variant="primary">
                Go to Broker Setup
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const underlying = UNDERLYING_TOKENS[form.symbol];
  const lotSize = form.symbol === "BANKNIFTY" ? 15 : form.symbol === "NIFTY" ? 65 : 1;
  const quantity = form.instrumentType === "OPTION"
    ? (form.tradeLots || 0) * lotSize
    : Number(form.tradeQuantity);

  const previewStrategy = {
    id: id || "preview",
    userId: "preview",
    name: form.name || "Preview Strategy",
    symbol: form.symbol,
    strategyType: "PRICE_BREAKOUT",
    instrumentType: form.instrumentType,
    mode: form.mode,
    status: "STOPPED",
    rules: {
      type: form.ruleType,
      underlyingToken: underlying?.token || "",
      underlyingExchangeType: underlying?.exchangeType || 2,
      triggerPrice: Number(form.triggerPrice),
    },
    trade: {
      instrumentType: form.instrumentType,
      token: form.tradeToken,
      symbol: form.tradeSymbol,
      exchangeType: 2,
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link
          to={isEditMode ? `/dashboard/strategies/${id}` : "/dashboard/strategies"}
          className="text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {isEditMode ? "Edit Strategy" : "Create Strategy"}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {isEditMode
              ? "Update systematic rules for automated paper-trading executions."
              : "Build systematic rules for automated paper-trading executions."}
          </p>
        </div>
      </div>

      {/* Info Banner for Strategy Runner */}
      <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm p-4 rounded-xl flex items-start gap-3 shadow-lg shadow-blue-500/5">
        <Info className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-blue-300">System Information</p>
          <p className="mt-0.5 text-xs text-slate-300">
            Strategy create/start/stop is ready. Auto execution will start after Strategy Runner backend is added.
          </p>
        </div>
      </div>

      {/* Validation Errors */}
      {validationError && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Invalid Parameters</p>
            <p className="mt-0.5 text-xs">{validationError}</p>
          </div>
        </div>
      )}

      {/* Form Content Cards */}
      <Card className="border-slate-800 bg-slate-900/40 p-6 space-y-8">
        <StrategyBasicForm form={form} onChange={setFieldValue} />

        <StrategyRuleForm
          form={form}
          onChange={setFieldValue}
          underlyingLtp={underlyingLtp}
          triggerPriceWarning={triggerPriceWarning}
        />

        <StrategyTradeForm
          form={form}
          onChange={setFieldValue}
          futures={futures}
          isFuturesLoading={isFuturesLoading}
          expiries={expiries}
          isExpiriesLoading={isExpiriesLoading}
          optionChain={optionChain}
          isOptionChainLoading={isOptionChainLoading}
        />

        <StrategyRiskForm form={form} onChange={setFieldValue} />

        {/* Form Controls */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
          <Link to={isEditMode ? `/dashboard/strategies/${id}` : "/dashboard/strategies"}>
            <Button variant="outline" disabled={isCreating}>
              Cancel
            </Button>
          </Link>
          <Button
            variant="primary"
            loading={isCreating}
            onClick={handleCreate}
            disabled={isSubmitDisabled}
          >
            {isEditMode ? "Update Strategy" : "Create Strategy"}
          </Button>
        </div>
      </Card>

      {/* Config Preview */}
      <StrategyJsonPreview strategy={previewStrategy as any} />
    </div>
  );
};
