import React from "react";
import { cn } from "../../utils/cn";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  className,
  hoverable = false,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        "bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl p-5 shadow-xl transition-all duration-300",
        hoverable && "hover:border-slate-700 hover:shadow-2xl hover:shadow-blue-500/5 hover:-translate-y-0.5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
