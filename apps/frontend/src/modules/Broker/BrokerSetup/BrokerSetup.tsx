import React from "react";
import { useBrokerSetup } from "./useBrokerSetup";
import { BrokerAccountCard } from "./components/BrokerAccountCard";
import { ConnectBrokerForm } from "./components/ConnectBrokerForm";
import { CreateSessionForm } from "./components/CreateSessionForm";
import { Spinner } from "../../../components/ui/Spinner";
import { Shield } from "lucide-react";

export const BrokerSetup: React.FC = () => {
  const {
    accounts,
    isLoadingAccounts,
    activeSessionAccountId,
    connectError,
    sessionError,
    connectRegister,
    connectHandleSubmit,
    connectErrors,
    isConnecting,
    sessionRegister,
    sessionHandleSubmit,
    sessionErrors,
    isCreatingSession,
    selectAccountForSession,
  } = useBrokerSetup();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Broker Setup</h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage your connections and API session keys to stream market data.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            Connected Accounts
          </h2>

          {isLoadingAccounts ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : accounts && accounts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {accounts.map((acct) => (
                <BrokerAccountCard
                  key={acct.id}
                  account={acct}
                  onInitiateSession={selectAccountForSession}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-900/10 rounded-xl border border-dashed border-slate-800/80">
              <p className="text-slate-400 text-sm font-semibold">No broker accounts linked</p>
              <p className="text-xs text-slate-500 mt-1">
                Fill in the form on the right to link your Angel One developer account.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {activeSessionAccountId ? (
            <CreateSessionForm
              register={sessionRegister}
              handleSubmit={sessionHandleSubmit}
              errors={sessionErrors}
              isLoading={isCreatingSession}
              errorMsg={sessionError}
              onCancel={() => selectAccountForSession(null)}
            />
          ) : (
            <ConnectBrokerForm
              register={connectRegister}
              handleSubmit={connectHandleSubmit}
              errors={connectErrors}
              isLoading={isConnecting}
              errorMsg={connectError}
            />
          )}
        </div>
      </div>
    </div>
  );
};
