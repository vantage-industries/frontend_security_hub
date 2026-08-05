import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api/client";
import type { definitions } from "./api/types";
import Login from "./pages/Login";
import Bootstrap from "./pages/Bootstrap";
import Dashboard from "./pages/Dashboard";
import Devices from "./pages/Devices";
import DeviceDetail from "./pages/DeviceDetail";
import Account from "./pages/Account";
import Users from "./pages/Users";
import Quarantine from "./pages/Quarantine";
import Settings from "./pages/Settings";
import Onboarding from "./pages/Onboarding";
import Vlans from "./pages/Vlans";
import Policies from "./pages/Policies";

type SetupStatusResponse = definitions["SetupStatusResponse"];

export default function App() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["setup-status"],
    queryFn: async () => {
      const res = await api.get<SetupStatusResponse>("/setup/status");
      return res.data;
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-white">
        Ładowanie...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 text-red-500">
        Brak połączenia z backendem
      </div>
    );
  }

  const setupRequired = data?.setup_required;
  const isAuthenticated = !!localStorage.getItem("csrf_token");

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            setupRequired ? (
              <Navigate to="/bootstrap" />
            ) : isAuthenticated ? (
              <Navigate to="/dashboard" />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/devices"
          element={
            isAuthenticated && !setupRequired ? (
              <Devices />
            ) : (
              <Navigate to={setupRequired ? "/setup" : "/login"} replace />
            )
          }
        />
        <Route
          path="/devices/:id"
          element={
            isAuthenticated && !setupRequired ? (
              <DeviceDetail />
            ) : (
              <Navigate to={setupRequired ? "/setup" : "/login"} replace />
            )
          }
        />
        <Route
          path="/bootstrap"
          element={setupRequired ? <Bootstrap /> : <Navigate to="/" />}
        />
        <Route
          path="/login"
          element={
            !isAuthenticated && !setupRequired ? <Login /> : <Navigate to="/" />
          }
        />
        <Route
          path="/dashboard"
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/" />}
        />
        <Route
          path="/account"
          element={
            isAuthenticated && !setupRequired ? (
              <Account />
            ) : (
              <Navigate to={setupRequired ? "/setup" : "/login"} replace />
            )
          }
        />
        <Route
          path="/users"
          element={
            isAuthenticated && !setupRequired ? (
              <Users />
            ) : (
              <Navigate to={setupRequired ? "/setup" : "/login"} replace />
            )
          }
        />
        <Route
          path="/quarantine"
          element={
            isAuthenticated && !setupRequired ? (
              <Quarantine />
            ) : (
              <Navigate to={setupRequired ? "/setup" : "/login"} replace />
            )
          }
        />
        <Route
          path="/settings"
          element={
            isAuthenticated && !setupRequired ? (
              <Settings />
            ) : (
              <Navigate to={setupRequired ? "/setup" : "/login"} replace />
            )
          }
        />
        <Route
          path="/onboarding"
          element={
            isAuthenticated && !setupRequired ? (
              <Onboarding />
            ) : (
              <Navigate to={setupRequired ? "/setup" : "/login"} replace />
            )
          }
        />
        <Route
          path="/vlans"
          element={
            isAuthenticated && !setupRequired ? (
              <Vlans />
            ) : (
              <Navigate to={setupRequired ? "/setup" : "/login"} replace />
            )
          }
        />
        <Route
          path="/policies"
          element={
            isAuthenticated && !setupRequired ? (
              <Policies />
            ) : (
              <Navigate to={setupRequired ? "/setup" : "/login"} replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
