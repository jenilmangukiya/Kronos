import { useMutation, useQuery, useQueryClient, UseMutationOptions, UseQueryOptions } from "@tanstack/react-query";
import { AxiosError } from "axios";
import {
  createPaperOrder,
  getPaperOrders,
  getPaperPositions,
  exitPaperPosition,
  CreatePaperOrderRequest,
  PaperOrder,
  PaperPosition,
} from "./PaperTradingService";

export const useCreatePaperOrder = (
  options?: UseMutationOptions<PaperOrder, AxiosError, CreatePaperOrderRequest>
) => {
  const queryClient = useQueryClient();
  return useMutation<PaperOrder, AxiosError, CreatePaperOrderRequest>({
    mutationFn: createPaperOrder,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["paper-trading", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["paper-trading", "positions"] });
      if (options?.onSuccess) {
        (options.onSuccess as any)(data, variables, context);
      }
    },
    ...options,
  });
};

export const useGetPaperOrders = (
  options?: Partial<UseQueryOptions<PaperOrder[], AxiosError>>
) =>
  useQuery<PaperOrder[], AxiosError>({
    queryKey: ["paper-trading", "orders"],
    queryFn: getPaperOrders,
    ...options,
  });

export const useGetPaperPositions = (
  options?: Partial<UseQueryOptions<PaperPosition[], AxiosError>>
) =>
  useQuery<PaperPosition[], AxiosError>({
    queryKey: ["paper-trading", "positions"],
    queryFn: getPaperPositions,
    ...options,
  });

export const useExitPaperPosition = (
  options?: UseMutationOptions<PaperPosition, AxiosError, { id: string; price: number }>
) => {
  const queryClient = useQueryClient();
  return useMutation<PaperPosition, AxiosError, { id: string; price: number }>({
    mutationFn: exitPaperPosition,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["paper-trading", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["paper-trading", "positions"] });
      if (options?.onSuccess) {
        (options.onSuccess as any)(data, variables, context);
      }
    },
    ...options,
  });
};
