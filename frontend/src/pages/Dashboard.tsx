import { useState, useEffect } from "react";
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
  Activity,
  ShieldAlert,
  Server,
  Wifi,
  ShieldBan,
  Clock,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { api } from "../api/client";
import type { definitions } from "../api/types";

type SystemStatus = definitions["SystemStatus"];
type Alert = definitions["Alert"];
type ListResponseAlert =
  definitions["ListResponse-security-hub_internal_dto_Alert"];

export default function Dashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ["system-status"],
    queryFn: async () => {
      const res = await api.get<SystemStatus>("/system/status");
      return res.data;
    },
    refetchInterval: 10000,
  });

  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ["recent-alerts"],
    queryFn: async () => {
      const res = await api.get<ListResponseAlert>("/alerts?limit=5");
      return res.data;
    },
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api.post("/auth/logout");
    },
    onSettled: () => {
      localStorage.removeItem("csrf_token");
      window.location.href = "/login";
    },
  });

  const formatUptime = (seconds?: number) => {
    if (!seconds) return "0m";
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d > 0 ? d + "d " : ""}${h}h ${m}m`;
  };

  const activeSafe =
    (status?.counts?.active_devices || 0) - (status?.counts?.quarantined || 0);
  const quarantined = status?.counts?.quarantined || 0;

  const deviceChartData = [
    {
      name: "Bezpieczne",
      value: activeSafe > 0 ? activeSafe : 0,
      color: "#10b981",
    },
    { name: "Kwarantanna", value: quarantined, color: "#ef4444" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex transition-colors duration-200 dark:bg-gray-950">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static flex flex-col dark:bg-gray-900 dark:border-r dark:border-gray-800 dark:shadow-2xl`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 font-bold text-xl text-blue-600 dark:text-blue-500">
            <LayoutDashboard className="w-6 h-6" />
            <span>SecurityHub.</span>
          </div>
          <button className="lg:hidden" onClick={() => setIsSidebarOpen(false)}>
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <nav className="p-4 space-y-1 flex-1">
          <a
            href="#"
            className="flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-600 rounded-lg font-medium dark:bg-blue-950/50 dark:text-blue-400"
          >
            <Home className="w-5 h-5" /> Przegląd
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors dark:text-gray-400 dark:hover:bg-gray-800/50"
          >
            <ShieldBan className="w-5 h-5" /> Kwarantanna
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors dark:text-gray-400 dark:hover:bg-gray-800/50"
          >
            <Wifi className="w-5 h-5" /> Urządzenia
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors dark:text-gray-400 dark:hover:bg-gray-800/50"
          >
            <Users className="w-5 h-5" /> Użytkownicy
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors dark:text-gray-400 dark:hover:bg-gray-800/50"
          >
            <Settings className="w-5 h-5" /> Ustawienia
          </a>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-4 md:px-6 border-b border-gray-100 sticky top-0 z-30 transition-colors duration-200 dark:bg-gray-900 dark:border-gray-800">
          <div className="flex items-center">
            <button
              className="lg:hidden p-2 -ml-2 mr-3 text-gray-600 hover:bg-gray-100 rounded-lg dark:text-gray-400 dark:hover:bg-gray-800"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-800 dark:text-white">
              Dashboard
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
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="flex items-center gap-2 p-2 text-red-600 hover:bg-red-50 rounded-lg dark:text-red-400 dark:hover:bg-red-950/50"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline font-medium">Wyloguj</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                  Aktywne Urządzenia
                </h3>
                <div className="p-2 bg-blue-50 dark:bg-blue-950/50 rounded-lg">
                  <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-800 dark:text-white">
                {statusLoading ? "..." : status?.counts?.active_devices || 0}
                <span className="text-sm font-normal text-gray-400 ml-2">
                  / {status?.counts?.devices || 0} total
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                  W Kwarantannie
                </h3>
                <div
                  className={`p-2 rounded-lg ${status?.counts?.quarantined ? "bg-red-50 dark:bg-red-950/50" : "bg-gray-50 dark:bg-gray-800"}`}
                >
                  <ShieldBan
                    className={`w-5 h-5 ${status?.counts?.quarantined ? "text-red-600 dark:text-red-400" : "text-gray-400"}`}
                  />
                </div>
              </div>
              <div
                className={`text-3xl font-bold ${status?.counts?.quarantined ? "text-red-600 dark:text-red-400" : "text-gray-800 dark:text-white"}`}
              >
                {statusLoading ? "..." : status?.counts?.quarantined || 0}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                  Oczekujące Alerty
                </h3>
                <div
                  className={`p-2 rounded-lg ${status?.counts?.unacknowledged_alerts ? "bg-orange-50 dark:bg-orange-950/50" : "bg-gray-50 dark:bg-gray-800"}`}
                >
                  <ShieldAlert
                    className={`w-5 h-5 ${status?.counts?.unacknowledged_alerts ? "text-orange-600 dark:text-orange-400" : "text-gray-400"}`}
                  />
                </div>
              </div>
              <div
                className={`text-3xl font-bold ${status?.counts?.unacknowledged_alerts ? "text-orange-600 dark:text-orange-400" : "text-gray-800 dark:text-white"}`}
              >
                {statusLoading
                  ? "..."
                  : status?.counts?.unacknowledged_alerts || 0}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                  Uptime Systemu
                </h3>
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg">
                  <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-800 dark:text-white">
                {statusLoading ? "..." : formatUptime(status?.uptime_seconds)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="p-5 border-b border-gray-100 dark:border-gray-800">
                <h2 className="font-semibold text-gray-800 dark:text-white">
                  Ostatnie zdarzenia bezpieczeństwa
                </h2>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {alertsLoading ? (
                  <div className="p-8 text-center text-gray-500">
                    Ładowanie alertów...
                  </div>
                ) : alertsData?.data?.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    Brak nowych zdarzeń. Sieć jest bezpieczna.
                  </div>
                ) : (
                  alertsData?.data?.map((alert: Alert) => (
                    <div
                      key={alert.id}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-start gap-4"
                    >
                      <div
                        className={`p-2 rounded-full mt-1 flex-shrink-0 ${alert.severity === "critical" ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"}`}
                      >
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-800 dark:text-white">
                          {alert.signature}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          Urządzenie:{" "}
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {alert.device_name || alert.src_ip}
                          </span>{" "}
                          • Port: {alert.dst_port}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="p-5 border-b border-gray-100 dark:border-gray-800">
                  <h2 className="font-semibold text-gray-800 dark:text-white">
                    Stan Usług
                  </h2>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Server className="w-5 h-5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Baza Danych
                      </span>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${status?.database?.ok ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700"}`}
                    >
                      {status?.database?.ok ? "Włączone" : "Błąd"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Wifi className="w-5 h-5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        HostAPD (Radio)
                      </span>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${status?.services?.hostapd_ok ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700"}`}
                    >
                      {status?.services?.hostapd_ok ? "Włączone" : "Błąd"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ShieldBan className="w-5 h-5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Silnik IDS (Suricata)
                      </span>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${status?.services?.suricata?.running ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700"}`}
                    >
                      {status?.services?.suricata?.running
                        ? "Włączone"
                        : "Wyłączone"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col">
                <div className="p-5 border-b border-gray-100 dark:border-gray-800">
                  <h2 className="font-semibold text-gray-800 dark:text-white">
                    Struktura Sieci
                  </h2>
                </div>
                <div className="p-5 flex-1 min-h-[250px]">
                  {statusLoading ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      Ładowanie wykresu...
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={deviceChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                        >
                          {deviceChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
                            borderColor: isDarkMode ? "#374151" : "#f3f4f6",
                            color: isDarkMode ? "#f9fafb" : "#1f2937",
                            borderRadius: "8px",
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                          }}
                          itemStyle={{
                            color: isDarkMode ? "#e5e7eb" : "#374151",
                          }}
                        />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
