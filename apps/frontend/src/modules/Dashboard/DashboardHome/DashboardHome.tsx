import React from "react";
import { Link } from "react-router-dom";
import { useDashboardHome } from "./useDashboardHome";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { Spinner } from "../../../components/ui/Spinner";
import { Table, TableBody, TableCell, TableHeadCell, TableHeader, TableRow } from "../../../components/ui/Table";
import { Shield, TrendingUp, AlertTriangle, CheckCircle2, UserCheck } from "lucide-react";
import { formatDate } from "../../../utils/format";

export const DashboardHome: React.FC = () => {
  const { profile, accounts, isLoading } = useDashboardHome();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  const activeAccountsCount = accounts?.filter((a) => a.hasSession && !a.sessionExpired).length || 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Hello, {profile?.name || "Trader"}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Analyze options chains and execute automated algorithms from a single hub.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card hoverable className="flex items-center gap-5 border-slate-800/60 bg-gradient-to-br from-slate-900/40 to-slate-900/10">
          <div className="h-12 w-12 rounded-xl bg-blue-600/10 text-blue-400 flex items-center justify-center border border-blue-500/10">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">User Account</p>
            <p className="text-lg font-bold text-slate-200 mt-0.5 truncate max-w-[200px]">{profile?.name || "Trader"}</p>
            <p className="text-xs text-slate-400 truncate max-w-[200px]">{profile?.email}</p>
          </div>
        </Card>

        <Card hoverable className="flex items-center gap-5 border-slate-800/60 bg-gradient-to-br from-slate-900/40 to-slate-900/10">
          <div className="h-12 w-12 rounded-xl bg-indigo-600/10 text-indigo-400 flex items-center justify-center border border-indigo-500/10">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Sessions</p>
            <p className="text-3xl font-extrabold text-slate-100 mt-1">{activeAccountsCount} / {accounts?.length || 0}</p>
            <p className="text-xs text-slate-400 mt-0.5">Brokers authenticated</p>
          </div>
        </Card>

        <Card hoverable className="flex items-center gap-5 border-slate-800/60 bg-gradient-to-br from-slate-900/40 to-slate-900/10">
          <div className="h-12 w-12 rounded-xl bg-emerald-600/10 text-emerald-400 flex items-center justify-center border border-emerald-500/10">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Option Chain</p>
            <Link to="/dashboard/option-chain" className="inline-flex items-center text-sm font-semibold text-blue-500 hover:text-blue-400 transition-colors mt-2 gap-1">
              Analyze NIFTY Expiries →
            </Link>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white tracking-tight">Connected Broker Accounts</h2>
          <Link to="/dashboard/broker" className="text-xs font-semibold text-blue-500 hover:text-blue-400 transition-colors">
            Manage Connections
          </Link>
        </div>

        {accounts && accounts.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeadCell>Broker</TableHeadCell>
                <TableHeadCell>Client ID</TableHeadCell>
                <TableHeadCell>Session Status</TableHeadCell>
                <TableHeadCell>Token Expires At</TableHeadCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((acct) => {
                const isActive = acct.hasSession && !acct.sessionExpired;
                return (
                  <TableRow key={acct.id}>
                    <TableCell className="font-bold text-slate-200">
                      {acct.broker === "ANGEL_ONE" ? "Angel One" : acct.broker}
                    </TableCell>
                    <TableCell className="font-mono text-slate-400">{acct.clientId}</TableCell>
                    <TableCell>
                      {isActive ? (
                        <Badge variant="success">
                          <CheckCircle2 className="h-3 w-3 mr-1 inline" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="danger">
                          <AlertTriangle className="h-3 w-3 mr-1 inline" />
                          Expired / Missing
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-400 text-xs">
                      {acct.tokenExpiresAt ? formatDate(acct.tokenExpiresAt) : "Never"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <Card className="text-center py-10 border-dashed border-slate-800/80 bg-slate-900/10">
            <Shield className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-300">No broker connected</h3>
            <p className="text-slate-500 text-xs mt-1">Connect your Angel One trading account to load live prices.</p>
            <Link to="/dashboard/broker" className="mt-4 inline-flex">
              <span className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2 text-xs font-semibold shadow-lg shadow-blue-500/10 cursor-pointer">
                Setup Broker Account
              </span>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
};
