import React, { useEffect, useRef } from "react";
import { createChart, ColorType, CandlestickSeries, IChartApi, ISeriesApi, UTCTimestamp, LineStyle, IPriceLine, createSeriesMarkers } from "lightweight-charts";
import { Spinner } from "../ui/Spinner";
import { formatISTTime, formatISTDateTime } from "../../utils/date/marketTime";

export type Candle = {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type ChartMarker = {
  time: string | number;
  position: "aboveBar" | "belowBar" | "inBar";
  shape: "arrowUp" | "arrowDown" | "circle" | "square";
  text: string;
  color?: string;
};

export type PriceLine = {
  price: number;
  title: string;
  color?: string;
};

interface CandleChartProps {
  candles: Candle[];
  height?: number;
  isLoading?: boolean;
  emptyMessage?: string;
  markers?: ChartMarker[];
  priceLines?: PriceLine[];
}

export const CandleChart: React.FC<CandleChartProps> = ({
  candles,
  height = 300,
  isLoading = false,
  emptyMessage = "No candle data available yet",
  markers = [],
  priceLines = [],
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const isInitialFitRef = useRef(false);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const initialWidth = container.clientWidth || 600;


    // Create chart instances
    const chart = createChart(container, {
      width: initialWidth,
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
        tickMarkFormatter: (time: unknown) => {
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
        timeFormatter: (time: unknown) => {
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
      isInitialFitRef.current = true;
    }

    // Set up ResizeObserver to handle width changes dynamically
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const entry = entries[0];
      if (entry) {
        const { width: contentWidth } = entry.contentRect;
        const actualWidth = container.clientWidth || contentWidth || 600;

        if (actualWidth > 0) {
          chart.resize(actualWidth, height);
        }
      }
    });

    resizeObserver.observe(container);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      priceLinesRef.current = [];
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      isInitialFitRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height]);

  // Update data dynamically on candles updates
  useEffect(() => {
    if (seriesRef.current && chartRef.current) {
      if (candles.length === 0) {
        isInitialFitRef.current = false;
        seriesRef.current.setData([]);
        return;
      }
      const formattedData = candles.map((c) => ({
        time: (typeof c.time === "string" ? Math.floor(new Date(c.time).getTime() / 1000) : c.time) as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
      seriesRef.current.setData(formattedData);
      if (candles.length > 0 && !isInitialFitRef.current) {
        chartRef.current.timeScale().fitContent();
        isInitialFitRef.current = true;
      }
    }
  }, [candles]);

  // Update markers when markers prop changes
  useEffect(() => {
    if (!seriesRef.current) return;
    if (markers && markers.length > 0) {
      const formattedMarkers = markers.map((m) => ({
        time: (typeof m.time === "string" ? Math.floor(new Date(m.time).getTime() / 1000) : m.time) as UTCTimestamp,
        position: m.position,
        shape: m.shape,
        text: m.text,
        color: m.color || (m.shape === "arrowUp" ? "#10b981" : m.shape === "arrowDown" ? "#ef4444" : "#a855f7"),
      }));
      createSeriesMarkers(seriesRef.current, formattedMarkers);
    } else {
      createSeriesMarkers(seriesRef.current, []);
    }
  }, [markers, candles]);

  // Update price lines when priceLines prop changes
  useEffect(() => {
    if (!seriesRef.current) return;

    // Clear old price lines
    priceLinesRef.current.forEach((line) => {
      seriesRef.current?.removePriceLine(line);
    });
    priceLinesRef.current = [];

    // Create new price lines
    if (priceLines && priceLines.length > 0) {
      priceLines.forEach((pl) => {
        const line = seriesRef.current?.createPriceLine({
          price: pl.price,
          color: pl.color || "rgba(148, 163, 184, 0.8)", // default slate-400 w/ opacity
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: pl.title,
        });
        if (line) {
          priceLinesRef.current.push(line);
        }
      });
    }
  }, [priceLines, candles]);

  return (
    <div className="relative w-full border border-slate-800 rounded-xl bg-slate-950/20 p-2">
      <div ref={chartContainerRef} className="w-full" style={{ height }} />

      {/* Loading Overlay */}
      {isLoading && (
        <div
          style={{ height }}
          className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 rounded-xl z-10"
        >
          <Spinner size="md" />
          <span className="mt-2 text-xs text-slate-400">Loading candles...</span>
        </div>
      )}

      {/* Empty State Overlay */}
      {!isLoading && candles.length === 0 && (
        <div
          style={{ height }}
          className="absolute inset-0 flex items-center justify-center bg-slate-950/80 rounded-xl text-slate-500 text-xs z-10"
        >
          {emptyMessage}
        </div>
      )}
    </div>
  );
};
