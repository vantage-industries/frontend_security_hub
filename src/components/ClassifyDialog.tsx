import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, X } from "lucide-react";
import { api } from "../api/client";
import type { definitions } from "../api/types";

type Device = definitions["Device"];
type VLAN = definitions["VLAN"];
type ClassifyResponse = definitions["ClassifyResponse"];
type ListResponseVLAN =
  definitions["ListResponse-security-hub_internal_dto_VLAN"];

type Props = {
  device: Device;
  deviceId: string;
  onClose: () => void;
};

export default function ClassifyDialog({ device, deviceId, onClose }: Props) {
  const queryClient = useQueryClient();
  const [targetVlan, setTargetVlan] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ClassifyResponse | null>(null);

  const { data: vlanData, isLoading: vlansLoading } = useQuery({
    queryKey: ["vlans"],
    queryFn: async () => {
      const res = await api.get<ListResponseVLAN>("/vlans");
      return res.data;
    },
    staleTime: 300000,
  });

  const vlans: VLAN[] = vlanData?.data ?? [];
  const selected = vlans.find((v) => String(v.vid) === targetVlan);

  const classify = useMutation({
    mutationFn: async (vlanId: number) => {
      const res = await api.post<ClassifyResponse>(
        `/devices/${deviceId}/classify`,
        { vlan_id: vlanId },
      );
      return res.data;
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["device", deviceId] });
      queryClient.invalidateQueries({ queryKey: ["device-leases", deviceId] });
      queryClient.invalidateQueries({
        queryKey: ["device-sessions", deviceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["device-firewall", deviceId],
      });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["system-status"] });
    },
    onError: (err: unknown) => {
      const e = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      setError(
        e?.response?.data?.error?.message ||
          "Nie udało się zmienić przypisania VLAN.",
      );
    },
  });

  const handleSubmit = () => {
    setError(null);
    const vlanId = Number(targetVlan);
    if (!Number.isFinite(vlanId) || vlanId === 0) {
      setError("Wybierz docelowy segment.");
      return;
    }
    classify.mutate(vlanId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <h2 className="text-sm font-bold text-gray-800 dark:text-white">
            Zmiana segmentu urządzenia
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
          {result ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                Urządzenie przeniesione.
              </p>
              <dl className="grid grid-cols-2 gap-y-2 rounded bg-gray-50 p-3 font-mono text-xs dark:bg-gray-950">
                <dt className="text-gray-500">Poprzedni VLAN</dt>
                <dd className="text-gray-800 dark:text-gray-200">
                  {result.previous_vlan_id ?? "-"}
                </dd>
                <dt className="text-gray-500">Nowy VLAN</dt>
                <dd className="text-gray-800 dark:text-gray-200">
                  {result.device?.vlan_id ?? "-"}
                </dd>
                <dt className="text-gray-500">Nowa dzierżawa</dt>
                <dd className="text-gray-800 dark:text-gray-200">
                  {result.new_lease_ip || "oczekuje"}
                </dd>
                <dt className="text-gray-500">Reguły zmaterializowane</dt>
                <dd className="text-gray-800 dark:text-gray-200">
                  {result.rules_applied ?? 0}
                </dd>
                <dt className="text-gray-500">Generacja firewalla</dt>
                <dd className="text-gray-800 dark:text-gray-200">
                  #{result.firewall_generation ?? "-"}
                </dd>
              </dl>
            </div>
          ) : (
            <>
              <div className="rounded bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-950 dark:text-gray-400">
                Obecnie: VLAN {device.vlan_id ?? "-"}
                {device.vlan_name ? ` (${device.vlan_name})` : ""} ·
                klasyfikacja {device.classification || "brak"}
              </div>

              <div>
                <label
                  htmlFor="target-vlan"
                  className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400"
                >
                  Docelowy segment
                </label>
                <select
                  id="target-vlan"
                  value={targetVlan}
                  onChange={(e) => setTargetVlan(e.target.value)}
                  disabled={vlansLoading}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                >
                  <option value="">
                    {vlansLoading ? "Pobieram segmenty..." : "— wybierz —"}
                  </option>
                  {vlans
                    .filter((v) => v.vid !== device.vlan_id)
                    .map((v) => (
                      <option key={v.vid} value={v.vid}>
                        VLAN {v.vid} — {v.display_name || v.name}
                        {v.is_deployed === false ? " (niewdrożony)" : ""}
                      </option>
                    ))}
                </select>
                {selected?.subnet_cidr && (
                  <p className="mt-1.5 font-mono text-[11px] text-gray-500">
                    {selected.subnet_cidr} · brama {selected.gateway_ip} ·
                    profil {selected.policy_profile || "-"}
                  </p>
                )}
              </div>

              {selected?.is_deployed === false && (
                <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                  Ten segment nie jest wdrożony. Urządzenie straci łączność do
                  czasu jego uruchomienia.
                </p>
              )}

              <div className="space-y-1.5 rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                <p className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="h-3.5 w-3.5" /> Co się stanie
                </p>
                <p>
                  Urządzenie dostanie nową dzierżawę IP w docelowej podsieci,
                  reguły firewalla zostaną zmaterializowane od nowa, a
                  połączenie zerwie się i nawiąże ponownie. Bieżąca sesja 802.11
                  zostanie zamknięta.
                </p>
              </div>
            </>
          )}

          {error && (
            <p className="rounded bg-red-100 px-3 py-2 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-800">
          <button
            onClick={onClose}
            className="rounded px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {result ? "Zamknij" : "Anuluj"}
          </button>
          {!result && (
            <button
              onClick={handleSubmit}
              disabled={!targetVlan || classify.isPending}
              className="rounded bg-blue-600 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {classify.isPending ? "Przenoszę..." : "Przenieś urządzenie"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
