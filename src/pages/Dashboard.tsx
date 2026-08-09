import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Menu,
  Moon,
  Sun,
  LogOut,
  Activity,
  ShieldAlert,
  Server,
  Wifi,
  ShieldBan,
  Clock,
  Network,
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
import Sidebar from "../components/Sidebar";
import type { definitions } from "../api/types";
import { Link } from "react-router-dom";

type SystemStatus = definitions["SystemStatus"];
type Alert = definitions["Alert"];
type ListResponseAlert =
  definitions["ListResponse-security-hub_internal_dto_Alert"];
type ListResponseVLAN =
  definitions["ListResponse-security-hub_internal_dto_VLAN"];
type ListResponseDevice =
  definitions["ListResponse-security-hub_internal_dto_Device"];

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
      const res = await api.get<ListResponseAlert>("/alerts?limit=10");
      return res.data;
    },
    refetchInterval: 10000,
  });

  const { data: vlansData } = useQuery({
    queryKey: ["vlans"],
    queryFn: async () => {
      const res = await api.get<ListResponseVLAN>("/vlans");
      return res.data;
    },
    refetchInterval: 30000,
  });

  const { data: pendingDevices } = useQuery({
    queryKey: ["onboarding-pending"],
    queryFn: async () => {
      const res = await api.get<ListResponseDevice>(
        "/onboarding/pending?limit=1",
      );
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

  const hasActions =
    (pendingDevices?.total || 0) > 0 ||
    quarantined > 0 ||
    (status?.counts?.unacknowledged_alerts || 0) > 0;

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
              Dashboard (Status)
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
              className="flex items-center gap-2 p-2 text-red-600 hover:bg-red-50 rounded dark:text-red-400 dark:hover:bg-red-950/50"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline font-medium text-sm">
                Wyloguj
              </span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-4 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4 text-white">
            <Link
              to="/devices"
              className="bg-[#2a8bf2] p-4 rounded shadow-sm flex flex-col justify-between hover:opacity-90 transition-opacity cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2 opacity-90">
                <span className="text-sm font-medium uppercase tracking-wider">
                  Aktywne Urządzenia
                </span>
                <Activity className="w-5 h-5" />
              </div>
              <div className="text-3xl font-bold">
                {statusLoading ? "..." : status?.counts?.active_devices || 0}
                <span className="text-sm font-normal opacity-70 ml-2">
                  / {status?.counts?.devices || 0} total
                </span>
              </div>
            </Link>

            <Link
              to="/quarantine"
              className={`p-4 rounded shadow-sm flex flex-col justify-between hover:opacity-90 transition-opacity cursor-pointer ${quarantined > 0 ? "bg-[#e53935]" : "bg-[#43a047]"}`}
            >
              <div className="flex items-center justify-between mb-2 opacity-90">
                <span className="text-sm font-medium uppercase tracking-wider">
                  Kwarantanna
                </span>
                <ShieldBan className="w-5 h-5" />
              </div>
              <div className="text-3xl font-bold">
                {statusLoading ? "..." : quarantined}
              </div>
            </Link>

            <div
              className={`p-4 rounded shadow-sm flex flex-col justify-between ${status?.counts?.unacknowledged_alerts ? "bg-[#fb8c00]" : "bg-[#43a047]"}`}
            >
              <div className="flex items-center justify-between mb-2 opacity-90">
                <span className="text-sm font-medium uppercase tracking-wider">
                  Niepotw. Alerty
                </span>
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="text-3xl font-bold">
                {statusLoading
                  ? "..."
                  : status?.counts?.unacknowledged_alerts || 0}
              </div>
            </div>

            <div className="bg-[#8e24aa] p-4 rounded shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2 opacity-90">
                <span className="text-sm font-medium uppercase tracking-wider">
                  Uptime Systemu
                </span>
                <Clock className="w-5 h-5" />
              </div>
              <div className="text-3xl font-bold">
                {statusLoading ? "..." : formatUptime(status?.uptime_seconds)}
              </div>
            </div>
          </div>

          {hasActions && (
            <div className="bg-white dark:bg-gray-900 border-l-4 border-orange-500 rounded shadow-sm p-4 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-6 h-6 text-orange-500" />
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-white text-sm">
                    Wymagana uwaga administratora
                  </h3>
                  <div className="text-xs text-gray-500 flex gap-4 mt-1 font-medium">
                    {(pendingDevices?.total || 0) > 0 && (
                      <span className="text-orange-600 cursor-pointer hover:underline">
                        {pendingDevices?.total} urz. oczekuje na Onboarding
                      </span>
                    )}
                    {quarantined > 0 && (
                      <span className="text-red-600 cursor-pointer hover:underline">
                        {quarantined} urz. w Kwarantannie
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Link
                to="/quarantine"
                className="bg-orange-50 hover:bg-orange-100 text-orange-700 px-4 py-1.5 rounded text-sm font-medium transition-colors dark:bg-orange-900/30 dark:text-orange-400"
              >
                Rozwiąż
              </Link>
            </div>
          )}

          <div className="bg-white dark:bg-gray-900 rounded shadow-sm border border-gray-200 dark:border-gray-800 p-3 mb-4">
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Network className="w-4 h-4" /> Segmenty Sieci (VLAN)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
              {vlansData?.data?.map((vlan) => {
                const isNotDeployed = vlan.vid === 99 || !vlan.is_deployed;
                return (
                  <Link
                    to="/vlans"
                    key={vlan.vid}
                    className={`p-2 border rounded flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow ${isNotDeployed ? "bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700 opacity-60 hover:opacity-80" : "bg-white border-blue-200 border-l-4 border-l-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:border-l-blue-500 hover:border-blue-400 dark:hover:border-l-blue-400"}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span
                        className={`text-xs font-bold ${isNotDeployed ? "text-gray-400" : "text-blue-600 dark:text-blue-400"}`}
                      >
                        VLAN {vlan.vid}
                      </span>
                      {isNotDeployed && (
                        <span className="text-[10px] bg-gray-200 text-gray-500 px-1 rounded dark:bg-gray-700">
                          Not Deployed
                        </span>
                      )}
                    </div>
                    <span
                      className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate"
                      title={vlan.display_name || vlan.name}
                    >
                      {vlan.display_name || vlan.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
              <div className="p-3 bg-gray-50 border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200">
                  Log Zdarzeń Bezpieczeństwa (IDS)
                </h2>
                <button className="text-xs text-blue-600 hover:underline dark:text-blue-400">
                  Zobacz wszystko
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-2 border-b dark:border-gray-700">
                        Czas
                      </th>
                      <th className="px-4 py-2 border-b dark:border-gray-700">
                        Severity
                      </th>
                      <th className="px-4 py-2 border-b dark:border-gray-700">
                        Sygnatura
                      </th>
                      <th className="px-4 py-2 border-b dark:border-gray-700">
                        Urządzenie (Src)
                      </th>
                      <th className="px-4 py-2 border-b dark:border-gray-700">
                        Port Dst
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {alertsLoading ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center">
                          Ładowanie...
                        </td>
                      </tr>
                    ) : alertsData?.data?.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center">
                          Brak nowych zdarzeń.
                        </td>
                      </tr>
                    ) : (
                      alertsData?.data?.map((alert: Alert) => (
                        <tr
                          key={alert.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <td className="px-4 py-2 whitespace-nowrap text-xs">
                            {new Date(
                              alert.timestamp || "",
                            ).toLocaleTimeString()}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${alert.severity === "critical" ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" : "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400"}`}
                            >
                              {alert.severity}
                            </span>
                          </td>
                          <td
                            className="px-4 py-2 truncate max-w-[200px]"
                            title={alert.signature}
                          >
                            {alert.signature}
                          </td>
                          <td className="px-4 py-2 font-mono text-xs">
                            {alert.device_name || alert.src_ip}
                          </td>
                          <td className="px-4 py-2 font-mono text-xs">
                            {alert.dst_port}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="bg-white dark:bg-gray-900 rounded shadow-sm border border-gray-200 dark:border-gray-800">
                <div className="p-3 bg-gray-50 border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                  <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200">
                    Stan Komponentów
                  </h2>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Baza Danych
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${status?.database?.ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                    >
                      {status?.database?.ok ? "OK" : "Error"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        HostAPD (Radio)
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${status?.services?.hostapd_ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                    >
                      {status?.services?.hostapd_ok ? "Running" : "Down"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <ShieldBan className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Suricata IDS
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${status?.services?.suricata?.running ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                    >
                      {status?.services?.suricata?.running
                        ? "Active"
                        : "Disabled"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col flex-1">
                <div className="p-3 bg-gray-50 border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                  <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200">
                    Urządzenia (Podział)
                  </h2>
                </div>
                <div className="p-2 flex-1 min-h-[200px]">
                  {statusLoading ? (
                    <div className="flex items-center justify-center h-full text-xs text-gray-500">
                      Ładowanie...
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={deviceChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={2}
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
                            fontSize: "12px",
                            padding: "4px 8px",
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={24}
                          iconSize={10}
                          wrapperStyle={{ fontSize: "12px" }}
                        />
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
