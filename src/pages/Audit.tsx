import { useState, Fragment } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Menu,
  Moon,
  Sun,
  LogOut,
  ShieldCheck,
  ShieldAlert,
  Link2,
  RefreshCw,
} from "lucide-react";
import { api } from "../api/client";
import Sidebar from "../components/Sidebar";
import type { definitions } from "../api/types";

type AuditEntry = definitions["AuditEntry"];
type VerifyAuditResponse = definitions["VerifyAuditResponse"];
type ListResponseAuditEntry =
  definitions["ListResponse-security-hub_internal_dto_AuditEntry"];

const resultLabels: Record<string, string> = {
  success: "Wykonano",
  failure: "Nie powiodło się",
  denied: "Odmówiono",
};

const resultStyles: Record<string, string> = {
  success:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  failure:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
  denied: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
};

export default function Audit() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [resultFilter, setResultFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [verification, setVerification] = useState<VerifyAuditResponse | null>(
    null,
  );

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["audit", resultFilter, actionFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "100" });
      if (resultFilter) params.set("result", resultFilter);
      if (actionFilter) params.set("action", actionFilter);
      const res = await api.get<ListResponseAuditEntry>(
        `/audit?${params.toString()}`,
      );
      return res.data;
    },
  });

  const verify = useMutation({
    mutationFn: async () => {
      const res = await api.get<VerifyAuditResponse>("/audit/verify");
      return res.data;
    },
    onSuccess: (result) => setVerification(result),
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

  const entries: AuditEntry[] = data?.data ?? [];

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
              Dziennik zdarzeń
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
          <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                  <Link2 className="h-4 w-4 text-gray-500" /> Nienaruszalność
                  dziennika
                </h2>
                <p className="mt-1 max-w-xl text-xs text-gray-500 dark:text-gray-400">
                  Każdy wpis niesie skrót poprzedniego, więc tworzą łańcuch.
                  Usunięcie albo podmiana wpisu zrywa go w policzalnym miejscu.
                </p>
              </div>
              <button
                onClick={() => verify.mutate()}
                disabled={verify.isPending}
                className="rounded bg-blue-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
              >
                {verify.isPending ? "Sprawdzam..." : "Sprawdź łańcuch"}
              </button>
            </div>

            {verification && (
              <div
                className={`mt-4 rounded border p-3 text-xs ${
                  verification.valid
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
                    : "border-red-300 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
                }`}
              >
                <p className="flex items-center gap-1.5 font-bold">
                  {verification.valid ? (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  ) : (
                    <ShieldAlert className="h-3.5 w-3.5" />
                  )}
                  {verification.valid
                    ? `Łańcuch nienaruszony — sprawdzono ${verification.checked ?? 0} wpisów.`
                    : "Łańcuch przerwany."}
                </p>
                {!verification.valid && (
                  <p className="mt-1">
                    Zerwanie przy wpisie #{verification.broken_at_id ?? "-"}
                    {verification.reason ? ` · ${verification.reason}` : ""}.
                    Sprawdzono {verification.checked ?? 0} wpisów.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3 rounded border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <input
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder="Akcja, np. device.classify"
              className="min-w-[220px] flex-1 rounded border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
            />
            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              className="rounded border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
            >
              <option value="">Każdy wynik</option>
              <option value="success">Wykonano</option>
              <option value="failure">Nie powiodło się</option>
              <option value="denied">Odmówiono</option>
            </select>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Czas</th>
                    <th className="px-4 py-3">Kto</th>
                    <th className="px-4 py-3">Akcja</th>
                    <th className="px-4 py-3">Obiekt</th>
                    <th className="px-4 py-3">Wynik</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500">
                        Pobieram...
                      </td>
                    </tr>
                  ) : entries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500">
                        Brak wpisów spełniających kryteria.
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry) => (
                      <Fragment key={entry.id}>
                        <tr
                          onClick={() =>
                            setExpanded(
                              expanded === entry.id ? null : (entry.id ?? null),
                            )
                          }
                          className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[11px] text-gray-500">
                            {entry.timestamp
                              ? new Date(entry.timestamp).toLocaleString()
                              : "-"}
                          </td>
                          <td className="px-4 py-2.5 text-xs">
                            <span className="font-semibold text-gray-800 dark:text-gray-200">
                              {entry.actor_username || "system"}
                            </span>
                            {entry.actor_role && (
                              <span className="ml-1.5 text-[10px] uppercase text-gray-400">
                                {entry.actor_role}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-gray-700 dark:text-gray-300">
                            {entry.action}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-gray-500">
                            {entry.resource_type || "-"}
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                resultStyles[entry.result || ""] ||
                                "bg-gray-100 text-gray-600 dark:bg-gray-800"
                              }`}
                            >
                              {resultLabels[entry.result || ""] ||
                                entry.result ||
                                "-"}
                            </span>
                          </td>
                        </tr>
                        {expanded === entry.id && (
                          <tr>
                            <td
                              colSpan={5}
                              className="bg-gray-50 px-4 py-3 dark:bg-gray-950"
                            >
                              <dl className="grid grid-cols-1 gap-2 font-mono text-[11px] sm:grid-cols-2">
                                <div>
                                  <dt className="text-gray-500">Adres IP</dt>
                                  <dd className="text-gray-700 dark:text-gray-300">
                                    {entry.ip_address || "-"}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-gray-500">
                                    Identyfikator obiektu
                                  </dt>
                                  <dd className="break-all text-gray-700 dark:text-gray-300">
                                    {entry.resource_id || "-"}
                                  </dd>
                                </div>
                                <div className="sm:col-span-2">
                                  <dt className="text-gray-500">Szczegóły</dt>
                                  <dd className="whitespace-pre-wrap break-all text-gray-700 dark:text-gray-300">
                                    {entry.details || "brak"}
                                  </dd>
                                </div>
                                <div className="sm:col-span-2">
                                  <dt className="text-gray-500">
                                    Skrót wpisu / poprzedniego
                                  </dt>
                                  <dd className="break-all text-gray-400">
                                    {entry.hash || "-"}
                                    <br />
                                    {entry.prev_hash || "-"}
                                  </dd>
                                </div>
                              </dl>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
