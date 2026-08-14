import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Menu,
  Moon,
  Sun,
  LogOut,
  X,
  Check,
  ShieldOff,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { api } from "../api/client";
import Sidebar from "../components/Sidebar";
import { useSession } from "../hooks/useSession";
import type { definitions } from "../api/types";

type Alert = definitions["Alert"];
type ListResponseAlert =
  definitions["ListResponse-security-hub_internal_dto_Alert"];

const pageSize = 50;

const periods: [string, number | null][] = [
  ["24 godziny", 24],
  ["7 dni", 24 * 7],
  ["30 dni", 24 * 30],
  ["Wszystko", null],
];

const severities = ["critical", "high", "medium", "low", "info"] as const;

const severityLabels: Record<string, string> = {
  critical: "Krytyczna",
  high: "Wysoka",
  medium: "Średnia",
  low: "Niska",
  info: "Informacja",
};

const severityStyles: Record<string, string> = {
  critical: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
  medium:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  low: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  info: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

function prettyPayload(raw?: string): string {
  if (!raw) return "Brak surowego zdarzenia.";
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export default function Alerts() {
  const queryClient = useQueryClient();
  const { can } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [hours, setHours] = useState<number | null>(24);
  const [severity, setSeverity] = useState("");
  const [onlyUnacknowledged, setOnlyUnacknowledged] = useState(false);
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetPage = () => setPage(0);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["alerts", hours, severity, onlyUnacknowledged, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String(page * pageSize),
      });
      if (hours !== null) {
        params.set(
          "since",
          new Date(Date.now() - hours * 3600 * 1000).toISOString(),
        );
      }
      if (severity) params.set("severity", severity);
      if (onlyUnacknowledged) params.set("acknowledged", "false");
      const res = await api.get<ListResponseAlert>(
        `/alerts?${params.toString()}`,
      );
      return res.data;
    },
    placeholderData: (previous) => previous,
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["alert", selectedId],
    queryFn: async () => {
      const res = await api.get<Alert>(`/alerts/${selectedId}`);
      return res.data;
    },
    enabled: selectedId !== null,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["alerts"] });
    queryClient.invalidateQueries({ queryKey: ["alert"] });
    queryClient.invalidateQueries({ queryKey: ["system-status"] });
    queryClient.invalidateQueries({ queryKey: ["recent-alerts"] });
  };

  const reportError = (err: unknown, fallback: string) => {
    const e = err as { response?: { data?: { error?: { message?: string } } } };
    setError(e?.response?.data?.error?.message || fallback);
  };

  const acknowledge = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/alerts/${id}/acknowledge`);
    },
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: (err: unknown) =>
      reportError(err, "Nie udało się potwierdzić alertu."),
  });

  const falsePositive = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/alerts/${id}/false-positive`);
    },
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: (err: unknown) =>
      reportError(err, "Nie udało się oznaczyć jako fałszywy alarm."),
  });

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

  const alerts: Alert[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const rangeFrom = total === 0 ? 0 : page * pageSize + 1;
  const rangeTo = Math.min((page + 1) * pageSize, total);

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
              Alerty
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="rounded p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-800"
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

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-4 rounded border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-1">
              {periods.map(([label, value]) => (
                <button
                  key={label}
                  onClick={() => {
                    setHours(value);
                    resetPage();
                  }}
                  className={`rounded px-3 py-1.5 text-xs font-bold transition-colors ${
                    hours === value
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <select
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value);
                resetPage();
              }}
              className="rounded border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
            >
              <option value="">Każda waga</option>
              {severities.map((value) => (
                <option key={value} value={value}>
                  {severityLabels[value]}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={onlyUnacknowledged}
                onChange={(e) => {
                  setOnlyUnacknowledged(e.target.checked);
                  resetPage();
                }}
              />
              Tylko bez reakcji
            </label>
          </div>

          {error && (
            <p className="mb-4 rounded bg-red-100 px-3 py-2 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Czas</th>
                    <th className="px-4 py-3">Waga</th>
                    <th className="px-4 py-3">Sygnatura</th>
                    <th className="px-4 py-3">Urządzenie</th>
                    <th className="px-4 py-3">Cel</th>
                    <th className="px-4 py-3">Stan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">
                        Pobieram...
                      </td>
                    </tr>
                  ) : alerts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">
                        Brak alertów w wybranym okresie.
                      </td>
                    </tr>
                  ) : (
                    alerts.map((alert) => (
                      <tr
                        key={alert.id}
                        onClick={() => setSelectedId(alert.id ?? null)}
                        className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                          selectedId === alert.id
                            ? "bg-blue-50 dark:bg-blue-900/20"
                            : ""
                        }`}
                      >
                        <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[11px] text-gray-500">
                          {alert.timestamp
                            ? new Date(alert.timestamp).toLocaleString()
                            : "-"}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                              severityStyles[alert.severity || ""] ||
                              severityStyles.info
                            }`}
                          >
                            {severityLabels[alert.severity || ""] ||
                              alert.severity}
                          </span>
                        </td>
                        <td
                          className="max-w-[280px] truncate px-4 py-2.5 text-xs text-gray-700 dark:text-gray-300"
                          title={alert.signature}
                        >
                          {alert.signature}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[11px] text-gray-600 dark:text-gray-400">
                          {alert.device_name || alert.src_ip || "-"}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[11px] text-gray-500">
                          {alert.dst_ip || "-"}
                          {alert.dst_port ? `:${alert.dst_port}` : ""}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {alert.auto_quarantined && (
                              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/40 dark:text-red-400">
                                Kwarantanna
                              </span>
                            )}
                            {alert.is_false_positive && (
                              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                Fałszywy
                              </span>
                            )}
                            {alert.acknowledged && (
                              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                                Potwierdzony
                              </span>
                            )}
                            {!alert.acknowledged &&
                              !alert.is_false_positive && (
                                <span className="text-[11px] text-gray-400">
                                  bez reakcji
                                </span>
                              )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 dark:border-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {total === 0
                  ? "Brak wyników"
                  : `${rangeFrom}–${rangeTo} z ${total}`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || isFetching}
                  className="flex items-center gap-1 rounded px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Poprzednia
                </button>
                <span className="font-mono text-xs text-gray-500">
                  {page + 1} / {pageCount}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page + 1 >= pageCount || isFetching}
                  className="flex items-center gap-1 rounded px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Następna <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {selectedId !== null && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setSelectedId(null)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
              <h2 className="text-sm font-bold text-gray-800 dark:text-white">
                Szczegóły alertu
              </h2>
              <button
                onClick={() => setSelectedId(null)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Zamknij"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {detailLoading || !detail ? (
                <p className="text-sm text-gray-500">Pobieram szczegóły...</p>
              ) : (
                <>
                  <div>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        severityStyles[detail.severity || ""] ||
                        severityStyles.info
                      }`}
                    >
                      {severityLabels[detail.severity || ""] || detail.severity}
                    </span>
                    <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                      {detail.signature}
                    </h3>
                    <p className="mt-1 font-mono text-[11px] text-gray-500">
                      {detail.timestamp
                        ? new Date(detail.timestamp).toLocaleString()
                        : "-"}
                      {detail.signature_id
                        ? ` · sygnatura #${detail.signature_id}`
                        : ""}
                    </p>
                  </div>

                  {detail.auto_quarantined && (
                    <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                      System sam przeniósł urządzenie do kwarantanny na
                      podstawie tego zdarzenia.
                    </p>
                  )}

                  <dl className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-gray-500">Urządzenie</dt>
                      <dd className="text-gray-800 dark:text-gray-200">
                        {detail.device_name || "nierozpoznane"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Kategoria</dt>
                      <dd className="text-gray-800 dark:text-gray-200">
                        {detail.category || "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Źródło</dt>
                      <dd className="font-mono text-gray-800 dark:text-gray-200">
                        {detail.src_ip || "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Cel</dt>
                      <dd className="font-mono text-gray-800 dark:text-gray-200">
                        {detail.dst_ip || "-"}
                        {detail.dst_port ? `:${detail.dst_port}` : ""}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Protokół</dt>
                      <dd className="font-mono text-gray-800 dark:text-gray-200">
                        {detail.protocol || "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Typ zdarzenia</dt>
                      <dd className="font-mono text-gray-800 dark:text-gray-200">
                        {detail.event_type || "-"}
                      </dd>
                    </div>
                  </dl>

                  {detail.acknowledged && (
                    <p className="rounded bg-gray-50 px-3 py-2 text-[11px] text-gray-600 dark:bg-gray-950 dark:text-gray-400">
                      Potwierdzone przez {detail.acknowledged_by || "-"}
                      {detail.acknowledged_at
                        ? ` · ${new Date(detail.acknowledged_at).toLocaleString()}`
                        : ""}
                    </p>
                  )}

                  <div>
                    <h4 className="mb-2 text-xs font-bold text-gray-600 dark:text-gray-400">
                      Surowe zdarzenie
                    </h4>
                    <pre className="max-h-80 overflow-auto rounded bg-gray-950 p-3 font-mono text-[11px] leading-relaxed text-emerald-300">
                      {prettyPayload(detail.raw_payload)}
                    </pre>
                  </div>
                </>
              )}
            </div>

            {detail && (
              <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-800">
                <button
                  onClick={() => falsePositive.mutate(detail.id as number)}
                  disabled={
                    !can("alert:false_positive") ||
                    detail.is_false_positive ||
                    falsePositive.isPending
                  }
                  title={
                    can("alert:false_positive")
                      ? undefined
                      : "Wymaga uprawnienia alert:false_positive"
                  }
                  className="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <ShieldOff className="h-3.5 w-3.5" />
                  {detail.is_false_positive
                    ? "Oznaczony jako fałszywy"
                    : "Fałszywy alarm"}
                </button>
                <button
                  onClick={() => acknowledge.mutate(detail.id as number)}
                  disabled={
                    !can("alert:acknowledge") ||
                    detail.acknowledged ||
                    acknowledge.isPending
                  }
                  title={
                    can("alert:acknowledge")
                      ? undefined
                      : "Wymaga uprawnienia alert:acknowledge"
                  }
                  className="flex items-center gap-1.5 rounded bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Check className="h-3.5 w-3.5" />
                  {detail.acknowledged ? "Potwierdzony" : "Potwierdź"}
                </button>
              </div>
            )}
          </aside>
        </>
      )}
    </div>
  );
}
