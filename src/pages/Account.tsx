import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Menu,
  X,
  Home,
  Settings,
  Users,
  LayoutDashboard,
  Moon,
  Sun,
  LogOut,
  Wifi,
  ShieldBan,
  User as UserIcon,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { api } from "../api/client";
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
  const [pwdSuccess, setPwdSuccess] = useState("");

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
    onError: (error: any) => {
      setPwdError(
        error?.response?.data?.error?.message ||
          "Nie udało się zmienić hasła. Sprawdź obecne hasło.",
      );
    },
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPwdError("Nowe hasła nie są identyczne!");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPwdError("Nowe hasło musi mieć co najmniej 8 znaków.");
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
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#2a2f35] text-gray-300 shadow-xl transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static flex flex-col`}
      >
        <div className="h-16 flex items-center justify-between px-6 bg-[#202428] border-b border-gray-800">
          <div className="flex items-center gap-2 font-bold text-xl text-white">
            <LayoutDashboard className="w-5 h-5 text-blue-500" />
            <span>SecurityHub</span>
          </div>
          <button className="lg:hidden" onClick={() => setIsSidebarOpen(false)}>
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <nav className="p-2 space-y-0.5 flex-1 text-sm">
          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800 rounded transition-colors"
          >
            <Home className="w-4 h-4" /> Przegląd
          </Link>
          <Link
            to="/quarantine"
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800 rounded transition-colors"
          >
            <ShieldBan className="w-4 h-4" /> Kwarantanna
          </Link>
          <Link
            to="/devices"
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800 rounded transition-colors"
          >
            <Wifi className="w-4 h-4" /> Urządzenia
          </Link>
          <Link
            to="/users"
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800 rounded transition-colors"
          >
            <Users className="w-4 h-4" /> Użytkownicy
          </Link>
          <div className="pt-4 mt-2 border-t border-gray-700/50">
            <Link
              to="/account"
              className="flex items-center gap-3 px-4 py-2.5 bg-blue-600 text-white rounded font-medium"
            >
              <UserIcon className="w-4 h-4" /> Moje Konto
            </Link>
            <Link
              to="/settings"
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800 rounded transition-colors"
            >
              <Settings className="w-4 h-4" /> Ustawienia Systemu
            </Link>
          </div>
        </nav>
      </aside>

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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#1a1d21] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#1a1d21] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#1a1d21] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
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
          </div>
        </main>
      </div>
    </div>
  );
}
