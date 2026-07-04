import React, { useState, useEffect } from "react";
import { PaperPosition } from "../../../../services/paper-trading/PaperTradingService";
import { useExitPaperPosition } from "../../../../services/paper-trading/PaperTradingQueries";
import { Button } from "../../../../components/ui/Button";
import { Input } from "../../../../components/ui/Input";
import { X, AlertCircle } from "lucide-react";

interface ExitPositionDialogProps {
  position: PaperPosition | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ExitPositionDialog: React.FC<ExitPositionDialogProps> = ({
  position,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [exitPrice, setExitPrice] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const exitMutation = useExitPaperPosition();

  useEffect(() => {
    if (position) {
      setErrorMsg(null);
      // Pre-fill with LTP if available, else empty string so they can type it
      if (position.ltp !== null && position.ltp !== undefined && position.ltp > 0) {
        setExitPrice(position.ltp.toString());
      } else {
        setExitPrice(position.avgPrice.toString()); // Fallback to avg price if LTP is missing
      }
    }
  }, [position, isOpen]);

  if (!isOpen || !position) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const priceNum = parseFloat(exitPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setErrorMsg("Please enter a valid positive price.");
      return;
    }

    try {
      await exitMutation.mutateAsync({
        id: position.id,
        price: priceNum,
      });
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to exit position";
      setErrorMsg(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Dialog container */}
      <div className="relative w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-4">
          <h3 className="text-lg font-bold text-slate-100">Exit Paper Position</h3>
          <button 
            onClick={onClose} 
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error alert */}
        {errorMsg && (
          <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Symbol</label>
              <div className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
                {position.symbol}
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Instrument Type</label>
              <div className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-300">
                {position.instrumentType}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Quantity</label>
              <div className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-slate-300">
                {position.quantity}
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Avg Price</label>
              <div className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
                ₹{position.avgPrice.toFixed(2)}
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Current LTP</label>
              <div className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-slate-300">
                {position.ltp ? `₹${position.ltp.toFixed(2)}` : "N/A"}
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="exitPrice" className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Exit Price (INR)
            </label>
            <Input
              id="exitPrice"
              type="number"
              step="0.05"
              value={exitPrice}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExitPrice(e.target.value)}
              className="w-full font-mono text-slate-100 font-bold bg-slate-950 border-slate-800 focus:border-blue-500"
              placeholder="Enter exit price"
              required
            />
            {position.ltp === null && (
              <p className="text-[10px] text-amber-500 mt-1">
                LTP was not available. Adjusted to average price; please confirm or edit.
              </p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end items-center gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={exitMutation.isPending}
              className="px-4 py-2 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              loading={exitMutation.isPending}
              className="px-4 py-2 text-xs font-bold !bg-gradient-to-r !from-rose-600 !to-red-600 hover:!from-rose-500 hover:!to-red-500 border-none shadow-md shadow-rose-950/20"
            >
              Confirm Exit
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
