import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Menu,
  Moon,
  Sun,
  LogOut,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Server,
  Activity,
  RefreshCw,
} from "lucide-react";
import { api } from "../api/client";
import Sidebar from "../components/Sidebar";
import type { definitions } from "../api/types";

type SystemStatus = definitions["SystemStatus"];
type PreflightCheck = definitions["PreflightCheck"];

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "-";
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
}

function formatUptime(seconds?: number): string {
  if (!seconds || seconds <= 0) return "-";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days} d ${hours} godz.`;
  if (hours > 0) return `${hours} godz. ${minutes} min`;
  return `${minutes} min`;
}

function usageBar(free?: number, total?: number) {
  if (!free || !total || total <= 0) return null;
  const usedPercent = Math.round(((total - free) / total) * 100);
  const tone =
    usedPercent >= 90
      ? "bg-red-500"
      : usedPercent >= 75
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <div className="mt-1.5">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
        <div
          className={`h-full ${tone}`}
          style={{ width: `${usedPercent}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] text-gray-500">
        zajęte {usedPercent}% · wolne {formatBytes(free)} z {formatBytes(total)}
      </p>
    </div>
  );
}

function CheckRow({ check }: { check: PreflightCheck }) {
  const icon = check.ok ? (
    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
  ) : check.optional ? (
    <MinusCircle className="h-4 w-4 shrink-0 text-gray-400" />
  ) : (
    <XCircle className="h-4 w-4 shrink-0 text-red-500" />
  );

  return (
    <li className="flex items-start gap-2 rounded px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/50">
      {icon}
      <div className="min-w-0">
        <p className="font-mono text-xs text-gray-800 dark:text-gray-200">
          {check.name}
          {check.optional && !check.ok && (
            <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-sans text-gray-500 dark:bg-gray-800">
              opcjonalne
            </span>
          )}
        </p>
        {check.detail && (
          <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
            {check.detail}
          </p>
        )}
      </div>
    </li>
  );
}

export default function Diagnostics() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["system-status"],
    queryFn: async () => {
      const res = await api.get<SystemStatus>("/system/status");
      return res.data;
    },
  });

  const preflight = data?.preflight;
  const host = data?.host;
  const observation = data?.observation;
  const checks = preflight?.checks ?? [];
  const failing = checks.filter((c) => !c.ok && !c.optional);
  const skipped = checks.filter((c) => !c.ok && c.optional);
  const passing = checks.filter((c) => c.ok);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark", !isDarkMode);
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // wylogowanie lokalne i tak musi dojść do skutku
    }
    localStorage.removeItem("csrf_token");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gray-100 flex transition-colors duration-200 dark:bg-gray-950 font-sans relative">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 z-10">
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center">
            <button
              className="lg:hidden p-2 -ml-2 mr-3 text-gray-600 hover:bg-gray-100 rounded-lg dark:text-gray-400 dark:hover:bg-gray-800"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-800 dark:text-white">
              Diagnostyka
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-2 rounded p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-800"
              title="Odśwież"
            >
              <RefreshCw
                className={`h-5 w-5 ${isFetching ? "animate-spin" : ""}`}
              />
            </button>
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

        <main className="flex-1 space-y-6 overflow-auto p-4 md:p-6">
          {isLoading ? (
            <p className="text-sm text-gray-500">Pobieram stan systemu...</p>
          ) : (
            <>
              <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                      Gotowość środowiska
                    </h2>
                    <p className="mt-1 font-mono text-xs text-gray-500 dark:text-gray-400">
                      backend: {preflight?.backend || "-"} ·{" "}
                      {preflight?.probed_at
                        ? new Date(preflight.probed_at).toLocaleString()
                        : "brak pomiaru"}
                    </p>
                  </div>
                  <span
                    className={`rounded px-2.5 py-1 text-xs font-bold ${
                      preflight?.ready
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                  >
                    {preflight?.ready ? "Gotowy" : "Nie gotowy"}
                  </span>
                </div>

                {failing.length > 0 && (
                  <div className="mt-4">
                    <h3 className="mb-1 text-xs font-bold text-red-700 dark:text-red-400">
                      Blokujące ({failing.length})
                    </h3>
                    <p className="mb-2 text-[11px] text-gray-500 dark:text-gray-400">
                      Bez tych elementów hub nie zarządzi ruchem na prawdziwym
                      sprzęcie.
                    </p>
                    <ul>
                      {failing.map((check) => (
                        <CheckRow key={check.name} check={check} />
                      ))}
                    </ul>
                  </div>
                )}

                {skipped.length > 0 && (
                  <div className="mt-4">
                    <h3 className="mb-1 text-xs font-bold text-gray-600 dark:text-gray-400">
                      Nieobecne, ale nieobowiązkowe ({skipped.length})
                    </h3>
                    <ul>
                      {skipped.map((check) => (
                        <CheckRow key={check.name} check={check} />
                      ))}
                    </ul>
                  </div>
                )}

                {passing.length > 0 && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      Sprawne ({passing.length})
                    </summary>
                    <ul className="mt-2">
                      {passing.map((check) => (
                        <CheckRow key={check.name} check={check} />
                      ))}
                    </ul>
                  </details>
                )}
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                  <Server className="h-4 w-4 text-gray-500" /> Maszyna
                </h2>

                <dl className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Host</dt>
                    <dd className="font-mono text-gray-800 dark:text-gray-200">
                      {host?.hostname || "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Wersja</dt>
                    <dd className="font-mono text-gray-800 dark:text-gray-200">
                      {host?.version || data?.version || "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">
                      Czas pracy
                    </dt>
                    <dd className="font-mono text-gray-800 dark:text-gray-200">
                      {formatUptime(
                        host?.uptime_seconds ?? data?.uptime_seconds,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">
                      Obciążenie (1 min)
                    </dt>
                    <dd className="font-mono text-gray-800 dark:text-gray-200">
                      {host?.load_avg_1?.toFixed(2) ?? "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Pamięć</dt>
                    <dd className="font-mono text-gray-800 dark:text-gray-200">
                      {formatBytes(host?.mem_total_bytes)}
                    </dd>
                    {usageBar(host?.mem_free_bytes, host?.mem_total_bytes)}
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Dysk</dt>
                    <dd className="font-mono text-gray-800 dark:text-gray-200">
                      {formatBytes(host?.disk_total_bytes)}
                    </dd>
                    {usageBar(host?.disk_free_bytes, host?.disk_total_bytes)}
                  </div>
                </dl>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                    <Activity className="h-4 w-4 text-gray-500" /> Obserwator
                    sieci
                  </h2>
                  <span
                    className={`rounded px-2.5 py-1 text-xs font-bold ${
                      observation?.running
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                  >
                    {observation?.running ? "Działa" : "Zatrzymany"}
                  </span>
                </div>

                <p className="mb-4 text-[11px] text-gray-500 dark:text-gray-400">
                  Ostatni przebieg:{" "}
                  {observation?.at
                    ? new Date(observation.at).toLocaleString()
                    : "brak"}
                  . To on zamienia stacje widziane przez punkt dostępowy i
                  dzierżawy DHCP na sesje urządzeń.
                </p>

                <dl className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-3 lg:grid-cols-4">
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Stacje</dt>
                    <dd className="font-mono text-lg text-gray-800 dark:text-gray-200">
                      {observation?.stations ?? 0}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">
                      Dzierżawy
                    </dt>
                    <dd className="font-mono text-lg text-gray-800 dark:text-gray-200">
                      {observation?.leases ?? 0}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">
                      Sesje otwarte
                    </dt>
                    <dd className="font-mono text-lg text-gray-800 dark:text-gray-200">
                      {observation?.sessions_opened ?? 0}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">
                      Sesje zamknięte
                    </dt>
                    <dd className="font-mono text-lg text-gray-800 dark:text-gray-200">
                      {observation?.sessions_closed ?? 0}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">
                      Poznane MAC-i
                    </dt>
                    <dd className="font-mono text-lg text-gray-800 dark:text-gray-200">
                      {observation?.macs_learned ?? 0}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">
                      Zapisane dzierżawy
                    </dt>
                    <dd className="font-mono text-lg text-gray-800 dark:text-gray-200">
                      {observation?.leases_recorded ?? 0}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">
                      Nieznane stacje
                    </dt>
                    <dd
                      className={`font-mono text-lg ${
                        (observation?.unknown_stations ?? 0) > 0
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-gray-800 dark:text-gray-200"
                      }`}
                    >
                      {observation?.unknown_stations ?? 0}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">
                      Nieznane dzierżawy
                    </dt>
                    <dd
                      className={`font-mono text-lg ${
                        (observation?.unknown_leases ?? 0) > 0
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-gray-800 dark:text-gray-200"
                      }`}
                    >
                      {observation?.unknown_leases ?? 0}
                    </dd>
                  </div>
                </dl>

                {(observation?.unknown_stations ?? 0) > 0 && (
                  <p className="mt-4 rounded bg-amber-50 px-3 py-2 text-[11px] text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                    Nieznane stacje to sprzęt uwierzytelniony w sieci, którego
                    obserwator nie potrafi powiązać z żadnym urządzeniem w
                    bazie.
                  </p>
                )}

                {observation?.error && (
                  <p className="mt-4 rounded bg-red-100 px-3 py-2 font-mono text-[11px] text-red-700 dark:bg-red-950/50 dark:text-red-300">
                    {observation.error}
                  </p>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
