import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "../components/layout/ProtectedRoute";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Login } from "../modules/Auth/Login/Login";
import { Register } from "../modules/Auth/Register/Register";
import { DashboardHome } from "../modules/Dashboard/DashboardHome/DashboardHome";
import { BrokerSetup } from "../modules/Broker/BrokerSetup/BrokerSetup";
import { OptionChain } from "../modules/MarketData/OptionChain/OptionChain";
import { Futures } from "../modules/MarketData/Futures/Futures";
import { PaperTradingDashboard } from "../modules/PaperTrading/PaperTradingDashboard/PaperTradingDashboard";
import { StrategyList } from "../modules/Strategies/StrategyList/StrategyList";
import { StrategyCreate } from "../modules/Strategies/StrategyCreate/StrategyCreate";
import { StrategyDetails } from "../modules/Strategies/StrategyDetails/StrategyDetails";
import { getAccessToken } from "../utils/storage";

const RootRedirect: React.FC = () => {
  const token = getAccessToken();
  return token ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
};

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardHome />} />
          <Route path="broker" element={<BrokerSetup />} />
          <Route path="option-chain" element={<OptionChain />} />
          <Route path="futures" element={<Futures />} />
          <Route path="paper-trading" element={<PaperTradingDashboard />} />
          <Route path="strategies" element={<StrategyList />} />
          <Route path="strategies/create" element={<StrategyCreate />} />
          <Route path="strategies/:id" element={<StrategyDetails />} />
          <Route path="strategies/:id/edit" element={<StrategyCreate />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
