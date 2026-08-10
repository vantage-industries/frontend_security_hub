import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Menu,
  Moon,
  Sun,
  LogOut,
  ShieldCheck,
  AlertTriangle,
  PlusCircle,
  PencilLine,
  MinusCircle,
  RotateCcw,
  FileCode,
  Copy,
  Check,
} from "lucide-react";
import { api } from "../api/client";
import Sidebar from "../components/Sidebar";
import { useSession } from "../hooks/useSession";
import type { definitions } from "../api/types";

type FirewallStatusResponse = definitions["FirewallStatusResponse"];
type DeviationsResponse = definitions["DeviationsResponse"];
type ApplyFirewallResponse = definitions["ApplyFirewallResponse"];
type FirewallRule = definitions["FirewallRule"];

function errorMessage(err: unknown, fallback: string): string {
  const e = err as {
    response?: { data?: { error?: { code?: string; message?: string } } };
  };
  if (e?.response?.data?.error?.code === "firewall_generation_not_found") {
    return "Nie ma zapisanej takiej generacji.";
  }
  return e?.response?.data?.error?.message || fallback;
}

function ruleSummary(rule?: FirewallRule): string {
  if (!rule) return "-";
  const parts = [
    rule.direction,
    rule.protocol,
    rule.dst_domain || rule.dst_ip || rule.dst_zone,
    rule.dst_port ? `:${rule.dst_port}` : "",
    `→ ${rule.action}`,
  ].filter(Boolean);
  return parts.join(" ");
}

export default function Firewall() {
  const queryClient = useQueryClient();
  const { can } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<number | null>(null);
  const [rollbackTo, setRollbackTo] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: status } = useQuery({
    queryKey: ["firewall-status"],
    queryFn: async () => {
      const res = await api.get<FirewallStatusResponse>("/firewall/status");
      return res.data;
    },
  });

  const { data: deviations, isLoading: deviationsLoading } = useQuery({
    queryKey: ["firewall-deviations"],
    queryFn: async () => {
      const res = await api.get<DeviationsResponse>("/firewall/deviations");
      return res.data;
    },
  });

  const { data: preview, isLoading: previewLoading } = useQuery({
    queryKey: ["firewall-preview"],
    queryFn: async () => {
      const res = await api.get<string>("/firewall/preview", {
        responseType: "text",
      });
      return res.data;
    },
    enabled: showPreview,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["firewall-status"] });
    queryClient.invalidateQueries({ queryKey: ["system-status"] });
    queryClient.invalidateQueries({ queryKey: ["firewall-deviations"] });
    queryClient.invalidateQueries({ queryKey: ["firewall-preview"] });
  };

  const applyMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<ApplyFirewallResponse>("/firewall/apply");
      return res.data;
    },
    onSuccess: (data) => {
      setError(null);
      setApplied(data.generation ?? null);
      invalidate();
    },
    onError: (err: unknown) =>
      setError(errorMessage(err, "Nie udało się zastosować reguł.")),
  });

  const rollbackMutation = useMutation({
    mutationFn: async (generation: number) => {
      await api.post("/firewall/rollback", { generation });
      return generation;
    },
    onSuccess: (generation) => {
      setError(null);
      setApplied(generation);
      setRollbackTo("");
      invalidate();
    },
    onError: (err: unknown) =>
      setError(errorMessage(err, "Nie udało się przywrócić generacji.")),
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

  const handleCopyPreview = async () => {
    if (!preview) return;
    try {
      await navigator.clipboard.writeText(preview);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Przeglądarka nie pozwoliła na kopiowanie.");
    }
  };

  const added = deviations?.added ?? [];
  const modified = deviations?.modified ?? [];
  const removed = deviations?.removed ?? [];
  const totalDeviations = added.length + modified.length + removed.length;
  const generation = status?.applied_generation;
  const desired = status?.desired_generation;
  const inSync = status?.in_sync !== false;

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
              Firewall
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

        <main className="flex-1 p-4 md:p-6 overflow-auto space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                  Stan zastosowania
                </h2>
                <p className="mt-1 font-mono text-xs text-gray-500 dark:text-gray-400">
                  Zainstalowana #{generation ?? "-"} · pożądana #
                  {desired ?? "-"} ·{" "}
                  {status?.last_applied_at
                    ? new Date(status.last_applied_at).toLocaleString()
                    : "nigdy nie zastosowano"}
                </p>
                <p className="mt-2 max-w-xl text-xs text-gray-500 dark:text-gray-400">
                  Baza danych jest źródłem prawdy. Zastosowanie renderuje z niej
                  reguły i instaluje je w jednej operacji, zapisując numerowaną
                  generację, do której da się wrócić.
                </p>
              </div>

              <button
                onClick={() => applyMutation.mutate()}
                disabled={!can("firewall:apply") || applyMutation.isPending}
                title={
                  can("firewall:apply")
                    ? undefined
                    : "Wymaga uprawnienia firewall:apply"
                }
                className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ShieldCheck className="h-4 w-4" />
                {applyMutation.isPending ? "Stosuję..." : "Zastosuj reguły"}
              </button>
            </div>

            {!inSync && (
              <div className="mt-4 rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                <p className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Ruch nie chodzi według bieżącej konfiguracji
                </p>
                <p className="mt-1">
                  Baza opisuje generację #{desired ?? "-"}, a zainstalowana jest
                  #{generation ?? "-"}. Do czasu zastosowania obowiązują stare
                  reguły.
                </p>
              </div>
            )}

            {status?.rollback_hold && (
              <p className="mt-4 rounded border border-orange-300 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-800 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-300">
                Wstrzymanie po cofnięciu: appliance celowo trzyma starszy
                ruleset i nie zastosuje nowego automatycznie.
              </p>
            )}

            {status?.last_error && (
              <div className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                <p className="font-bold">
                  Ostatnia próba nie powiodła się
                  {status.last_error_at
                    ? ` (${new Date(status.last_error_at).toLocaleString()})`
                    : ""}
                </p>
                <p className="mt-1 font-mono">{status.last_error}</p>
              </div>
            )}

            {applied !== null && (
              <p className="mt-4 rounded bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                Zainstalowano generację #{applied}.
              </p>
            )}

            {error && (
              <p className="mt-4 rounded bg-red-100 px-3 py-2 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300">
                {error}
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                Odchylenia od profili polityk
              </h2>
              {!deviationsLoading && (
                <span
                  className={`rounded px-2 py-1 text-xs font-bold ${
                    totalDeviations === 0
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  }`}
                >
                  {totalDeviations === 0
                    ? "Zgodne z profilami"
                    : `${totalDeviations} odchyleń`}
                </span>
              )}
            </div>

            {deviationsLoading ? (
              <p className="text-xs text-gray-500">Pobieram raport...</p>
            ) : totalDeviations === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Aktywne reguły odpowiadają temu, co deklarują profile polityk.
              </p>
            ) : (
              <div className="space-y-5">
                {added.length > 0 && (
                  <div>
                    <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400">
                      <PlusCircle className="h-3.5 w-3.5" /> Dopisane ręcznie (
                      {added.length})
                    </h3>
                    <p className="mb-2 text-[11px] text-gray-500 dark:text-gray-400">
                      Reguły napisane przez człowieka albo przez IDS, bez
                      profilu za nimi.
                    </p>
                    <ul className="space-y-1">
                      {added.map((rule) => (
                        <li
                          key={rule.id}
                          className="rounded bg-gray-50 px-3 py-2 font-mono text-[11px] text-gray-700 dark:bg-gray-950 dark:text-gray-300"
                        >
                          {ruleSummary(rule)}
                          {rule.origin ? ` · źródło: ${rule.origin}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {modified.length > 0 && (
                  <div>
                    <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                      <PencilLine className="h-3.5 w-3.5" /> Zmienione względem
                      szablonu ({modified.length})
                    </h3>
                    <ul className="space-y-1">
                      {modified.map((item, index) => (
                        <li
                          key={item.rule?.id ?? index}
                          className="rounded bg-gray-50 px-3 py-2 text-[11px] dark:bg-gray-950"
                        >
                          <span className="font-mono text-gray-700 dark:text-gray-300">
                            {ruleSummary(item.rule)}
                          </span>
                          <span className="ml-2 text-amber-700 dark:text-amber-400">
                            różni się w:{" "}
                            {(item.changed_fields ?? []).join(", ")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {removed.length > 0 && (
                  <div>
                    <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-red-700 dark:text-red-400">
                      <MinusCircle className="h-3.5 w-3.5" /> Zniknęły z ruchu (
                      {removed.length})
                    </h3>
                    <p className="mb-2 text-[11px] text-gray-500 dark:text-gray-400">
                      Profil je deklaruje, ale nie ma po nich aktywnej reguły.
                    </p>
                    <ul className="space-y-1">
                      {removed.map((item, index) => (
                        <li
                          key={index}
                          className="rounded bg-gray-50 px-3 py-2 font-mono text-[11px] text-gray-700 dark:bg-gray-950 dark:text-gray-300"
                        >
                          VLAN {item.vlan_id ?? "-"} ·{" "}
                          {item.policy_rule?.direction}{" "}
                          {item.policy_rule?.dst_domain ||
                            item.policy_rule?.dst_zone ||
                            ""}
                          {item.policy_rule?.dst_port
                            ? `:${item.policy_rule.dst_port}`
                            : ""}{" "}
                          → {item.policy_rule?.action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-5">
            <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
              <RotateCcw className="h-4 w-4 text-orange-500" /> Powrót do
              wcześniejszej generacji
            </h2>
            <p className="mb-4 max-w-xl text-xs text-gray-500 dark:text-gray-400">
              Instaluje ruleset zapisany pod podanym numerem. Zmiany wprowadzone
              po tamtym momencie przestaną obowiązywać, dopóki nie zastosujesz
              reguł ponownie.
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={1}
                value={rollbackTo}
                onChange={(e) => setRollbackTo(e.target.value)}
                placeholder={
                  generation ? `np. ${Math.max(1, generation - 1)}` : "numer"
                }
                className="w-40 rounded border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 outline-none focus:border-orange-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              />
              <button
                onClick={() => {
                  const value = Number(rollbackTo);
                  if (!Number.isFinite(value) || value < 1) {
                    setError("Podaj numer generacji.");
                    return;
                  }
                  if (
                    window.confirm(
                      `Przywrócić ruleset z generacji #${value}? Reguły dodane później przestaną obowiązywać.`,
                    )
                  ) {
                    rollbackMutation.mutate(value);
                  }
                }}
                disabled={
                  !can("firewall:apply") ||
                  !rollbackTo ||
                  rollbackMutation.isPending
                }
                title={
                  can("firewall:apply")
                    ? undefined
                    : "Wymaga uprawnienia firewall:apply"
                }
                className="rounded bg-orange-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {rollbackMutation.isPending ? "Przywracam..." : "Przywróć"}
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                <FileCode className="h-4 w-4 text-gray-500" /> Wyrenderowany
                ruleset nftables
              </h2>
              <div className="flex gap-2">
                {showPreview && preview && (
                  <button
                    onClick={handleCopyPreview}
                    className="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    Kopiuj
                  </button>
                )}
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="rounded bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  {showPreview ? "Ukryj" : "Pokaż"}
                </button>
              </div>
            </div>

            {showPreview && (
              <div className="mt-4">
                {previewLoading ? (
                  <p className="text-xs text-gray-500">Renderuję...</p>
                ) : (
                  <pre className="max-h-96 overflow-auto rounded bg-gray-950 p-4 font-mono text-[11px] leading-relaxed text-emerald-300">
                    {preview || "Pusty ruleset."}
                  </pre>
                )}
                <p className="mt-2 flex items-start gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                  To podgląd tego, co zostałoby zainstalowane. Samo
                  wyrenderowanie niczego nie zmienia.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
