import React from "react";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import { CreateSessionFormData } from "../types";
import { Card } from "../../../../components/ui/Card";
import { Input } from "../../../../components/ui/Input";
import { Button } from "../../../../components/ui/Button";

interface CreateSessionFormProps {
  register: UseFormRegister<CreateSessionFormData>;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  errors: FieldErrors<CreateSessionFormData>;
  isLoading: boolean;
  errorMsg: string | null;
  onCancel: () => void;
}

export const CreateSessionForm: React.FC<CreateSessionFormProps> = ({
  register,
  handleSubmit,
  errors,
  isLoading,
  errorMsg,
  onCancel,
}) => {
  return (
    <Card className="border-slate-800 bg-slate-900/40 p-6">
      <h3 className="text-lg font-bold text-slate-100 mb-1">Create Interactive Session</h3>
      <p className="text-xs text-slate-400 mb-6">
        Authenticate session with Angel One using your MPIN and Google Authenticator TOTP.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg">
            {errorMsg}
          </div>
        )}

        <Input
          label="MPIN"
          type="password"
          placeholder="Enter 4-digit PIN"
          maxLength={4}
          error={errors.mpin?.message}
          {...register("mpin")}
        />

        <Input
          label="TOTP Token"
          placeholder="Enter 6-digit TOTP from Auth App"
          maxLength={6}
          error={errors.totp?.message}
          {...register("totp")}
        />

        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            className="w-1/2"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" className="w-1/2" loading={isLoading}>
            Verify & Start
          </Button>
        </div>
      </form>
    </Card>
  );
};
