import { UseMutationOptions, useMutation, useQuery, UseQueryOptions } from "@tanstack/react-query";
import { AxiosError } from "axios";
import {
  getBrokerAccounts,
  connectBroker,
  createSession,
  getBrokerProfile,
  getBrokerFunds,
  getBrokerHoldings,
  getBrokerPositions,
  BrokerAccount,
  ConnectBrokerRequest,
  ConnectBrokerResponse,
  CreateSessionRequest,
  CreateSessionResponse,
} from "./BrokerService";

export const useBrokerAccounts = (
  options?: Partial<UseQueryOptions<BrokerAccount[], AxiosError>>
) =>
  useQuery<BrokerAccount[], AxiosError>({
    queryKey: ["broker", "accounts"],
    queryFn: getBrokerAccounts,
    ...options,
  });

export const useConnectBroker = (
  options?: UseMutationOptions<ConnectBrokerResponse, AxiosError, ConnectBrokerRequest>
) =>
  useMutation<ConnectBrokerResponse, AxiosError, ConnectBrokerRequest>({
    mutationFn: connectBroker,
    ...options,
  });

export const useCreateSession = (
  options?: UseMutationOptions<
    CreateSessionResponse,
    AxiosError,
    { id: string; data: CreateSessionRequest }
  >
) =>
  useMutation<CreateSessionResponse, AxiosError, { id: string; data: CreateSessionRequest }>({
    mutationFn: createSession,
    ...options,
  });

export const useBrokerProfile = (
  id: string,
  options?: Partial<UseQueryOptions<any, AxiosError>>
) =>
  useQuery<any, AxiosError>({
    queryKey: ["broker", "profile", id],
    queryFn: () => getBrokerProfile(id),
    enabled: Boolean(id) && (options?.enabled ?? true),
    ...options,
  });

export const useBrokerFunds = (
  id: string,
  options?: Partial<UseQueryOptions<any, AxiosError>>
) =>
  useQuery<any, AxiosError>({
    queryKey: ["broker", "funds", id],
    queryFn: () => getBrokerFunds(id),
    enabled: Boolean(id) && (options?.enabled ?? true),
    ...options,
  });

export const useBrokerHoldings = (
  id: string,
  options?: Partial<UseQueryOptions<any, AxiosError>>
) =>
  useQuery<any, AxiosError>({
    queryKey: ["broker", "holdings", id],
    queryFn: () => getBrokerHoldings(id),
    enabled: Boolean(id) && (options?.enabled ?? true),
    ...options,
  });

export const useBrokerPositions = (
  id: string,
  options?: Partial<UseQueryOptions<any, AxiosError>>
) =>
  useQuery<any, AxiosError>({
    queryKey: ["broker", "positions", id],
    queryFn: () => getBrokerPositions(id),
    enabled: Boolean(id) && (options?.enabled ?? true),
    ...options,
  });
