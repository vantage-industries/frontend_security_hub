import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Menu,
  X,
  Users as UsersIcon,
  Moon,
  Sun,
  LogOut,
  Search,
  Filter,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  KeyRound,
  AlertTriangle,
  Ban,
  CircleCheck,
} from "lucide-react";
import { api } from "../api/client";
import Sidebar from "../components/Sidebar";
import { useSession } from "../hooks/useSession";
import type { definitions } from "../api/types";

//type User = definitions["User"];

export default function Users() {
  const queryClient = useQueryClient();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addError, setAddError] = useState("");
  const [newUser, setNewUser] = useState<definitions["CreateUserRequest"]>({
    username: "",
    full_name: "",
    email: "",
    password: "",
    role: "viewer",
  });

  const [resetModalUser, setResetModalUser] = useState<{
    id: string;
    username: string;
  } | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [resetError, setResetError] = useState("");

  const { data: sessionData, isLoading: isSessionLoading } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const res =
        await api.get<definitions["SessionResponse"]>("/auth/session");
      return res.data;
    },
    staleTime: Infinity,
  });

  const { data: usersData, isLoading: isUsersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await api.get<definitions["ListResponse-User"]>("/users");
      return res.data;
    },
    refetchInterval: 15000,
    enabled:
      !!sessionData &&
      (sessionData.role === "owner" || sessionData.role === "admin"),
  });

  const { can } = useSession();

  const addUserMutation = useMutation({
    mutationFn: async (payload: definitions["CreateUserRequest"]) => {
      const res = await api.post("/users", payload);
      return res.data;
    },
    onSuccess: () => {
      setIsAddModalOpen(false);
      setNewUser({
        username: "",
        full_name: "",
        email: "",
        password: "",
        role: "viewer",
      });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: any) => {
      setAddError(
        error?.response?.data?.error?.message ||
          "Wystąpił błąd podczas dodawania.",
      );
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.delete(`/users/${userId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: any) => {
      alert(
        error?.response?.data?.error?.message ||
          "Nie udało się usunąć użytkownika.",
      );
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({
      userId,
      action,
    }: {
      userId: string;
      action: "disable" | "enable";
    }) => {
      const res = await api.post(`/users/${userId}/${action}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: any) => {
      alert(
        error?.response?.data?.error?.message ||
          "Nie udało się zmienić statusu.",
      );
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      if (!resetModalUser) throw new Error("Brak użytkownika");
      const payload: definitions["ResetPasswordRequest"] = {
        new_password: resetPasswordValue,
      };
      const res = await api.post(
        `/users/${resetModalUser.id}/password-reset`,
        payload,
      );
      return res.data;
    },
    onSuccess: () => {
      setResetModalUser(null);
      setResetPasswordValue("");
      alert("Hasło zostało pomyślnie zresetowane.");
    },
    onError: (error: any) => {
      setResetError(
        error?.response?.data?.error?.message ||
          "Nie udało się zresetować hasła.",
      );
    },
  });

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

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    addUserMutation.mutate(newUser);
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    if (resetPasswordValue.length < 8) {
      setResetError("Nowe hasło musi mieć minimum 8 znaków.");
      return;
    }
    resetPasswordMutation.mutate();
  };

  const handleDeleteUser = (userId: string, username: string) => {
    if (window.confirm(`Czy na pewno chcesz usunąć użytkownika ${username}?`)) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleToggleStatus = (
    userId: string,
    username: string,
    action: "disable" | "enable",
  ) => {
    const question =
      action === "disable"
        ? `Wyłączyć konto ${username}? Użytkownik straci możliwość zalogowania, a jego sesje zostaną zamknięte.`
        : `Włączyć konto ${username}? Użytkownik znów będzie mógł się zalogować, a blokada po nieudanych próbach zostanie zdjęta.`;

    if (window.confirm(question)) {
      toggleStatusMutation.mutate({ userId, action });
    }
  };

  const hasAdminRights =
    sessionData?.role === "owner" || sessionData?.role === "admin";

  const filteredUsers =
    usersData?.data?.filter((user) => {
      const matchesSearch =
        (user.username &&
          user.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.full_name &&
          user.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.email &&
          user.email.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesRole =
        roleFilter === "all" ||
        (user.role && user.role.toLowerCase() === roleFilter.toLowerCase());
      return matchesSearch && matchesRole;
    }) || [];

  return (
    <div className="min-h-screen bg-gray-100 flex transition-colors duration-200 dark:bg-gray-950 font-sans relative">
      {isAddModalOpen && hasAdminRights && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-[#1a1d21]">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <UsersIcon className="w-5 h-5 text-blue-600" /> Dodaj
                Użytkownika
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              {addError && (
                <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-3 rounded flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-400">
                    {addError}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Login (wymagane)
                </label>
                <input
                  required
                  type="text"
                  value={newUser.username}
                  onChange={(e) =>
                    setNewUser({ ...newUser, username: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#1a1d21] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Hasło początkowe (wymagane)
                </label>
                <input
                  required
                  type="password"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#1a1d21] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Imię i Nazwisko
                  </label>
                  <input
                    type="text"
                    value={newUser.full_name}
                    onChange={(e) =>
                      setNewUser({ ...newUser, full_name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#1a1d21] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Adres E-mail
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#1a1d21] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Rola systemowa
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({ ...newUser, role: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#1a1d21] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm cursor-pointer"
                >
                  <option value="viewer">Obserwator (Viewer)</option>
                  <option value="operator">Operator</option>
                  <option value="admin">Administrator (Admin)</option>
                  {sessionData?.role === "owner" && (
                    <option value="owner">Właściciel (Owner)</option>
                  )}
                </select>
              </div>
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-200 dark:border-gray-800 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={addUserMutation.isPending}
                  className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {addUserMutation.isPending ? "Tworzenie..." : "Utwórz konto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resetModalUser && hasAdminRights && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-200 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-[#1a1d21]">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-orange-500" /> Reset hasła
              </h3>
              <button
                onClick={() => {
                  setResetModalUser(null);
                  setResetError("");
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleResetSubmit} className="p-6 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Wymuś nowe hasło dla użytkownika:{" "}
                <strong className="text-gray-900 dark:text-white">
                  {resetModalUser.username}
                </strong>
              </p>
              {resetError && (
                <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-3 rounded flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-400">
                    {resetError}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Nowe hasło
                </label>
                <input
                  required
                  type="text"
                  value={resetPasswordValue}
                  onChange={(e) => setResetPasswordValue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#1a1d21] text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none text-sm font-mono"
                  placeholder="Wpisz nowe hasło"
                />
              </div>
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setResetModalUser(null);
                    setResetError("");
                  }}
                  className="px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={resetPasswordMutation.isPending}
                  className="px-4 py-2 text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {resetPasswordMutation.isPending
                    ? "Zapisywanie..."
                    : "Zapisz hasło"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 z-10">
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-4 md:px-6 border-b border-gray-200 sticky top-0 z-30 dark:bg-gray-900 dark:border-gray-800">
          <div className="flex items-center">
            <button
              className="lg:hidden p-2 -ml-2 mr-3 text-gray-600 hover:bg-gray-100 rounded-lg dark:text-gray-400 dark:hover:bg-gray-800"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-800 dark:text-white">
              Zarządzanie Użytkownikami
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

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {isSessionLoading ? (
            <div className="p-8 text-center text-gray-500">
              Trwa weryfikacja uprawnień...
            </div>
          ) : !hasAdminRights ? (
            <div className="max-w-xl mx-auto mt-12 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center shadow-sm">
              <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4 opacity-80" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Brak uprawnień
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                Zarządzanie użytkownikami jest dostępne wyłącznie dla kont o
                rolach Właściciel lub Administrator.
              </p>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto space-y-4">
              <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                  <div className="relative w-full sm:max-w-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Szukaj użytkownika..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#1a1d21] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors outline-none"
                    />
                  </div>

                  <div className="relative hidden sm:block">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Filter className="h-4 w-4 text-gray-400" />
                    </div>
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="block w-full pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#1a1d21] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors outline-none appearance-none cursor-pointer"
                    >
                      <option value="all">Wszystkie role</option>
                      <option value="owner">Właściciele (Owner)</option>
                      <option value="admin">Administratorzy</option>
                      <option value="operator">Operatorzy</option>
                      <option value="viewer">Obserwatorzy</option>
                    </select>
                  </div>
                </div>

                {can("user:write") && (
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Dodaj użytkownika
                  </button>
                )}
              </div>

              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                      <tr>
                        <th className="px-6 py-4">Użytkownik</th>
                        <th className="px-6 py-4">Rola</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-center">2FA</th>
                        <th className="px-6 py-4">Ostatnie logowanie</th>
                        <th className="px-6 py-4 text-right">Akcje</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {isUsersLoading ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="p-8 text-center text-gray-500"
                          >
                            Ładowanie danych użytkowników...
                          </td>
                        </tr>
                      ) : filteredUsers.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="p-16 text-center text-gray-500 flex flex-col items-center justify-center"
                          >
                            <UsersIcon className="w-12 h-12 text-gray-300 dark:text-gray-700 mb-3" />
                            <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
                              Nie znaleziono użytkowników
                            </p>
                            <p className="text-sm mt-1">
                              Zmień kryteria wyszukiwania lub dodaj nowe konto.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user) => {
                          const isDisabled =
                            (user.status || "").toLowerCase() === "disabled";

                          return (
                            <tr
                              key={user.id}
                              className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                            >
                              <td className="px-6 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm uppercase">
                                    {user.username?.charAt(0) || "?"}
                                  </div>
                                  <div>
                                    <div className="font-bold text-gray-900 dark:text-white">
                                      {user.full_name || user.username}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      {user.email || "@" + user.username}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-3">
                                <span
                                  className={`px-2.5 py-1 rounded text-xs font-bold uppercase ${
                                    user.role?.toLowerCase() === "owner" ||
                                    user.role?.toLowerCase() === "admin"
                                      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400"
                                      : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                                  }`}
                                >
                                  {user.role}
                                </span>
                              </td>
                              <td className="px-6 py-3">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      isDisabled
                                        ? "bg-gray-400"
                                        : user.is_locked
                                          ? "bg-orange-500"
                                          : "bg-emerald-500"
                                    }`}
                                  ></span>
                                  <span className="font-medium text-xs">
                                    {isDisabled
                                      ? "Wyłączone"
                                      : user.is_locked
                                        ? "Zablokowane próbami"
                                        : "Aktywne"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-3 text-center">
                                {user.mfa_enabled ? (
                                  <ShieldCheck
                                    className="w-5 h-5 text-emerald-500 mx-auto"
                                    aria-label="Weryfikacja dwuetapowa włączona"
                                  >
                                    <title>
                                      Weryfikacja dwuetapowa włączona
                                    </title>
                                  </ShieldCheck>
                                ) : (
                                  <ShieldAlert
                                    className="w-5 h-5 text-orange-400 mx-auto opacity-50"
                                    aria-label="Konto chronione samym hasłem"
                                  >
                                    <title>Konto chronione samym hasłem</title>
                                  </ShieldAlert>
                                )}
                              </td>
                              <td className="px-6 py-3 text-xs text-gray-500 font-mono">
                                {user.last_login_at
                                  ? new Date(
                                      user.last_login_at,
                                    ).toLocaleString()
                                  : "Nigdy"}
                              </td>
                              <td className="px-6 py-3">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() =>
                                      setResetModalUser({
                                        id: user.id as string,
                                        username: user.username as string,
                                      })
                                    }
                                    disabled={!can("user:write")}
                                    className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                                    title={
                                      can("user:write")
                                        ? "Reset hasła"
                                        : "Wymaga uprawnienia user:write"
                                    }
                                  >
                                    <KeyRound className="w-4 h-4" />
                                  </button>

                                  {user.role?.toLowerCase() !== "owner" && (
                                    <>
                                      {isDisabled ? (
                                        <button
                                          onClick={() =>
                                            handleToggleStatus(
                                              user.id as string,
                                              user.username as string,
                                              "enable",
                                            )
                                          }
                                          disabled={
                                            toggleStatusMutation.isPending ||
                                            !can("user:write")
                                          }
                                          className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded transition-colors disabled:opacity-40"
                                          title="Włącz konto"
                                        >
                                          <CircleCheck className="w-4 h-4" />
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() =>
                                            handleToggleStatus(
                                              user.id as string,
                                              user.username as string,
                                              "disable",
                                            )
                                          }
                                          disabled={
                                            toggleStatusMutation.isPending ||
                                            !can("user:write")
                                          }
                                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-40"
                                          title="Wyłącz konto"
                                        >
                                          <Ban className="w-4 h-4" />
                                        </button>
                                      )}
                                      <button
                                        onClick={() =>
                                          handleDeleteUser(
                                            user.id as string,
                                            user.username as string,
                                          )
                                        }
                                        disabled={!can("user:delete")}
                                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                                        title={
                                          can("user:delete")
                                            ? "Usuń użytkownika"
                                            : "Wymaga uprawnienia user:delete"
                                        }
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
