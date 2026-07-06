import React, { useState, useEffect } from "react";
import { useCreatePaperOrder } from "../../../services/paper-trading/PaperTradingQueries";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Plus, Minus, Check, AlertCircle } from "lucide-react";

export interface PaperTradeButtonsProps {
  brokerAccountId?: string;
  instrumentType: "FUTURE" | "OPTION" | "EQUITY";
  token: string;
  symbol: string;
  exchangeType: number;
  exchange: string;
  lotSize?: number;
  price?: number | null;
  defaultQuantity?: number;
  compact?: boolean;
}

export const PaperTradeButtons: React.FC<PaperTradeButtonsProps> = ({
  brokerAccountId,
  instrumentType,
  token,
  symbol,
  exchangeType,
  exchange,
  lotSize = 1,
  price,
  defaultQuantity,
  compact = false,
}) => {
  const initialQty = defaultQuantity || lotSize || 1;
  const [quantity, setQuantity] = useState<number>(initialQty);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const createOrderMutation = useCreatePaperOrder();

  // Reset quantity if defaults change
  useEffect(() => {
    setQuantity(initialQty);
  }, [initialQty]);

  // Auto-dismiss status message after 3 seconds
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => {
        setStatusMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  const handleOrder = async (side: "BUY" | "SELL") => {
    if (price === undefined || price === null || isNaN(price)) {
      setStatusMessage({ text: "Live price not available", isError: true });
      return;
    }

    try {
      await createOrderMutation.mutateAsync({
        brokerAccountId,
        instrumentType,
        token,
        symbol,
        exchangeType,
        exchange,
        side,
        quantity,
        price,
      });
      setStatusMessage({
        text: `Paper ${side} Order Filled: ${quantity} x ₹${price.toFixed(2)}`,
        isError: false,
      });
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || "Order failed";
      setStatusMessage({ text: errMsg, isError: true });
    }
  };

  const incrementQty = () => {
    setQuantity((prev) => prev + lotSize);
  };

  const decrementQty = () => {
    setQuantity((prev) => Math.max(lotSize, prev - lotSize));
  };

  const isPriceInvalid = price === undefined || price === null || isNaN(price) || price <= 0;

  if (compact) {
    return (
      <div className="relative flex flex-col items-center gap-1 group/trade">
        {/* Compact buttons: tiny B / S */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleOrder("BUY")}
            disabled={isPriceInvalid || createOrderMutation.isPending}
            className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white transition-all cursor-pointer shadow shadow-emerald-900/20"
            title={isPriceInvalid ? "Live price not available" : `Paper Buy (Qty: ${quantity})`}
          >
            B
          </button>
          <button
            onClick={() => handleOrder("SELL")}
            disabled={isPriceInvalid || createOrderMutation.isPending}
            className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-500 text-white transition-all cursor-pointer shadow shadow-rose-900/20"
            title={isPriceInvalid ? "Live price not available" : `Paper Sell (Qty: ${quantity})`}
          >
            S
          </button>
        </div>

        {/* Small quantity badge/editor on hover or small indicator */}
        <div className="text-[9px] text-slate-500 font-semibold font-mono flex items-center gap-1">
          <span className="text-[8px] bg-slate-800 text-slate-400 px-1 rounded uppercase tracking-wider select-none font-bold">Paper</span>
          <span>Q: {quantity}</span>
        </div>

        {/* Temporary floating notification near the cell */}
        {statusMessage && (
          <div className="absolute z-50 bottom-full mb-1 left-1/2 transform -translate-x-1/2 min-w-[160px] max-w-[200px] p-2 rounded-lg border text-center shadow-lg backdrop-blur-md text-[10px] leading-tight animate-in fade-in slide-in-from-bottom-2 duration-200 bg-slate-900 border-slate-800">
            <div className="flex items-center gap-1.5 justify-center">
              {statusMessage.isError ? (
                <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
              ) : (
                <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              )}
              <span className={statusMessage.isError ? "text-rose-400 font-medium" : "text-emerald-400 font-medium"}>
                {statusMessage.text}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-2 bg-slate-900/60 border border-slate-800/80 p-2 rounded-lg backdrop-blur-sm">
      {/* Quantity Selector */}
      <div className="flex items-center gap-1">
        <button
          onClick={decrementQty}
          disabled={quantity <= lotSize}
          className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        
        <input
          type="number"
          value={quantity}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val) && val > 0) {
              // Snap to nearest multiple of lotSize
              const remainder = val % lotSize;
              if (remainder === 0) {
                setQuantity(val);
              } else {
                setQuantity(val - remainder);
              }
            }
          }}
          className="w-16 text-center text-xs font-bold font-mono bg-slate-950 border border-slate-800 text-slate-100 rounded focus:outline-none focus:border-blue-500/80 py-1"
        />

        <button
          onClick={incrementQty}
          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Buy & Sell Buttons */}
      <div className="flex items-center gap-1.5">
        <Button
          onClick={() => handleOrder("BUY")}
          disabled={isPriceInvalid || createOrderMutation.isPending}
          variant="primary"
          className="!bg-gradient-to-r !from-emerald-600 !to-teal-600 hover:!from-emerald-500 hover:!to-teal-500 !text-white border-none py-1 px-3 text-xs font-bold !shadow-md !shadow-emerald-950/20"
        >
          Buy / Long
        </Button>
        <Button
          onClick={() => handleOrder("SELL")}
          disabled={isPriceInvalid || createOrderMutation.isPending}
          variant="danger"
          className="!bg-gradient-to-r !from-rose-600 !to-red-600 hover:!from-rose-500 hover:!to-red-500 !text-white border-none py-1 px-3 text-xs font-bold !shadow-md !shadow-rose-950/20"
        >
          Sell / Short
        </Button>
      </div>

      {/* Error / Success Toast Overlay locally */}
      {statusMessage && (
        <div className="absolute z-50 left-0 right-0 bottom-full mb-2 p-2 rounded-lg border text-center shadow-xl backdrop-blur-md text-xs leading-normal animate-in fade-in slide-in-from-bottom-2 duration-200 bg-slate-950 border-slate-800">
          <div className="flex items-center gap-2 justify-center">
            {statusMessage.isError ? (
              <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
            ) : (
              <Check className="h-4 w-4 text-emerald-500 shrink-0" />
            )}
            <span className={statusMessage.isError ? "text-rose-400 font-semibold" : "text-emerald-400 font-semibold"}>
              {statusMessage.text}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
