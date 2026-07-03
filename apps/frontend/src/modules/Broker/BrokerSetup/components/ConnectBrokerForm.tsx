import React from "react";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import { ConnectBrokerFormData } from "../types";
import { Card } from "../../../../components/ui/Card";
import { Input } from "../../../../components/ui/Input";
import { Select } from "../../../../components/ui/Select";
import { Button } from "../../../../components/ui/Button";

interface ConnectBrokerFormProps {
  register: UseFormRegister<ConnectBrokerFormData>;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  errors: FieldErrors<ConnectBrokerFormData>;
  isLoading: boolean;
  errorMsg: string | null;
}

export const ConnectBrokerForm: React.FC<ConnectBrokerFormProps> = ({
  register,
  handleSubmit,
  errors,
  isLoading,
  errorMsg,
}) => {
  return (
    <Card className="border-slate-800 bg-slate-900/40 p-6">
      <h3 className="text-lg font-bold text-slate-100 mb-1">Connect Broker</h3>
      <p className="text-xs text-slate-400 mb-6">
        Link your exchange credentials to access option chain and live market ticks.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg">
            {errorMsg}
          </div>
        )}

        <Select
          label="Broker Provider"
          options={[
            { value: "ANGEL_ONE", label: "Angel One (Recommended)" },
            { value: "KOTAK", label: "Kotak Securities" },
          ]}
          error={errors.broker?.message}
          {...register("broker")}
        />

        <Input
          label="Client ID"
          placeholder="Enter Client ID (e.g. S123456)"
          error={errors.clientId?.message}
          {...register("clientId")}
        />

        <Input
          label="API Key"
          type="password"
          placeholder="Enter Developer API Key"
          error={errors.apiKey?.message}
          {...register("apiKey")}
        />

        <Button type="submit" variant="primary" className="w-full" loading={isLoading}>
          Connect Account
        </Button>
      </form>
    </Card>
  );
};
