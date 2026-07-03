import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useRegisterUser, useLoginUser } from "../../../services/auth/AuthQueries";
import { setAccessToken, setRefreshToken } from "../../../utils/storage";
import { registerSchema, RegisterFormData } from "./types";
import { INITIAL_REGISTER_VALUES } from "./constants";

export const useRegister = () => {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const registerMutation = useRegisterUser();
  const loginMutation = useLoginUser();

  const onSubmit = (data: RegisterFormData) => {
    setErrorMsg(null);
    registerMutation.mutate(
      {
        name: data.name,
        email: data.email,
        password: data.password,
      },
      {
        onSuccess: () => {
          loginMutation.mutate(
            {
              email: data.email,
              password: data.password,
            },
            {
              onSuccess: (loginRes) => {
                setAccessToken(loginRes.accessToken);
                setRefreshToken(loginRes.refreshToken);
                navigate("/dashboard");
              },
              onError: () => {
                navigate("/login");
              },
            }
          );
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.message || err?.message || "Failed to register";
          setErrorMsg(msg);
        },
      }
    );
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema as any),
    defaultValues: INITIAL_REGISTER_VALUES,
  });

  return {
    register,
    handleSubmit: handleSubmit(onSubmit),
    errors,
    isLoading: registerMutation.isPending || loginMutation.isPending,
    errorMsg,
  };
};
