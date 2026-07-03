import React from "react";
import { cn } from "../../utils/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "warning" | "danger" | "info" | "neutral";
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "neutral",
  children,
  ...props
}) => {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide border transition-all duration-150",
        {
          "bg-emerald-500/10 text-emerald-400 border-emerald-500/20": variant === "success",
          "bg-amber-500/10 text-amber-400 border-amber-500/20": variant === "warning",
          "bg-rose-500/10 text-rose-400 border-rose-500/20": variant === "danger",
          "bg-blue-500/10 text-blue-400 border-blue-500/20": variant === "info",
          "bg-slate-700/30 text-slate-400 border-slate-700/50": variant === "neutral",
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
