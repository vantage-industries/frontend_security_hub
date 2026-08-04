import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Menu,
  X,
  Home,
  Settings,
  Users as UsersIcon,
  LayoutDashboard,
  Moon,
  Sun,
  LogOut,
  Wifi,
  ShieldBan,
  User as UserIcon,
  Search,
  Filter,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  KeyRound,
  AlertTriangle,
  Ban,
  CheckCircle2,
} from "lucide-react";
import { api } from "../api/client";

type User = {
  id: string;
  username: string;
  full_name?: string;
  email?: string;
  role: string;
  is_active: boolean;
  two_factor_enabled?: boolean;
  last_login?: string;
  created_at?: string;
};

export default function Users() {
  const queryClient = useQueryClient();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Stany dla modala dodawania
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addError, setAddError] = useState("");
  const [newUser, setNewUser] = useState({
    username: "",
    full_name: "",
    email: "",
    password: "",
    role: "vpn",
  });

  // Stany dla modala resetowania hasła
  const [resetModalUser, setResetModalUser] = useState<{
    id: string;
    username: string;
  } | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [resetError, setResetError] = useState("");

  const { data: currentUser } = useQuery({
    queryKey: ["users-me"],
    queryFn: async () => {
      try {
        const res = await api.get<User>("/users/me");
        return res.data;
      } catch (e) {
        return { role: "admin" } as User;
      }
    },
    staleTime: Infinity,
  });

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await api.get<{ data: User[]; total: number }>("/users");
      return res.data;
    },
    refetchInterval: 15000,
  });

  // Mutacja: Dodaj użytkownika
  const addUserMutation = useMutation({
    mutationFn: async (payload: typeof newUser) => {
      const res = await api.post("/users", payload);
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      setIsAddModalOpen(false);
      setNewUser({
        username: "",
        full_name: "",
        email: "",
        password: "",
        role: "vpn",
      });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: any) => {
      setAddError(
        error?.response?.data?.error ||
          error?.message ||
          "Wystąpił błąd podczas dodawania.",
      );
    },
  });

  // Mutacja: Usuń użytkownika
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.delete(`/users/${userId}`);
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: any) => {
      alert(
        error?.response?.data?.error ||
          error?.message ||
          "Nie udało się usunąć użytkownika.",
      );
    },
  });

  // Mutacja: Zmiana statusu (Blokowanie)
  const toggleStatusMutation = useMutation({
    mutationFn: async ({
      userId,
      isActive,
    }: {
      userId: string;
      isActive: boolean;
    }) => {
      const res = await api.put(`/users/${userId}/status`, {
        is_active: !isActive,
      });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: any) => {
      alert(
        error?.response?.data?.error ||
          error?.message ||
          "Nie udało się zmienić statusu.",
      );
    },
  });

  // Mutacja: Wymuszenie nowego hasła
  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      if (!resetModalUser) throw new Error("Brak użytkownika");
      const res = await api.put(`/users/${resetModalUser.id}/password`, {
        new_password: resetPasswordValue,
      });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      setResetModalUser(null);
      setResetPasswordValue("");
      alert("Hasło zostało pomyślnie zresetowane.");
    },
    onError: (error: any) => {
      setResetError(
        error?.response?.data?.error ||
          error?.message ||
          "Nie udało się zresetować hasła.",
      );
    },
  });

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark", !isDarkMode);
  };

  const handleLogout = () => {
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
    currentStatus: boolean,
    username: string,
  ) => {
    const action = currentStatus ? "zablokować" : "odblokować";
    if (
      window.confirm(
        `Czy na pewno chcesz ${action} konto użytkownika ${username}?`,
      )
    ) {
      toggleStatusMutation.mutate({ userId, isActive: currentStatus });
    }
  };

  const hasAdminRights =
    currentUser?.role === "owner" || currentUser?.role === "admin";

  const filteredUsers =
    usersData?.data?.filter((user) => {
      const matchesSearch =
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.full_name &&
          user.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.email &&
          user.email.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesRole =
        roleFilter === "all" ||
        user.role.toLowerCase() === roleFilter.toLowerCase();
      return matchesSearch && matchesRole;
    }) || [];

  return (
    <div className="min-h-screen bg-gray-100 flex transition-colors duration-200 dark:bg-gray-950 font-sans relative">
      {/* Modal: Dodawanie */}
      {isAddModalOpen && (
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
                    setNewUser({ ...newUser, role: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#1a1d21] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm cursor-pointer"
                >
                  <option value="vpn">Użytkownik (VPN)</option>
                  <option value="viewer">Obserwator (Viewer)</option>
                  <option value="admin">Administrator (Admin)</option>
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

      {/* Modal: Reset Hasła */}
      {resetModalUser && (
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
          <a
            href="/"
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800 rounded transition-colors"
          >
            <Home className="w-4 h-4" /> Przegląd
          </a>
          <a
            href="/quarantine"
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800 rounded transition-colors"
          >
            <ShieldBan className="w-4 h-4" /> Kwarantanna
          </a>
          <a
            href="/devices"
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800 rounded transition-colors"
          >
            <Wifi className="w-4 h-4" /> Urządzenia
          </a>
          <a
            href="/users"
            className="flex items-center gap-3 px-4 py-2.5 bg-blue-600 text-white rounded font-medium"
          >
            <UsersIcon className="w-4 h-4" /> Użytkownicy
          </a>
          <div className="pt-4 mt-2 border-t border-gray-700/50">
            <a
              href="/account"
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800 rounded transition-colors"
            >
              <UserIcon className="w-4 h-4" /> Moje Konto
            </a>
            <a
              href="/settings"
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800 rounded transition-colors"
            >
              <Settings className="w-4 h-4" /> Ustawienia Systemu
            </a>
          </div>
        </nav>
      </aside>

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
                    <option value="vpn">Użytkownicy VPN</option>
                    <option value="viewer">Obserwatorzy</option>
                  </select>
                </div>
              </div>

              {hasAdminRights && (
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
                      {hasAdminRights && (
                        <th className="px-6 py-4 text-right">Akcje</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {isLoading ? (
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
                      filteredUsers.map((user) => (
                        <tr
                          key={user.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm uppercase">
                                {user.username.charAt(0)}
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
                                user.role.toLowerCase() === "owner" ||
                                user.role.toLowerCase() === "admin"
                                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400"
                                  : user.role.toLowerCase() === "vpn"
                                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400"
                                    : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                              }`}
                            >
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full ${user.is_active ? "bg-emerald-500" : "bg-red-500"}`}
                              ></span>
                              <span className="font-medium text-xs">
                                {user.is_active ? "Aktywny" : "Zablokowany"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-center">
                            {user.two_factor_enabled ? (
                              <ShieldCheck className="w-5 h-5 text-emerald-500 mx-auto" />
                            ) : (
                              <ShieldAlert className="w-5 h-5 text-orange-400 mx-auto opacity-50" />
                            )}
                          </td>
                          <td className="px-6 py-3 text-xs text-gray-500 font-mono">
                            {user.last_login
                              ? new Date(user.last_login).toLocaleString()
                              : "Nigdy"}
                          </td>
                          {hasAdminRights && (
                            <td className="px-6 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() =>
                                    setResetModalUser({
                                      id: user.id,
                                      username: user.username,
                                    })
                                  }
                                  className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded transition-colors"
                                  title="Reset hasła"
                                >
                                  <KeyRound className="w-4 h-4" />
                                </button>

                                {user.role.toLowerCase() !== "owner" && (
                                  <>
                                    <button
                                      onClick={() =>
                                        handleToggleStatus(
                                          user.id,
                                          user.is_active,
                                          user.username,
                                        )
                                      }
                                      className={`p-1.5 rounded transition-colors ${
                                        user.is_active
                                          ? "text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                                          : "text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                                      }`}
                                      title={
                                        user.is_active
                                          ? "Zablokuj konto"
                                          : "Odblokuj konto"
                                      }
                                    >
                                      {user.is_active ? (
                                        <Ban className="w-4 h-4" />
                                      ) : (
                                        <CheckCircle2 className="w-4 h-4" />
                                      )}
                                    </button>

                                    <button
                                      onClick={() =>
                                        handleDeleteUser(user.id, user.username)
                                      }
                                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                                      title="Usuń użytkownika"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
