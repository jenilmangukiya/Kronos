import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useBrokerAccounts } from "../../../services/broker/BrokerQueries";
import {
  useGetPaperOrders,
  useGetPaperPositions,
} from "../../../services/paper-trading/PaperTradingQueries";
import { PaperPosition } from "../../../services/paper-trading/PaperTradingService";
import { DashboardSummary } from "./types";

export const usePaperTradingDashboard = () => {
  const queryClient = useQueryClient();
  const { data: accounts, isLoading: isLoadingAccounts } = useBrokerAccounts();

  const activeAccount = useMemo(() => {
    return accounts?.find((acct) => acct.hasSession && !acct.sessionExpired) || null;
  }, [accounts]);

  const {
    data: orders = [],
    isLoading: isLoadingOrders,
    isRefetching: isRefetchingOrders,
    refetch: refetchOrders,
  } = useGetPaperOrders();

  const {
    data: positions = [],
    isLoading: isLoadingPositions,
    isRefetching: isRefetchingPositions,
    refetch: refetchPositions,
  } = useGetPaperPositions();

  // Exit dialog states
  const [selectedExitPosition, setSelectedExitPosition] = useState<PaperPosition | null>(null);
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);

  const handleOpenExitDialog = (position: PaperPosition) => {
    setSelectedExitPosition(position);
    setIsExitDialogOpen(true);
  };

  const handleCloseExitDialog = () => {
    setSelectedExitPosition(null);
    setIsExitDialogOpen(false);
  };

  const refresh = async () => {
    await Promise.all([
      refetchPositions(),
      refetchOrders(),
    ]);
  };

  const summary = useMemo((): DashboardSummary => {
    let openPositionsCount = 0;
    let closedPositionsCount = 0;
    let totalRealizedPnl = 0;
    let totalUnrealizedPnl = 0;
    let totalPnl = 0;

    positions.forEach((pos) => {
      if (pos.status === "OPEN") {
        openPositionsCount += 1;
      } else {
        closedPositionsCount += 1;
      }
      totalRealizedPnl += pos.realizedPnl || 0;
      totalUnrealizedPnl += pos.unrealizedPnl || 0;
      totalPnl += pos.totalPnl || 0;
    });

    return {
      openPositionsCount,
      closedPositionsCount,
      totalRealizedPnl,
      totalUnrealizedPnl,
      totalPnl,
    };
  }, [positions]);

  const isLoading = isLoadingAccounts || isLoadingOrders || isLoadingPositions;
  const isRefreshing = isRefetchingOrders || isRefetchingPositions;

  return {
    activeAccount,
    orders,
    positions,
    summary,
    isLoading,
    isRefreshing,
    refresh,
    selectedExitPosition,
    isExitDialogOpen,
    handleOpenExitDialog,
    handleCloseExitDialog,
  };
};
