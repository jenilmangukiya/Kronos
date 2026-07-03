import React from "react";
import { Link, Navigate } from "react-router-dom";
import { useLogin } from "./useLogin";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { getAccessToken } from "../../../utils/storage";

export const Login: React.FC = () => {
  const { register, handleSubmit, errors, isLoading, errorMsg } = useLogin();

  if (getAccessToken()) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 items-center justify-center font-black text-white text-2xl shadow-xl shadow-blue-500/20 mb-4">
            K
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Welcome back</h2>
          <p className="mt-2 text-sm text-slate-400">
            Sign in to your Kronos trading account
          </p>
        </div>

        <Card className="border-slate-800/80 bg-slate-900/50 backdrop-blur-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {errorMsg && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm p-3.5 rounded-lg font-medium">
                {errorMsg}
              </div>
            )}

            <Input
              label="Email Address"
              type="email"
              placeholder="name@example.com"
              error={errors.email?.message}
              {...register("email")}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register("password")}
            />

            <Button type="submit" variant="primary" className="w-full" loading={isLoading}>
              Sign In
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Don't have an account?{" "}
            <Link to="/register" className="text-blue-500 hover:text-blue-400 font-semibold transition-colors duration-150">
              Create an account
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};
