import React, { useEffect, useRef } from "react";
import { createChart, ColorType, CandlestickSeries, IChartApi, ISeriesApi, UTCTimestamp } from "lightweight-charts";
import { Spinner } from "../ui/Spinner";
import { formatISTTime, formatISTDateTime } from "../../utils/date/marketTime";

export type Candle = {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
};

interface CandleChartProps {
  candles: Candle[];
  height?: number;
  isLoading?: boolean;
  emptyMessage?: string;
}

export const CandleChart: React.FC<CandleChartProps> = ({
  candles,
  height = 300,
  isLoading = false,
  emptyMessage = "No candle data available yet",
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart instances
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#94a3b8", // slate-400
        fontSize: 11,
        fontFamily: "Inter, system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(51, 65, 85, 0.2)" }, // slate-700 w/ opacity
        horzLines: { color: "rgba(51, 65, 85, 0.2)" },
      },
      rightPriceScale: {
        borderColor: "rgba(51, 65, 85, 0.4)",
        borderVisible: true,
      },
      timeScale: {
        borderColor: "rgba(51, 65, 85, 0.4)",
        borderVisible: true,
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time: any) => {
          if (typeof time === "number") {
            return formatISTTime(time);
          }
          return String(time);
        },
      },
      crosshair: {
        mode: 0, // normal
        vertLine: {
          color: "rgba(148, 163, 184, 0.3)", // slate-400
          style: 1, // Dotted
        },
        horzLine: {
          color: "rgba(148, 163, 184, 0.3)",
          style: 1,
        },
      },
      localization: {
        timeFormatter: (time: any) => {
          if (typeof time === "number") {
            return formatISTDateTime(time);
          }
          return String(time);
        },
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981", // emerald-500
      downColor: "#ef4444", // red-500
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    // Set initial data
    if (candles.length > 0) {
      const formattedData = candles.map((c) => ({
        time: (typeof c.time === "string" ? Math.floor(new Date(c.time).getTime() / 1000) : c.time) as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
      series.setData(formattedData);
      chart.timeScale().fitContent();
    }

    // Set up ResizeObserver to handle width changes dynamically
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const entry = entries[0];
      if (entry) {
        const { width } = entry.contentRect;
        chart.resize(width, height);
      }
    });

    resizeObserver.observe(chartContainerRef.current);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [height]);

  // Update data dynamically on candles updates
  useEffect(() => {
    if (seriesRef.current && chartRef.current) {
      const formattedData = candles.map((c) => ({
        time: (typeof c.time === "string" ? Math.floor(new Date(c.time).getTime() / 1000) : c.time) as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
      seriesRef.current.setData(formattedData);
      if (candles.length > 0) {
        chartRef.current.timeScale().fitContent();
      }
    }
  }, [candles]);

  if (isLoading) {
    return (
      <div
        style={{ height }}
        className="flex flex-col items-center justify-center border border-slate-800 rounded-xl bg-slate-950/20"
      >
        <Spinner size="md" />
        <span className="mt-2 text-xs text-slate-400">Loading candles...</span>
      </div>
    );
  }

  if (candles.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center border border-slate-800 rounded-xl bg-slate-950/20 text-slate-500 text-xs"
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="relative w-full border border-slate-800 rounded-xl bg-slate-950/20 p-2">
      <div ref={chartContainerRef} className="w-full" style={{ height }} />
    </div>
  );
};
