import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api/client";
import type { definitions } from "./api/types";
import Login from "./pages/Login";
import Bootstrap from "./pages/Bootstrap";
import Dashboard from "./pages/Dashboard";

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
      </Routes>
    </BrowserRouter>
  );
}
