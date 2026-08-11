import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Menu,
  Moon,
  Sun,
  LogOut,
  Search,
  Ban,
  ShieldCheck,
  Globe,
  RefreshCw,
} from "lucide-react";
import { api } from "../api/client";
import Sidebar from "../components/Sidebar";
import { useSession } from "../hooks/useSession";
import type { definitions } from "../api/types";

type DNSDomain = definitions["DNSDomain"];
type ListResponseDNSDomain =
  definitions["ListResponse-security-hub_internal_dto_DNSDomain"];

type Filter = "all" | "new" | "blocked";

export default function DnsDomains() {
  const queryClient = useQueryClient();
  const { can } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["dns-domains", filter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "200" });
      if (filter === "new") params.set("is_new", "true");
      if (filter === "blocked") params.set("is_blocked", "true");
      const res = await api.get<ListResponseDNSDomain>(
        `/dns/domains?${params.toString()}`,
      );
      return res.data;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["dns-domains"] });
    queryClient.invalidateQueries({ queryKey: ["device-domains"] });
  };

  const reportError = (err: unknown, fallback: string) => {
    const e = err as { response?: { data?: { error?: { message?: string } } } };
    setError(e?.response?.data?.error?.message || fallback);
  };

  const blockMutation = useMutation({
    mutationFn: async ({ id, blocked }: { id: number; blocked: boolean }) => {
      if (blocked) {
        await api.delete(`/dns/domains/${id}/block`);
      } else {
        await api.post(`/dns/domains/${id}/block`);
      }
    },
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: (err: unknown) =>
      reportError(err, "Nie udało się zmienić blokady."),
  });

  const trustMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/dns/domains/${id}/trust`);
    },
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: (err: unknown) =>
      reportError(err, "Nie udało się oznaczyć jako zaufana."),
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

  const domains: DNSDomain[] = (data?.data ?? []).filter((d) =>
    (d.domain || "").toLowerCase().includes(search.toLowerCase()),
  );

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
              Ruch DNS
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
          <p className="mb-4 max-w-2xl text-xs text-gray-500 dark:text-gray-400">
            Domeny, o które pytały urządzenia. Jeden wiersz to jedna para
            urządzenie–domena. Zablokowanie dotyczy wyłącznie tego urządzenia,
            na którym domenę zaobserwowano.
          </p>

          <div className="mb-4 flex flex-wrap items-center gap-3 rounded border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Szukaj domeny..."
                className="w-full rounded border border-gray-300 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              />
            </div>

            <div className="flex gap-1">
              {(
                [
                  ["all", "Wszystkie"],
                  ["new", "Nowe"],
                  ["blocked", "Zablokowane"],
                ] as [Filter, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setFilter(value)}
                  className={`rounded px-3 py-1.5 text-xs font-bold transition-colors ${
                    filter === value
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
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
                    <th className="px-4 py-3">Domena</th>
                    <th className="px-4 py-3">Zapytania</th>
                    <th className="px-4 py-3">Ostatnio</th>
                    <th className="px-4 py-3">Stan</th>
                    <th className="px-4 py-3 text-right">Akcje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500">
                        Pobieram...
                      </td>
                    </tr>
                  ) : domains.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500">
                        Brak domen spełniających kryteria.
                      </td>
                    </tr>
                  ) : (
                    domains.map((domain) => (
                      <tr
                        key={domain.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 shrink-0 text-gray-400" />
                            <span className="font-mono text-xs text-gray-800 dark:text-gray-200">
                              {domain.domain}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">
                          {domain.query_count ?? 0}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-gray-500">
                          {domain.last_seen
                            ? new Date(domain.last_seen).toLocaleString()
                            : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {domain.is_blocked && (
                              <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/40 dark:text-red-400">
                                Zablokowana
                              </span>
                            )}
                            {domain.is_trusted && (
                              <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                                Zaufana
                              </span>
                            )}
                            {domain.is_new && (
                              <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                                Nowa
                              </span>
                            )}
                            {!domain.is_blocked &&
                              !domain.is_trusted &&
                              !domain.is_new && (
                                <span className="text-[11px] text-gray-400">
                                  znana
                                </span>
                              )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            {!domain.is_trusted && (
                              <button
                                onClick={() =>
                                  trustMutation.mutate(domain.id as number)
                                }
                                disabled={
                                  !can("dns:trust") || trustMutation.isPending
                                }
                                title={
                                  can("dns:trust")
                                    ? "Oznacz jako zaufaną"
                                    : "Wymaga uprawnienia dns:trust"
                                }
                                className="rounded p-1.5 text-gray-500 transition-colors hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-emerald-900/30"
                              >
                                <ShieldCheck className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() =>
                                blockMutation.mutate({
                                  id: domain.id as number,
                                  blocked: !!domain.is_blocked,
                                })
                              }
                              disabled={
                                !can("dns:block") || blockMutation.isPending
                              }
                              title={
                                can("dns:block")
                                  ? domain.is_blocked
                                    ? "Zdejmij blokadę"
                                    : "Zablokuj domenę"
                                  : "Wymaga uprawnienia dns:block"
                              }
                              className={`rounded p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                                domain.is_blocked
                                  ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                                  : "text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
                              }`}
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
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
