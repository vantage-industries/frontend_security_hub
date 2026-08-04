import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Search,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import { api } from "../api/client";

type QuarantinedDevice = {
  id: string;
  mac_address: string;
  ip_address?: string;
  hostname?: string;
  reason: string;
  created_at: string;
};

export default function Quarantine() {
  const queryClient = useQueryClient();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: quarantineData, isLoading } = useQuery({
    queryKey: ["quarantine"],
    queryFn: async () => {
      const res = await api.get<{ data: QuarantinedDevice[]; total: number }>(
        "/quarantine",
      );
      return res.data;
    },
    refetchInterval: 10000,
  });

  const releaseMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/quarantine/${id}/release`);
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quarantine"] });
    },
    onError: (error: any) => {
      alert(
        error?.response?.data?.error ||
          error?.message ||
          "Nie udało się zwolnić urządzenia z kwarantanny.",
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

  const handleRelease = (id: string, name: string) => {
    if (
      window.confirm(
        `Czy na pewno chcesz zwolnić urządzenie ${name || id} z kwarantanny?`,
      )
    ) {
      releaseMutation.mutate(id);
    }
  };

  const filteredDevices =
    quarantineData?.data?.filter((dev) => {
      return (
        dev.mac_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (dev.hostname &&
          dev.hostname.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (dev.ip_address &&
          dev.ip_address.toLowerCase().includes(searchQuery.toLowerCase())) ||
        dev.reason.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }) || [];

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
          <a
            href="/"
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800 rounded transition-colors"
          >
            <Home className="w-4 h-4" /> Przegląd
          </a>
          <a
            href="/quarantine"
            className="flex items-center gap-3 px-4 py-2.5 bg-blue-600 text-white rounded font-medium"
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
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800 rounded transition-colors"
          >
            <Users className="w-4 h-4" /> Użytkownicy
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
              Kwarantanna Sieciowa
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
            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 flex items-center gap-4">
              <div className="relative w-full max-w-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Szukaj urządzenia (MAC, IP...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#1a1d21] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none sm:text-sm"
                />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden flex flex-col min-h-[500px]">
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                    <tr>
                      <th className="px-6 py-4">Urządzenie / Hostname</th>
                      <th className="px-6 py-4">Adres MAC / IP</th>
                      <th className="px-6 py-4">Powód kwarantanny</th>
                      <th className="px-6 py-4">Data dodania</th>
                      <th className="px-6 py-4 text-right">Akcje</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {isLoading ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-8 text-center text-gray-500"
                        >
                          Pobieranie listy kwarantanny...
                        </td>
                      </tr>
                    ) : filteredDevices.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-16 text-center text-gray-500 flex flex-col items-center justify-center"
                        >
                          <ShieldAlert className="w-12 h-12 text-emerald-500 mb-3 opacity-80" />
                          <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
                            Brak urządzeń w kwarantannie
                          </p>
                          <p className="text-sm mt-1">
                            Sieć jest w pełni bezpieczna.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredDevices.map((dev) => (
                        <tr
                          key={dev.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          <td className="px-6 py-3">
                            <div className="font-bold text-gray-900 dark:text-white">
                              {dev.hostname || "Nieznane urządzenie"}
                            </div>
                            <div className="text-xs text-gray-500 font-mono">
                              ID: {dev.id}
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <div className="font-mono text-xs font-semibold text-gray-800 dark:text-gray-200">
                              {dev.mac_address}
                            </div>
                            <div className="text-xs text-gray-500 font-mono">
                              {dev.ip_address || "Brak IP"}
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <span className="px-2.5 py-1 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 rounded text-xs font-bold">
                              {dev.reason}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-xs text-gray-500 font-mono">
                            {new Date(dev.created_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-3 text-right">
                            <button
                              onClick={() =>
                                handleRelease(
                                  dev.id,
                                  dev.hostname || dev.mac_address,
                                )
                              }
                              disabled={releaseMutation.isPending}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-4 h-4" /> Odblokuj
                            </button>
                          </td>
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
