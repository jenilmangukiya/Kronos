import React from "react";
import { BrokerAccount } from "../../../../services/broker/BrokerService";
import { Card } from "../../../../components/ui/Card";
import { Badge } from "../../../../components/ui/Badge";
import { Button } from "../../../../components/ui/Button";
import { Shield, ShieldAlert, KeyRound, Calendar } from "lucide-react";
import { formatDate } from "../../../../utils/format";

interface BrokerAccountCardProps {
  account: BrokerAccount;
  onInitiateSession: (id: string) => void;
}

export const BrokerAccountCard: React.FC<BrokerAccountCardProps> = ({
  account,
  onInitiateSession,
}) => {
  const isSessionActive = account.hasSession && !account.sessionExpired;

  return (
    <Card hoverable className="border-slate-800 bg-slate-900/40 relative overflow-hidden flex flex-col justify-between h-full">
      <div>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              {account.broker === "ANGEL_ONE" ? "Angel One" : account.broker}
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {account.clientId}</p>
          </div>

          <Badge variant={isSessionActive ? "success" : "danger"}>
            {isSessionActive ? "Session Active" : "No Session"}
          </Badge>
        </div>

        <div className="space-y-2.5 my-5 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <KeyRound className="h-3.5 w-3.5 text-slate-500" />
            <span>Connection: Connected</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-slate-500" />
            <span>
              Expires: {account.tokenExpiresAt ? formatDate(account.tokenExpiresAt) : "N/A"}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-800/80">
        {isSessionActive ? (
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold py-2">
            <Shield className="h-4 w-4" />
            Ready for execution
          </div>
        ) : (
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            onClick={() => onInitiateSession(account.id)}
          >
            <ShieldAlert className="h-3.5 w-3.5 mr-1.5" />
            Initialize Session
          </Button>
        )}
      </div>
    </Card>
  );
};
