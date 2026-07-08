import { useEffect, useState } from "react";
import { realtimeClient } from "./realtimeClient";
import { ServerRealtimeMessage } from "./realtime.types";

export function useStrategyRealtime(strategyId: string | undefined) {
  const [runtimeStatus, setRuntimeStatus] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(realtimeClient.isConnected());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!strategyId) return;

    const updateConnectionState = () => {
      setIsConnected(realtimeClient.isConnected());
    };

    const handleMessage = (message: ServerRealtimeMessage) => {
      if (message.type === "strategy_runtime_status" && message.strategyId === strategyId) {
        setRuntimeStatus(message.data);
        setError(null);
      } else if (message.type === "strategy_runtime_status_error" && message.strategyId === strategyId) {
        setError(message.message);
      } else if (message.type === "error") {
        setError(message.message);
      }
    };

    realtimeClient.subscribe(handleMessage);
    realtimeClient.subscribeStrategy(strategyId);

    const interval = setInterval(updateConnectionState, 1000);

    // Initial check
    updateConnectionState();

    return () => {
      clearInterval(interval);
      realtimeClient.unsubscribeStrategy(strategyId);
      realtimeClient.unsubscribe(handleMessage);
    };
  }, [strategyId]);

  return {
    runtimeStatus,
    isConnected,
    error,
  };
}
