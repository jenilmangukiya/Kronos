import { UseMutationOptions, useMutation, useQuery, UseQueryOptions } from "@tanstack/react-query";
import { AxiosError } from "axios";
import {
  login,
  register,
  getProfile,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  UserProfile,
} from "./AuthService";

export const useLoginUser = (
  options?: UseMutationOptions<LoginResponse, AxiosError, LoginRequest>
) =>
  useMutation<LoginResponse, AxiosError, LoginRequest>({
    mutationFn: login,
    ...options,
  });

export const useRegisterUser = (
  options?: UseMutationOptions<RegisterResponse, AxiosError, RegisterRequest>
) =>
  useMutation<RegisterResponse, AxiosError, RegisterRequest>({
    mutationFn: register,
    ...options,
  });

export const useUserProfile = (
  options?: Partial<UseQueryOptions<UserProfile, AxiosError>>
) =>
  useQuery<UserProfile, AxiosError>({
    queryKey: ["auth", "profile"],
    queryFn: getProfile,
    ...options,
  });
