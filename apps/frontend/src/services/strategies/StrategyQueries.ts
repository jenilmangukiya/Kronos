import { UseMutationOptions, useMutation, useQuery, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
import { AxiosError } from "axios";
import {
  getStrategies,
  getStrategyById,
  createStrategy,
  updateStrategy,
  startStrategy,
  stopStrategy,
  stopAndExitStrategy,
  resetStrategy,
  duplicateStrategy,
  getStrategyLogs,
  getStrategyRuntimeStatus,
  Strategy,
  CreateStrategyRequest,
  StrategyLog,
  StrategyRuntimeStatus,
} from "./StrategyService";

export const useGetStrategies = (
  options?: Partial<UseQueryOptions<Strategy[], AxiosError>>
) =>
  useQuery<Strategy[], AxiosError>({
    queryKey: ["strategies"],
    queryFn: getStrategies,
    ...options,
  });

export const useGetStrategy = (
  id: string,
  options?: Partial<UseQueryOptions<Strategy, AxiosError>>
) =>
  useQuery<Strategy, AxiosError>({
    queryKey: ["strategies", id],
    queryFn: () => getStrategyById(id),
    enabled: Boolean(id) && (options?.enabled ?? true),
    ...options,
  });

export const useCreateStrategy = (
  options?: UseMutationOptions<Strategy, AxiosError, CreateStrategyRequest>
) => {
  const queryClient = useQueryClient();
  return useMutation<Strategy, AxiosError, CreateStrategyRequest>({
    mutationFn: createStrategy,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["strategies"] });
      if (options?.onSuccess) {
        (options.onSuccess as any)(data, variables, context);
      }
    },
    ...options,
  });
};

export const useUpdateStrategy = (
  options?: UseMutationOptions<Strategy, AxiosError, { id: string; data: Partial<CreateStrategyRequest> }>
) => {
  const queryClient = useQueryClient();
  return useMutation<Strategy, AxiosError, { id: string; data: Partial<CreateStrategyRequest> }>({
    mutationFn: updateStrategy,
    onSuccess: (data, variables, context) => {
      const { id } = variables;
      queryClient.invalidateQueries({ queryKey: ["strategies"] });
      queryClient.invalidateQueries({ queryKey: ["strategies", id] });
      queryClient.invalidateQueries({ queryKey: ["strategies", id, "logs"] });
      if (options?.onSuccess) {
        (options.onSuccess as any)(data, variables, context);
      }
    },
    ...options,
  });
};

export const useStartStrategy = (
  options?: UseMutationOptions<Strategy, AxiosError, string>
) => {
  const queryClient = useQueryClient();
  return useMutation<Strategy, AxiosError, string>({
    mutationFn: startStrategy,
    onSuccess: (data, variables, context) => {
      const id = variables;
      queryClient.invalidateQueries({ queryKey: ["strategies"] });
      queryClient.invalidateQueries({ queryKey: ["strategies", id] });
      queryClient.invalidateQueries({ queryKey: ["strategies", id, "logs"] });
      if (options?.onSuccess) {
        (options.onSuccess as any)(data, variables, context);
      }
    },
    ...options,
  });
};

export const useStopStrategy = (
  options?: UseMutationOptions<Strategy, AxiosError, string>
) => {
  const queryClient = useQueryClient();
  return useMutation<Strategy, AxiosError, string>({
    mutationFn: stopStrategy,
    onSuccess: (data, variables, context) => {
      const id = variables;
      queryClient.invalidateQueries({ queryKey: ["strategies"] });
      queryClient.invalidateQueries({ queryKey: ["strategies", id] });
      queryClient.invalidateQueries({ queryKey: ["strategies", id, "logs"] });
      if (options?.onSuccess) {
        (options.onSuccess as any)(data, variables, context);
      }
    },
    ...options,
  });
};

export const useStopAndExitStrategy = (
  options?: UseMutationOptions<{ strategy: Strategy; exitResult?: any }, AxiosError, string>
) => {
  const queryClient = useQueryClient();
  return useMutation<{ strategy: Strategy; exitResult?: any }, AxiosError, string>({
    mutationFn: stopAndExitStrategy,
    onSuccess: (data, variables, context) => {
      const id = variables;
      queryClient.invalidateQueries({ queryKey: ["strategies"] });
      queryClient.invalidateQueries({ queryKey: ["strategies", id] });
      queryClient.invalidateQueries({ queryKey: ["strategies", id, "logs"] });
      queryClient.invalidateQueries({ queryKey: ["paper-trading", "positions"] });
      queryClient.invalidateQueries({ queryKey: ["paper-trading", "orders"] });
      if (options?.onSuccess) {
        (options.onSuccess as any)(data, variables, context);
      }
    },
    ...options,
  });
};

export const useResetStrategy = (
  options?: UseMutationOptions<Strategy, AxiosError, string>
) => {
  const queryClient = useQueryClient();
  return useMutation<Strategy, AxiosError, string>({
    mutationFn: resetStrategy,
    onSuccess: (data, variables, context) => {
      const id = variables;
      queryClient.invalidateQueries({ queryKey: ["strategies"] });
      queryClient.invalidateQueries({ queryKey: ["strategies", id] });
      queryClient.invalidateQueries({ queryKey: ["strategies", id, "logs"] });
      if (options?.onSuccess) {
        (options.onSuccess as any)(data, variables, context);
      }
    },
    ...options,
  });
};

export const useDuplicateStrategy = (
  options?: UseMutationOptions<Strategy, AxiosError, string>
) => {
  const queryClient = useQueryClient();
  return useMutation<Strategy, AxiosError, string>({
    mutationFn: duplicateStrategy,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["strategies"] });
      if (options?.onSuccess) {
        (options.onSuccess as any)(data, variables, context);
      }
    },
    ...options,
  });
};

export const useGetStrategyLogs = (
  id: string,
  options?: Partial<UseQueryOptions<StrategyLog[], AxiosError>>
) =>
  useQuery<StrategyLog[], AxiosError>({
    queryKey: ["strategies", id, "logs"],
    queryFn: () => getStrategyLogs(id),
    enabled: Boolean(id) && (options?.enabled ?? true),
    ...options,
  });

export const useStrategyRuntimeStatus = (
  id: string,
  options?: Partial<UseQueryOptions<StrategyRuntimeStatus, AxiosError>>
) =>
  useQuery<StrategyRuntimeStatus, AxiosError>({
    queryKey: ["strategies", id, "runtime-status"],
    queryFn: () => getStrategyRuntimeStatus(id),
    enabled: Boolean(id) && (options?.enabled ?? true),
    ...options,
  });
