import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Menu,
  Moon,
  Sun,
  LogOut,
  Bug,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Check,
  Ban,
  RotateCcw,
  AlertTriangle,
  ShieldQuestion,
  ShieldCheck,
  Clock,
  Database,
} from "lucide-react";
import { api } from "../api/client";
import Sidebar from "../components/Sidebar";
import { useSession } from "../hooks/useSession";
import type { definitions } from "../api/types";

type CVEFinding = definitions["CVEFinding"];
type CVEStatus = definitions["CVEStatus"];
type CVEScanResponse = definitions["CVEScanResponse"];
type DeviceCVEs = definitions["DeviceCVEs"];
type Device = definitions["Device"];
type ListResponseCVEFinding =
  definitions["ListResponse-security-hub_internal_dto_CVEFinding"];
type ListResponseDevice =
  definitions["ListResponse-security-hub_internal_dto_Device"];

const severityLabels: Record<string, string> = {
  critical: "Krytyczna",
  high: "Wysoka",
  medium: "Średnia",
  low: "Niska",
  info: "Informacyjna",
};

const severityStyles: Record<string, string> = {
  critical: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
  medium:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  low: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  info: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

function severityKey(severity?: string): string {
  const key = (severity || "").toLowerCase();
  return severityStyles[key] ? key : "info";
}

function severityLabel(severity?: string): string {
  return severityLabels[severityKey(severity)] || "Nieznana";
}

function severityClasses(severity?: string): string {
  return severityStyles[severityKey(severity)] || severityStyles.info;
}

function formatDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pl-PL");
}

function formatDateTime(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pl-PL");
}

function nvdUrl(cveId?: string): string {
  return `https://nvd.nist.gov/vuln/detail/${encodeURIComponent(cveId || "")}`;
}

function errorMessage(err: unknown, fallback: string): string {
  const e = err as {
    response?: { status?: number; data?: { error?: { message?: string } } };
  };
  if (e?.response?.status === 403) {
    return "Brak wymaganego uprawnienia.";
  }
  return e?.response?.data?.error?.message || fallback;
}

type FindingCardProps = {
  finding: CVEFinding;
  canAcknowledge: boolean;
  canDismiss: boolean;
};

function FindingCard({ finding, canAcknowledge, canDismiss }: FindingCardProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [dismissFormOpen, setDismissFormOpen] = useState(false);
  const [reasonInput, setReasonInput] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["cve-findings"] });
    queryClient.invalidateQueries({ queryKey: ["cve-status"] });
    queryClient.invalidateQueries({ queryKey: ["device-cves"] });
  };

  const acknowledge = useMutation({
    mutationFn: async () => {
      await api.post(`/cve/findings/${finding.id}/acknowledge`);
    },
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: (err: unknown) =>
      setError(errorMessage(err, "Nie udało się potwierdzić podatności.")),
  });

  const dismiss = useMutation({
    mutationFn: async (reason: string) => {
      await api.post(`/cve/findings/${finding.id}/dismiss`, { reason });
    },
    onSuccess: () => {
      setError(null);
      setDismissFormOpen(false);
      setReasonInput("");
      invalidate();
    },
    onError: (err: unknown) =>
      setError(errorMessage(err, "Nie udało się odrzucić podatności.")),
  });

  const undismiss = useMutation({
    mutationFn: async () => {
      await api.delete(`/cve/findings/${finding.id}/dismiss`);
    },
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: (err: unknown) =>
      setError(errorMessage(err, "Nie udało się przywrócić podatności.")),
  });

  return (
    <div
      className={`rounded-lg border p-4 ${
        finding.dismissed
          ? "border-gray-200 bg-gray-50 opacity-70 dark:border-gray-800 dark:bg-gray-950/50"
          : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${severityClasses(finding.severity)}`}
            >
              {severityLabel(finding.severity)}
            </span>
            {typeof finding.cvss_score === "number" && (
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-bold font-mono ${severityClasses(finding.severity)}`}
                title={
                  finding.cvss_vector
                    ? `${finding.cvss_version || "CVSS"}: ${finding.cvss_vector}`
                    : undefined
                }
              >
                CVSS {finding.cvss_score.toFixed(1)}
              </span>
            )}
            <a
              href={nvdUrl(finding.cve_id)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:underline dark:text-blue-400"
            >
              {finding.cve_id}
              <ExternalLink className="h-3 w-3" />
            </a>
            <span className="text-[11px] text-gray-400">
              opublikowano {formatDate(finding.published)}
            </span>
            {finding.dismissed && (
              <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                Odrzucona
              </span>
            )}
            {finding.acknowledged && (
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                Potwierdzona
              </span>
            )}
          </div>

          {finding.description && (
            <p className="text-xs text-gray-600 dark:text-gray-300">
              {finding.description}
            </p>
          )}

          <div
            className="inline-flex items-start gap-1.5 rounded border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400"
            title="Dopasowanie jest oparte na nazwie sprzętu, nie na wersji oprogramowania — to sygnał do sprawdzenia, nie potwierdzony exploit."
          >
            <ShieldQuestion className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Sprzęt pasuje do tego biuletynu ({finding.match_basis || "dopasowanie"}
              {finding.matched_on ? `: „${finding.matched_on}”` : ""}) — to nie
              jest potwierdzony exploit.
            </span>
          </div>

          {finding.acknowledged && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Potwierdzone przez {finding.acknowledged_by || "-"}
              {finding.acknowledged_at
                ? ` · ${formatDateTime(finding.acknowledged_at)}`
                : ""}
            </p>
          )}
          {finding.dismissed && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Odrzucone{finding.dismissed_reason ? `: ${finding.dismissed_reason}` : ""}
            </p>
          )}

          {error && (
            <p className="rounded bg-red-100 px-2 py-1 text-[11px] text-red-700 dark:bg-red-950/50 dark:text-red-300">
              {error}
            </p>
          )}

          {dismissFormOpen && (
            <div className="flex flex-wrap items-center gap-2 rounded border border-gray-200 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-950">
              <input
                type="text"
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder="Powód odrzucenia (opcjonalnie)"
                className="min-w-0 flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
              <button
                onClick={() => dismiss.mutate(reasonInput)}
                disabled={dismiss.isPending}
                className="rounded bg-gray-700 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-gray-800 disabled:opacity-40"
              >
                {dismiss.isPending ? "..." : "Potwierdź odrzucenie"}
              </button>
              <button
                onClick={() => {
                  setDismissFormOpen(false);
                  setReasonInput("");
                }}
                className="text-[11px] font-semibold text-gray-500 hover:underline"
              >
                Anuluj
              </button>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-1.5">
          {!finding.dismissed && (
            <button
              onClick={() => acknowledge.mutate()}
              disabled={
                !canAcknowledge || finding.acknowledged || acknowledge.isPending
              }
              title={
                canAcknowledge ? undefined : "Wymaga uprawnienia cve:acknowledge"
              }
              className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check className="h-3.5 w-3.5" />
              {finding.acknowledged ? "Potwierdzona" : "Potwierdź"}
            </button>
          )}
          {finding.dismissed ? (
            <button
              onClick={() => undismiss.mutate()}
              disabled={!canDismiss || undismiss.isPending}
              title={canDismiss ? undefined : "Wymaga uprawnienia cve:dismiss"}
              className="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Przywróć
            </button>
          ) : (
            <button
              onClick={() => setDismissFormOpen((v) => !v)}
              disabled={!canDismiss}
              title={canDismiss ? undefined : "Wymaga uprawnienia cve:dismiss"}
              className="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <Ban className="h-3.5 w-3.5" />
              Odrzuć
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

type ScanButtonProps = {
  deviceId: string;
  canScan: boolean;
};

function ScanButton({ deviceId, canScan }: ScanButtonProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const scan = useMutation({
    mutationFn: async () => {
      const res = await api.post<CVEScanResponse>(
        `/devices/${deviceId}/cve-scan`,
      );
      return res.data;
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["cve-findings"] });
      queryClient.invalidateQueries({ queryKey: ["cve-status"] });
      queryClient.invalidateQueries({ queryKey: ["device-cves", deviceId] });
    },
    onError: (err: unknown) =>
      setError(errorMessage(err, "Nie udało się przeskanować urządzenia.")),
  });

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={(e) => {
          e.stopPropagation();
          scan.mutate();
        }}
        disabled={!canScan || scan.isPending}
        title={canScan ? "Odpytuje NVD na żywo — może potrwać kilka sekund" : "Wymaga uprawnienia cve:scan"}
        className="flex items-center gap-1.5 rounded border border-blue-600 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-blue-400 dark:hover:bg-blue-950/30"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${scan.isPending ? "animate-spin" : ""}`} />
        {scan.isPending ? "Skanowanie..." : "Skanuj teraz"}
      </button>
      {error && (
        <p className="max-w-[220px] text-right text-[11px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

type DeviceGroup = {
  deviceId: string;
  deviceName: string;
  findings: CVEFinding[];
};

type DeviceGroupRowProps = {
  group: DeviceGroup;
  expanded: boolean;
  onToggle: () => void;
  canAcknowledge: boolean;
  canDismiss: boolean;
  canScan: boolean;
};

function DeviceGroupRow({
  group,
  expanded,
  onToggle,
  canAcknowledge,
  canDismiss,
  canScan,
}: DeviceGroupRowProps) {
  const active = group.findings.filter((f) => !f.dismissed);
  const critical = active.filter((f) => severityKey(f.severity) === "critical").length;
  const high = active.filter((f) => severityKey(f.severity) === "high").length;
  const sorted = [...group.findings].sort((a, b) => {
    const ta = a.published ? new Date(a.published).getTime() : 0;
    const tb = b.published ? new Date(b.published).getTime() : 0;
    return tb - ta;
  });

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex min-w-0 items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
          )}
          <span className="truncate text-sm font-bold text-gray-900 dark:text-white">
            {group.deviceName}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {critical > 0 && (
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/40 dark:text-red-400">
                {critical} krytycznych
              </span>
            )}
            {high > 0 && (
              <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-900/40 dark:text-orange-400">
                {high} wysokich
              </span>
            )}
            <span className="text-[11px] text-gray-400">
              {group.findings.length}{" "}
              {group.findings.length === 1 ? "podatność" : "podatności"}
            </span>
          </div>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <ScanButton deviceId={group.deviceId} canScan={canScan} />
        </div>
      </div>

      {expanded && (
        <div className="space-y-3 border-t border-gray-200 p-4 dark:border-gray-800">
          {sorted.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              canAcknowledge={canAcknowledge}
              canDismiss={canDismiss}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type OtherDeviceRowProps = {
  device: Device;
  fetch: boolean;
  canScan: boolean;
};

function OtherDeviceRow({ device, fetch, canScan }: OtherDeviceRowProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["device-cves", device.id],
    queryFn: async () => {
      const res = await api.get<DeviceCVEs>(`/devices/${device.id}/cves?limit=1`);
      return res.data;
    },
    enabled: fetch && !!device.id,
    retry: false,
  });

  const scan = data?.scan;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm text-gray-700 dark:text-gray-300">
          {device.display_name || "bez nazwy"}
        </span>
        {!fetch || isLoading ? (
          <span className="text-[11px] text-gray-400">-</span>
        ) : scan?.never_scanned ? (
          <span className="flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <Clock className="h-3 w-3" />
            Nigdy nie skanowano
          </span>
        ) : scan?.ok ? (
          <span className="flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
            <ShieldCheck className="h-3 w-3" />
            Czyste
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            <AlertTriangle className="h-3 w-3" />
            Błąd skanowania
          </span>
        )}
      </div>
      <ScanButton deviceId={device.id || ""} canScan={canScan} />
    </div>
  );
}

export default function CVE() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [expandedDevices, setExpandedDevices] = useState<Set<string>>(new Set());
  const [showOtherDevices, setShowOtherDevices] = useState(false);

  const { can } = useSession();
  const canRead = can("cve:read");

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ["cve-status"],
    queryFn: async () => {
      const res = await api.get<CVEStatus>("/cve/status");
      return res.data;
    },
    enabled: canRead,
    retry: false,
    refetchInterval: 30000,
  });

  const {
    data: findingsData,
    isLoading: findingsLoading,
    error: findingsError,
  } = useQuery({
    queryKey: ["cve-findings"],
    queryFn: async () => {
      // The backend's `dismissed` filter is exclusive (true = only dismissed,
      // false/absent = only active), not additive — two calls are merged here
      // so both active and dismissed findings can be triaged in one view.
      const [active, dismissed] = await Promise.all([
        api.get<ListResponseCVEFinding>("/cve/findings?limit=500"),
        api.get<ListResponseCVEFinding>("/cve/findings?limit=500&dismissed=true"),
      ]);
      return [...(active.data.data ?? []), ...(dismissed.data.data ?? [])];
    },
    enabled: canRead,
    retry: false,
  });

  const { data: devicesData, isLoading: devicesLoading } = useQuery({
    queryKey: ["cve-connected-devices"],
    queryFn: async () => {
      const res = await api.get<ListResponseDevice>(
        "/devices?connected=true&limit=500",
      );
      return res.data;
    },
    enabled: canRead,
    retry: false,
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

  const toggleDevice = (deviceId: string) => {
    setExpandedDevices((prev) => {
      const next = new Set(prev);
      if (next.has(deviceId)) next.delete(deviceId);
      else next.add(deviceId);
      return next;
    });
  };

  const connectedDevices = devicesData?.data ?? [];
  const connectedIds = new Set(connectedDevices.map((d) => d.id).filter(Boolean));

  const groupsByDevice = new Map<string, DeviceGroup>();
  for (const finding of findingsData ?? []) {
    if (!finding.device_id || !connectedIds.has(finding.device_id)) continue;
    let group = groupsByDevice.get(finding.device_id);
    if (!group) {
      group = {
        deviceId: finding.device_id,
        deviceName: finding.device_name || finding.device_id,
        findings: [],
      };
      groupsByDevice.set(finding.device_id, group);
    }
    group.findings.push(finding);
  }

  const deviceGroups = [...groupsByDevice.values()].sort((a, b) => {
    const maxA = Math.max(0, ...a.findings.map((f) => f.cvss_score ?? 0));
    const maxB = Math.max(0, ...b.findings.map((f) => f.cvss_score ?? 0));
    return maxB - maxA;
  });

  const otherDevices = connectedDevices.filter(
    (d) => d.id && !groupsByDevice.has(d.id),
  );

  const totals = status?.totals;
  const sweep = status?.sweep;

  const canAcknowledge = can("cve:acknowledge");
  const canDismiss = can("cve:dismiss");
  const canScan = can("cve:scan");

  const showUnreachableBanner = status && status.enabled && !status.reachable;
  const showAuthNotice =
    status && status.enabled && status.reachable && status.authorized === false;
  const showDisabledBanner = status && status.enabled === false;

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
            <h1 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <Bug className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              CVE
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
          <div className="max-w-5xl mx-auto space-y-6">
            {!canRead ? (
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-8 text-center text-sm text-gray-500">
                Brak uprawnienia cve:read do przeglądania podatności.
              </div>
            ) : (
              <>
                {showDisabledBanner && (
                  <div className="rounded border border-gray-300 bg-gray-50 p-4 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                    <p className="flex items-center gap-1.5 font-bold">
                      <Database className="h-4 w-4" />
                      Skanowanie CVE nie jest włączone na tym hubie.
                    </p>
                  </div>
                )}
                {showUnreachableBanner && (
                  <div className="rounded border border-red-300 bg-red-50 p-4 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                    <p className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="h-4 w-4" />
                      Katalog CVE ({status?.source || "NVD"}) jest nieosiągalny.
                    </p>
                    <p className="mt-1">
                      Pusta lista podatności nie oznacza, że urządzenia są
                      bezpieczne — po prostu nic nie zostało sprawdzone.
                      {status?.last_error ? ` Błąd: ${status.last_error}` : ""}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Krytyczne
                    </p>
                    <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
                      {statusLoading ? "..." : totals?.critical ?? 0}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Wysokie
                    </p>
                    <p className="mt-1 text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {statusLoading ? "..." : totals?.high ?? 0}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Bez oceny
                    </p>
                    <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">
                      {statusLoading ? "..." : totals?.unreviewed ?? 0}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Przeskanowane urządzenia
                    </p>
                    <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">
                      {statusLoading ? "..." : totals?.devices_scanned ?? 0}
                    </p>
                  </div>
                </div>

                {status && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-[11px] text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Database className="h-3 w-3" />
                      Źródło: <span className="font-mono">{status.source || "-"}</span>
                    </span>
                    <span>
                      Status:{" "}
                      {status.enabled
                        ? status.reachable
                          ? "połączono"
                          : "brak połączenia"
                        : "wyłączone"}
                    </span>
                    {status.budget && <span>Budżet: {status.budget}</span>}
                    {status.last_query_at && (
                      <span>
                        Ostatnie zapytanie: {formatDateTime(status.last_query_at)}
                      </span>
                    )}
                    {sweep?.at && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Ostatnie przeczesanie: {formatDateTime(sweep.at)}
                        {typeof sweep.scanned === "number"
                          ? ` (${sweep.scanned} zeskanowanych, ${sweep.skipped ?? 0} pominiętych, ${sweep.failed ?? 0} błędów)`
                          : ""}
                      </span>
                    )}
                    {showAuthNotice && (
                      <span className="text-gray-400 dark:text-gray-500">
                        Brak klucza API {status?.source || "NVD"} — działa w
                        trybie publicznym z niższym limitem zapytań
                      </span>
                    )}
                  </div>
                )}

                <div>
                  <h2 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">
                    Urządzenia z podatnościami
                  </h2>

                  {findingsLoading || devicesLoading ? (
                    <div className="rounded-lg border border-gray-200 bg-white py-8 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900">
                      Wczytywanie listy podatności...
                    </div>
                  ) : findingsError ? (
                    <div className="rounded-lg border border-gray-200 bg-white py-8 text-center text-sm text-red-600 dark:border-gray-800 dark:bg-gray-900 dark:text-red-400">
                      {errorMessage(
                        findingsError,
                        "Nie udało się pobrać listy podatności.",
                      )}
                    </div>
                  ) : deviceGroups.length === 0 ? (
                    <div className="rounded-lg border border-gray-200 bg-white py-8 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900">
                      Nie znaleziono podatności wśród podłączonych urządzeń.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {deviceGroups.map((group) => (
                        <DeviceGroupRow
                          key={group.deviceId}
                          group={group}
                          expanded={expandedDevices.has(group.deviceId)}
                          onToggle={() => toggleDevice(group.deviceId)}
                          canAcknowledge={canAcknowledge}
                          canDismiss={canDismiss}
                          canScan={canScan}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {!devicesLoading && otherDevices.length > 0 && (
                  <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                    <button
                      onClick={() => setShowOtherDevices((v) => !v)}
                      className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
                    >
                      <span className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                        {showOtherDevices ? (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                        Pozostałe podłączone urządzenia ({otherDevices.length})
                      </span>
                      <span className="text-[11px] text-gray-400">
                        bez wykrytych podatności
                      </span>
                    </button>
                    {showOtherDevices && (
                      <div className="divide-y divide-gray-100 border-t border-gray-200 dark:divide-gray-800 dark:border-gray-800">
                        {otherDevices.map((device) => (
                          <OtherDeviceRow
                            key={device.id}
                            device={device}
                            fetch={showOtherDevices}
                            canScan={canScan}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
