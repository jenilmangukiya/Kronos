import React from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Shield, BarChart3, LogOut, User, TrendingUp, Award, Cpu } from "lucide-react";
import { clearTokens } from "../../utils/storage";
import { useUserProfile } from "../../services/auth/AuthQueries";

export const DashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: profile } = useUserProfile();

  const handleLogout = () => {
    clearTokens();
    navigate("/login");
  };

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Broker Setup", path: "/dashboard/broker", icon: Shield },
    { label: "Option Chain", path: "/dashboard/option-chain", icon: BarChart3 },
    { label: "Futures", path: "/dashboard/futures", icon: TrendingUp },
    { label: "Paper Trading", path: "/dashboard/paper-trading", icon: Award },
    { label: "Strategies", path: "/dashboard/strategies", icon: Cpu },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900/40 border-r border-slate-800/80 backdrop-blur-xl flex flex-col z-10">
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800/80">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-black tracking-tight text-white shadow-lg shadow-blue-500/20">
              K
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Kronos
            </span>
          </Link>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-blue-600/10 border border-blue-500/20 text-blue-400 shadow-md shadow-blue-500/5"
                    : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border border-transparent"
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? "text-blue-400" : "text-slate-400"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer User Card */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/20">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <User className="h-4.5 w-4.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">
                {profile?.name || "Trader"}
              </p>
              <p className="text-[10px] text-slate-500 truncate">{profile?.email || ""}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-slate-900/20 border-b border-slate-800/60 backdrop-blur-md flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-base font-medium text-slate-300">
              {navItems.find((item) => item.path === location.pathname)?.label || "Kronos Portal"}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 transition-all duration-200 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
        </header>

        {/* Page Container */}
        <main className="flex-1 overflow-y-auto bg-slate-950 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
