import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { api } from "../api/client";
import type { definitions } from "../api/types";

type Device = definitions["Device"];
type VLAN = definitions["VLAN"];
type Lease = definitions["Lease"];
type ListResponseVLAN =
  definitions["ListResponse-security-hub_internal_dto_VLAN"];
type ListResponseLease =
  definitions["ListResponse-security-hub_internal_dto_Lease"];

type Props = {
  device: Device;
  deviceId: string;
  onClose: () => void;
};

function ipToInt(ip: string): number | null {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    value = value * 256 + octet;
  }
  return value;
}

function ipInCidr(ip: string, cidr: string): boolean {
  const [base, bitsRaw] = cidr.split("/");
  const bits = Number(bitsRaw);
  const ipInt = ipToInt(ip);
  const baseInt = ipToInt(base);
  if (ipInt === null || baseInt === null) return false;
  if (!Number.isFinite(bits) || bits < 0 || bits > 32) return false;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipInt & mask) >>> 0 === (baseInt & mask) >>> 0;
}

function ipInRange(ip: string, start?: string, end?: string): boolean {
  if (!start || !end) return false;
  const value = ipToInt(ip);
  const from = ipToInt(start);
  const to = ipToInt(end);
  if (value === null || from === null || to === null) return false;
  return value >= from && value <= to;
}

function errorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { error?: { message?: string } } } };
  return e?.response?.data?.error?.message || fallback;
}

export default function StaticIpDialog({ device, deviceId, onClose }: Props) {
  const queryClient = useQueryClient();
  const [ipValue, setIpValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: vlanData } = useQuery({
    queryKey: ["vlans"],
    queryFn: async () => {
      const res = await api.get<ListResponseVLAN>("/vlans");
      return res.data;
    },
    staleTime: 300000,
  });

  const { data: leaseData } = useQuery({
    queryKey: ["device-leases", deviceId],
    queryFn: async () => {
      const res = await api.get<ListResponseLease>(
        `/devices/${deviceId}/leases`,
      );
      return res.data;
    },
  });

  const vlans: VLAN[] = vlanData?.data ?? [];
  const vlan = vlans.find((v) => v.vid === device.vlan_id);
  const leases: Lease[] = leaseData?.data ?? [];
  const currentLease = leases.find((l) => l.is_current);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["device", deviceId] });
    queryClient.invalidateQueries({ queryKey: ["device-leases", deviceId] });
    queryClient.invalidateQueries({ queryKey: ["devices"] });
  };

  const setStatic = useMutation({
    mutationFn: async (ip: string) => {
      await api.put(`/devices/${deviceId}/static-ip`, { ip_address: ip });
    },
    onSuccess: () => {
      invalidate();
      onClose();
    },
    onError: (err: unknown) =>
      setError(errorMessage(err, "Nie udało się ustawić statycznego IP.")),
  });

  const clearStatic = useMutation({
    mutationFn: async () => {
      await api.delete(`/devices/${deviceId}/static-ip`);
    },
    onSuccess: () => {
      invalidate();
      onClose();
    },
    onError: (err: unknown) =>
      setError(errorMessage(err, "Nie udało się wyczyścić rezerwacji.")),
  });

  const validation = useMemo(() => {
    const trimmed = ipValue.trim();
    if (!trimmed) return null;
    if (ipToInt(trimmed) === null) {
      return { blocking: true, text: "To nie jest poprawny adres IPv4." };
    }
    if (vlan?.subnet_cidr && !ipInCidr(trimmed, vlan.subnet_cidr)) {
      return {
        blocking: true,
        text: `Adres jest poza podsiecią VLAN-u ${vlan.vid} (${vlan.subnet_cidr}).`,
      };
    }
    if (trimmed === vlan?.gateway_ip) {
      return { blocking: true, text: "To adres bramy segmentu." };
    }
    if (ipInRange(trimmed, vlan?.dhcp_pool_start, vlan?.dhcp_pool_end)) {
      return {
        blocking: false,
        text: `Adres leży w puli DHCP (${vlan?.dhcp_pool_start} – ${vlan?.dhcp_pool_end}). Serwer może go odrzucić.`,
      };
    }
    return null;
  }, [ipValue, vlan]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <h2 className="text-sm font-bold text-gray-800 dark:text-white">
            Statyczny adres IP
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Zamknij"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <div className="rounded bg-gray-50 px-3 py-2 font-mono text-xs text-gray-600 dark:bg-gray-950 dark:text-gray-400">
            Bieżąca dzierżawa: {currentLease?.ip_address || "brak"}
            {currentLease?.is_static ? " (statyczna)" : ""}
            <br />
            Podsieć: {vlan?.subnet_cidr || "-"} · brama{" "}
            {vlan?.gateway_ip || "-"}
            <br />
            Pula DHCP: {vlan?.dhcp_pool_start || "-"} –{" "}
            {vlan?.dhcp_pool_end || "-"}
          </div>

          <div>
            <label
              htmlFor="static-ip"
              className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400"
            >
              Nowy adres
            </label>
            <input
              id="static-ip"
              autoFocus
              autoComplete="off"
              placeholder={vlan?.gateway_ip || "10.20.0.50"}
              value={ipValue}
              onChange={(e) => setIpValue(e.target.value)}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
            />
            {validation && (
              <p
                className={`mt-1.5 text-xs ${
                  validation.blocking
                    ? "text-red-600 dark:text-red-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {validation.text}
              </p>
            )}
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Rezerwacja zacznie obowiązywać przy następnym odnowieniu dzierżawy.
            Żeby zadziałała od razu, urządzenie musi się rozłączyć i połączyć
            ponownie.
          </p>

          {error && (
            <p className="rounded bg-red-100 px-3 py-2 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-800">
          <button
            onClick={() => {
              setError(null);
              clearStatic.mutate();
            }}
            disabled={clearStatic.isPending}
            className="text-xs font-semibold text-gray-500 hover:underline disabled:opacity-40 dark:text-gray-400"
          >
            {clearStatic.isPending ? "Czyszczę..." : "Wyczyść rezerwację"}
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Anuluj
            </button>
            <button
              onClick={() => {
                setError(null);
                setStatic.mutate(ipValue.trim());
              }}
              disabled={
                !ipValue.trim() ||
                validation?.blocking === true ||
                setStatic.isPending
              }
              className="rounded bg-blue-600 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {setStatic.isPending ? "Zapisuję..." : "Zapisz"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
