import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Menu,
  Moon,
  Sun,
  LogOut,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { api } from "../api/client";
import Sidebar from "../components/Sidebar";
import TwoFactorSection from "../components/TwoFactorSection";
import type { definitions } from "../api/types";

export default function Account() {
  // const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [pwdError, setPwdError] = useState("");
  const [pwdFieldErrors, setPwdFieldErrors] = useState<{
    current_password?: string;
    new_password?: string;
    confirm_password?: string;
  }>({});
  const [pwdSuccess, setPwdSuccess] = useState("");

  const fieldClass = (error?: string) =>
    `w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-[#1a1d21] text-gray-900 dark:text-white focus:ring-2 outline-none text-sm ${
      error
        ? "border-red-500 focus:ring-red-500"
        : "border-gray-300 dark:border-gray-700 focus:ring-blue-500"
    }`;

  const { data: sessionData } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const res =
        await api.get<definitions["SessionResponse"]>("/auth/session");
      return res.data;
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const payload: definitions["ChangePasswordRequest"] = {
        current_password: passwordForm.currentPassword,
        new_password: passwordForm.newPassword,
      };
      const res = await api.post("/auth/password", payload);
      return res.data;
    },
    onSuccess: (data) => {
      setPwdSuccess("Hasło zostało pomyślnie zmienione!");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      if (data && data.csrf_token) {
        localStorage.setItem("csrf_token", data.csrf_token);
      }
      setTimeout(() => setPwdSuccess(""), 4000);
    },
    onError: (error: unknown) => {
      const body = (
        error as {
          response?: {
            data?: {
              error?: {
                code?: string;
                message?: string;
                fields?: { [key: string]: string };
              };
            };
          };
        }
      )?.response?.data?.error;

      const next: {
        current_password?: string;
        new_password?: string;
        confirm_password?: string;
      } = {};

      if (body?.fields) {
        if (body.fields.current_password) {
          next.current_password = body.fields.current_password;
        }
        if (body.fields.new_password) {
          next.new_password = body.fields.new_password;
        }
      }

      if (body?.code === "invalid_credentials") {
        next.current_password = "Obecne hasło jest nieprawidłowe.";
      }

      setPwdFieldErrors(next);
      setPwdError(
        Object.keys(next).length > 0
          ? ""
          : body?.message || "Nie udało się zmienić hasła.",
      );
    },
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");
    setPwdFieldErrors({});

    const next: {
      current_password?: string;
      new_password?: string;
      confirm_password?: string;
    } = {};

    if (!passwordForm.currentPassword) {
      next.current_password = "Podaj obecne hasło.";
    }
    if (passwordForm.newPassword.length < 12) {
      next.new_password = "Nowe hasło musi mieć co najmniej 12 znaków.";
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      next.confirm_password = "Hasła nie są identyczne.";
    }

    if (Object.keys(next).length > 0) {
      setPwdFieldErrors(next);
      return;
    }

    changePasswordMutation.mutate();
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark", !isDarkMode);
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) {}
    localStorage.removeItem("csrf_token");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gray-100 flex transition-colors duration-200 dark:bg-gray-950 font-sans">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-4 md:px-6 border-b border-gray-200 sticky top-0 z-30 dark:bg-gray-900 dark:border-gray-800">
          <div className="flex items-center">
            <button
              className="lg:hidden p-2 -ml-2 mr-3 text-gray-600 hover:bg-gray-100 rounded-lg dark:text-gray-400 dark:hover:bg-gray-800"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-800 dark:text-white">
              Ustawienia Konta
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleDarkMode}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg dark:text-gray-400 dark:hover:bg-gray-800"
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-yellow-400" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2"></div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 p-2 text-red-600 hover:bg-red-50 rounded dark:text-red-400 dark:hover:bg-red-950/50"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline font-medium text-sm">
                Wyloguj
              </span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-auto">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-2xl font-bold uppercase">
                  {sessionData?.username?.charAt(0) || "U"}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {sessionData?.full_name ||
                      sessionData?.username ||
                      "Użytkownik"}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {sessionData?.role || "Brak roli"}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <KeyRound className="w-5 h-5 text-gray-500" />
                Zmiana hasła
              </h3>

              {pwdError && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-3 rounded flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 dark:text-red-400 font-medium">
                    {pwdError}
                  </p>
                </div>
              )}

              {pwdSuccess && (
                <div className="mb-4 bg-emerald-50 dark:bg-emerald-900/30 border-l-4 border-emerald-500 p-3 rounded flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                    {pwdSuccess}
                  </p>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Obecne hasło
                  </label>
                  <input
                    required
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        currentPassword: e.target.value,
                      })
                    }
                    placeholder="••••••••••••"
                    aria-invalid={!!pwdFieldErrors.current_password}
                    className={fieldClass(pwdFieldErrors.current_password)}
                  />
                  {pwdFieldErrors.current_password && (
                    <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                      {pwdFieldErrors.current_password}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Nowe hasło
                  </label>
                  <input
                    required
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        newPassword: e.target.value,
                      })
                    }
                    placeholder="••••••••••••"
                    aria-invalid={!!pwdFieldErrors.new_password}
                    className={fieldClass(pwdFieldErrors.new_password)}
                  />
                  {pwdFieldErrors.new_password && (
                    <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                      {pwdFieldErrors.new_password}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Potwierdź nowe hasło
                  </label>
                  <input
                    required
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        confirmPassword: e.target.value,
                      })
                    }
                    placeholder="••••••••••••"
                    aria-invalid={!!pwdFieldErrors.confirm_password}
                    className={fieldClass(pwdFieldErrors.confirm_password)}
                  />
                  {pwdFieldErrors.confirm_password && (
                    <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                      {pwdFieldErrors.confirm_password}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {changePasswordMutation.isPending
                    ? "Aktualizacja..."
                    : "Zaktualizuj hasło"}
                </button>
              </form>
            </div>

            <TwoFactorSection enabled={!!sessionData?.mfa_enabled} />
          </div>
        </main>
      </div>
    </div>
  );
}
