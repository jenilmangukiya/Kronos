import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  useBrokerAccounts,
  useConnectBroker,
  useCreateSession,
} from "../../../services/broker/BrokerQueries";
import {
  connectBrokerFormSchema,
  ConnectBrokerFormData,
  createSessionFormSchema,
  CreateSessionFormData,
} from "./types";
import { INITIAL_CONNECT_VALUES, INITIAL_SESSION_VALUES } from "./constants";

export const useBrokerSetup = () => {
  const queryClient = useQueryClient();
  const { data: accounts, isLoading: isLoadingAccounts } = useBrokerAccounts();
  const connectMutation = useConnectBroker();
  const sessionMutation = useCreateSession();

  const [activeSessionAccountId, setActiveSessionAccountId] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const connectForm = useForm<ConnectBrokerFormData>({
    resolver: zodResolver(connectBrokerFormSchema as any),
    defaultValues: INITIAL_CONNECT_VALUES,
  });

  const sessionForm = useForm<CreateSessionFormData>({
    resolver: zodResolver(createSessionFormSchema as any),
    defaultValues: INITIAL_SESSION_VALUES,
  });

  const onConnectSubmit = (data: ConnectBrokerFormData) => {
    setConnectError(null);
    connectMutation.mutate(data, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["broker", "accounts"] });
        connectForm.reset(INITIAL_CONNECT_VALUES);
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.message || err?.message || "Failed to connect broker";
        setConnectError(msg);
      },
    });
  };

  const onSessionSubmit = (data: CreateSessionFormData) => {
    if (!activeSessionAccountId) return;
    setSessionError(null);
    sessionMutation.mutate(
      {
        id: activeSessionAccountId,
        data,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["broker", "accounts"] });
          sessionForm.reset(INITIAL_SESSION_VALUES);
          setActiveSessionAccountId(null);
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.message || err?.message || "Failed to create session";
          setSessionError(msg);
        },
      }
    );
  };

  const selectAccountForSession = (id: string | null) => {
    setActiveSessionAccountId(id);
    setSessionError(null);
    sessionForm.reset(INITIAL_SESSION_VALUES);
  };

  return {
    accounts,
    isLoadingAccounts,
    activeSessionAccountId,
    connectError,
    sessionError,
    connectRegister: connectForm.register,
    connectHandleSubmit: connectForm.handleSubmit(onConnectSubmit),
    connectErrors: connectForm.formState.errors,
    isConnecting: connectMutation.isPending,
    sessionRegister: sessionForm.register,
    sessionHandleSubmit: sessionForm.handleSubmit(onSessionSubmit),
    sessionErrors: sessionForm.formState.errors,
    isCreatingSession: sessionMutation.isPending,
    selectAccountForSession,
  };
};
