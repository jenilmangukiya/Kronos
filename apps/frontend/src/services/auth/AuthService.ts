import { axiosPublic, axiosAuth } from "../api/axios";
import { REGISTER, LOGIN, PROFILE } from "./AuthApiRoutes";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

export interface RegisterRequest {
  name?: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  id: string;
  name: string | null;
  email: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
}

export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  const response = await axiosPublic.post<LoginResponse>(LOGIN, data);
  return response.data;
};

export const register = async (data: RegisterRequest): Promise<RegisterResponse> => {
  const response = await axiosPublic.post<RegisterResponse>(REGISTER, data);
  return response.data;
};

export const getProfile = async (): Promise<UserProfile> => {
  const response = await axiosAuth.get<UserProfile>(PROFILE);
  return response.data;
};
