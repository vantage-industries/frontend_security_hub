import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api/client";
import { useSession } from "./hooks/useSession";
import type { definitions } from "./api/types";

const Login = lazy(() => import("./pages/Login"));
const Bootstrap = lazy(() => import("./pages/Bootstrap"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Devices = lazy(() => import("./pages/Devices"));
const DeviceDetail = lazy(() => import("./pages/DeviceDetail"));
const Account = lazy(() => import("./pages/Account"));
const Users = lazy(() => import("./pages/Users"));
const Quarantine = lazy(() => import("./pages/Quarantine"));
const Settings = lazy(() => import("./pages/Settings"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Vlans = lazy(() => import("./pages/Vlans"));
const Policies = lazy(() => import("./pages/Policies"));
const Firewall = lazy(() => import("./pages/Firewall"));
const Diagnostics = lazy(() => import("./pages/Diagnostics"));
const Sessions = lazy(() => import("./pages/Sessions"));
const DnsDomains = lazy(() => import("./pages/DnsDomains"));
const Audit = lazy(() => import("./pages/Audit"));
const Alerts = lazy(() => import("./pages/Alerts"));

type SetupStatusResponse = definitions["SetupStatusResponse"];

export default function App() {
  const { isAuthenticated, isLoading: sessionLoading } = useSession();

  const { data, isLoading, error } = useQuery({
    queryKey: ["setup-status"],
    queryFn: async () => {
      const res = await api.get<SetupStatusResponse>("/setup/status");
      return res.data;
    },
    retry: false,
  });

  if (isLoading || sessionLoading) {
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

  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-white">
            Ładowanie...
          </div>
        }
      >
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
                <Navigate
                  to={setupRequired ? "/bootstrap" : "/login"}
                  replace
                />
              )
            }
          />
          <Route
            path="/devices/:id"
            element={
              isAuthenticated && !setupRequired ? (
                <DeviceDetail />
              ) : (
                <Navigate
                  to={setupRequired ? "/bootstrap" : "/login"}
                  replace
                />
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
              !isAuthenticated && !setupRequired ? (
                <Login />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/dashboard"
            element={
              isAuthenticated && !setupRequired ? (
                <Dashboard />
              ) : (
                <Navigate
                  to={setupRequired ? "/bootstrap" : "/login"}
                  replace
                />
              )
            }
          />
          <Route
            path="/account"
            element={
              isAuthenticated && !setupRequired ? (
                <Account />
              ) : (
                <Navigate
                  to={setupRequired ? "/bootstrap" : "/login"}
                  replace
                />
              )
            }
          />
          <Route
            path="/users"
            element={
              isAuthenticated && !setupRequired ? (
                <Users />
              ) : (
                <Navigate
                  to={setupRequired ? "/bootstrap" : "/login"}
                  replace
                />
              )
            }
          />
          <Route
            path="/quarantine"
            element={
              isAuthenticated && !setupRequired ? (
                <Quarantine />
              ) : (
                <Navigate
                  to={setupRequired ? "/bootstrap" : "/login"}
                  replace
                />
              )
            }
          />
          <Route
            path="/settings"
            element={
              isAuthenticated && !setupRequired ? (
                <Settings />
              ) : (
                <Navigate
                  to={setupRequired ? "/bootstrap" : "/login"}
                  replace
                />
              )
            }
          />
          <Route
            path="/onboarding"
            element={
              isAuthenticated && !setupRequired ? (
                <Onboarding />
              ) : (
                <Navigate
                  to={setupRequired ? "/bootstrap" : "/login"}
                  replace
                />
              )
            }
          />
          <Route
            path="/vlans"
            element={
              isAuthenticated && !setupRequired ? (
                <Vlans />
              ) : (
                <Navigate
                  to={setupRequired ? "/bootstrap" : "/login"}
                  replace
                />
              )
            }
          />
          <Route
            path="/policies"
            element={
              isAuthenticated && !setupRequired ? (
                <Policies />
              ) : (
                <Navigate
                  to={setupRequired ? "/bootstrap" : "/login"}
                  replace
                />
              )
            }
          />
          <Route
            path="/firewall"
            element={
              isAuthenticated && !setupRequired ? (
                <Firewall />
              ) : (
                <Navigate
                  to={setupRequired ? "/bootstrap" : "/login"}
                  replace
                />
              )
            }
          />
          <Route
            path="/diagnostics"
            element={
              isAuthenticated && !setupRequired ? (
                <Diagnostics />
              ) : (
                <Navigate
                  to={setupRequired ? "/bootstrap" : "/login"}
                  replace
                />
              )
            }
          />
          <Route
            path="/sessions"
            element={
              isAuthenticated && !setupRequired ? (
                <Sessions />
              ) : (
                <Navigate
                  to={setupRequired ? "/bootstrap" : "/login"}
                  replace
                />
              )
            }
          />
          <Route
            path="/dns"
            element={
              isAuthenticated && !setupRequired ? (
                <DnsDomains />
              ) : (
                <Navigate
                  to={setupRequired ? "/bootstrap" : "/login"}
                  replace
                />
              )
            }
          />
          <Route
            path="/audit"
            element={
              isAuthenticated && !setupRequired ? (
                <Audit />
              ) : (
                <Navigate
                  to={setupRequired ? "/bootstrap" : "/login"}
                  replace
                />
              )
            }
          />
          <Route
            path="/alerts"
            element={
              isAuthenticated && !setupRequired ? (
                <Alerts />
              ) : (
                <Navigate
                  to={setupRequired ? "/bootstrap" : "/login"}
                  replace
                />
              )
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
