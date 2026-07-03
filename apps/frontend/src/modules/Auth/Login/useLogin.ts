import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useLoginUser } from "../../../services/auth/AuthQueries";
import { setAccessToken, setRefreshToken } from "../../../utils/storage";
import { loginSchema, LoginFormData } from "./types";
import { INITIAL_LOGIN_VALUES } from "./constants";

export const useLogin = () => {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const loginMutation = useLoginUser();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema as any),
    defaultValues: INITIAL_LOGIN_VALUES,
  });

  const onSubmit = (data: LoginFormData) => {
    setErrorMsg(null);
    loginMutation.mutate(data, {
      onSuccess: (res) => {
        setAccessToken(res.accessToken);
        setRefreshToken(res.refreshToken);
        navigate("/dashboard");
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.message || err?.message || "Failed to login";
        setErrorMsg(msg);
      },
    });
  };

  return {
    register,
    handleSubmit: handleSubmit(onSubmit),
    errors,
    isLoading: loginMutation.isPending,
    errorMsg,
  };
};
