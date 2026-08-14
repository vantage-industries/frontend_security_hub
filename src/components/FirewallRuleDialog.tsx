import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, AlertTriangle } from "lucide-react";
import { api } from "../api/client";
import type { definitions } from "../api/types";

type CreateFirewallRuleRequest = definitions["CreateFirewallRuleRequest"];
type VLAN = definitions["VLAN"];
type ListResponseVLAN =
  definitions["ListResponse-security-hub_internal_dto_VLAN"];
type Device = definitions["Device"];
type ListResponseDevice =
  definitions["ListResponse-security-hub_internal_dto_Device"];

type Props = {
  onClose: () => void;
};

type FieldErrors = {
  vlan_id?: string;
  device_id?: string;
  destination?: string;
  dst_port?: string;
  priority?: string;
};

export default function FirewallRuleDialog({ onClose }: Props) {
  const queryClient = useQueryClient();

  const [scope, setScope] = useState<"vlan" | "device">("vlan");
  const [direction, setDirection] = useState<
    "egress" | "ingress" | "inter_vlan"
  >("egress");
  const [action, setAction] = useState<"accept" | "drop" | "reject">("drop");
  const [protocol, setProtocol] = useState<"" | "tcp" | "udp" | "icmp">("");
  const [vlanId, setVlanId] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [dstDomain, setDstDomain] = useState("");
  const [dstIp, setDstIp] = useState("");
  const [dstZone, setDstZone] = useState("");
  const [dstPort, setDstPort] = useState("");
  const [priority, setPriority] = useState("");
  const [comment, setComment] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const { data: vlanData } = useQuery({
    queryKey: ["vlans"],
    queryFn: async () => {
      const res = await api.get<ListResponseVLAN>("/vlans");
      return res.data;
    },
    staleTime: 300000,
  });

  const { data: deviceData, isLoading: devicesLoading } = useQuery({
    queryKey: ["devices", "rule-picker"],
    queryFn: async () => {
      const res = await api.get<ListResponseDevice>("/devices?limit=500");
      return res.data;
    },
    staleTime: 60000,
    enabled: scope === "device",
  });

  const vlans: VLAN[] = vlanData?.data ?? [];
  const devices: Device[] = [...(deviceData?.data ?? [])].sort((a, b) =>
    (a.display_name || a.model_name || "").localeCompare(
      b.display_name || b.model_name || "",
      "pl",
    ),
  );

  const create = useMutation({
    mutationFn: async (payload: CreateFirewallRuleRequest) => {
      await api.post("/firewall/rules", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["firewall-deviations"] });
      queryClient.invalidateQueries({ queryKey: ["firewall-status"] });
      queryClient.invalidateQueries({ queryKey: ["firewall-preview"] });
      onClose();
    },
    onError: (err: unknown) => {
      const body = (
        err as {
          response?: {
            data?: {
              error?: {
                code?: string;
                message?: string;
                fields?: { [key: string]: string };
              };
            };
          };
        }
      )?.response?.data?.error;

      const next: FieldErrors = {};
      if (body?.fields?.vlan_id) next.vlan_id = body.fields.vlan_id;
      if (body?.fields?.device_id) next.device_id = body.fields.device_id;
      if (body?.fields?.dst_port) next.dst_port = body.fields.dst_port;
      setFieldErrors(next);

      setFormError(
        Object.keys(next).length > 0
          ? null
          : body?.message || "Nie udało się utworzyć reguły.",
      );
    },
  });

  const handleSubmit = () => {
    setFormError(null);
    const next: FieldErrors = {};

    if (scope === "vlan" && !vlanId) {
      next.vlan_id = "Wskaż segment, którego dotyczy reguła.";
    }
    if (scope === "device" && !deviceId) {
      next.device_id = "Wskaż urządzenie, którego dotyczy reguła.";
    }
    if (!dstDomain.trim() && !dstIp.trim() && !dstZone.trim()) {
      next.destination =
        "Podaj cel reguły — domenę, adres IP albo strefę docelową.";
    }
    if (dstPort && (Number(dstPort) < 1 || Number(dstPort) > 65535)) {
      next.dst_port = "Port musi mieścić się w zakresie 1–65535.";
    }
    if (priority && Number(priority) < 0) {
      next.priority = "Priorytet nie może być ujemny.";
    }

    if (Object.keys(next).length > 0) {
      setFieldErrors(next);
      return;
    }

    const payload: CreateFirewallRuleRequest = {
      scope,
      direction,
      action,
    };
    if (scope === "vlan") payload.vlan_id = Number(vlanId);
    if (scope === "device") payload.device_id = deviceId.trim();
    if (protocol) payload.protocol = protocol;
    if (dstDomain.trim()) payload.dst_domain = dstDomain.trim();
    if (dstIp.trim()) payload.dst_ip = dstIp.trim();
    if (dstZone.trim()) payload.dst_zone = dstZone.trim();
    if (dstPort) payload.dst_port = Number(dstPort);
    if (priority) payload.priority = Number(priority);
    if (comment.trim()) payload.comment = comment.trim();

    setFieldErrors({});
    create.mutate(payload);
  };

  const inputClass = (error?: string) =>
    `w-full rounded border px-3 py-2 text-sm outline-none dark:bg-gray-950 dark:text-white ${
      error
        ? "border-red-500 focus:border-red-500"
        : "border-gray-300 focus:border-blue-500 dark:border-gray-700"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <h2 className="text-sm font-bold text-gray-800 dark:text-white">
            Nowa reguła firewalla
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Zamknij"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">
                Zasięg
              </label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as "vlan" | "device")}
                className={inputClass()}
              >
                <option value="vlan">Cały segment</option>
                <option value="device">Jedno urządzenie</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">
                Kierunek
              </label>
              <select
                value={direction}
                onChange={(e) =>
                  setDirection(
                    e.target.value as "egress" | "ingress" | "inter_vlan",
                  )
                }
                className={inputClass()}
              >
                <option value="egress">Wychodzący</option>
                <option value="ingress">Przychodzący</option>
                <option value="inter_vlan">Między segmentami</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">
                Decyzja
              </label>
              <select
                value={action}
                onChange={(e) =>
                  setAction(e.target.value as "accept" | "drop" | "reject")
                }
                className={inputClass()}
              >
                <option value="drop">Odrzuć po cichu</option>
                <option value="reject">Odrzuć z odpowiedzią</option>
                <option value="accept">Przepuść</option>
              </select>
            </div>
          </div>

          {scope === "vlan" ? (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">
                Segment
              </label>
              <select
                value={vlanId}
                onChange={(e) => setVlanId(e.target.value)}
                className={inputClass(fieldErrors.vlan_id)}
              >
                <option value="">— wybierz —</option>
                {vlans.map((v) => (
                  <option key={v.vid} value={v.vid}>
                    VLAN {v.vid} — {v.display_name || v.name}
                  </option>
                ))}
              </select>
              {fieldErrors.vlan_id && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                  {fieldErrors.vlan_id}
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">
                Urządzenie
              </label>
              <select
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                disabled={devicesLoading}
                className={inputClass(fieldErrors.device_id)}
              >
                <option value="">
                  {devicesLoading ? "Pobieram urządzenia..." : "— wybierz —"}
                </option>
                {devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.display_name ||
                      device.model_name ||
                      device.macs?.[0]?.mac ||
                      device.id}
                    {device.vlan_id ? ` · VLAN ${device.vlan_id}` : ""}
                  </option>
                ))}
              </select>
              {fieldErrors.device_id && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                  {fieldErrors.device_id}
                </p>
              )}
            </div>
          )}

          <div className="rounded border border-gray-200 p-3 dark:border-gray-800">
            <p className="mb-3 text-xs font-semibold text-gray-600 dark:text-gray-400">
              Cel reguły — wypełnij co najmniej jedno pole
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-[11px] text-gray-500">
                  Domena
                </label>
                <input
                  value={dstDomain}
                  onChange={(e) => setDstDomain(e.target.value)}
                  placeholder="api.example.com"
                  className={`${inputClass()} font-mono`}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-gray-500">
                  Adres IP
                </label>
                <input
                  value={dstIp}
                  onChange={(e) => setDstIp(e.target.value)}
                  placeholder="10.20.0.5"
                  className={`${inputClass()} font-mono`}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-gray-500">
                  Strefa
                </label>
                <input
                  value={dstZone}
                  onChange={(e) => setDstZone(e.target.value)}
                  placeholder="wan / lan"
                  className={`${inputClass()} font-mono`}
                />
              </div>
            </div>

            {fieldErrors.destination && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                {fieldErrors.destination}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">
                Protokół
              </label>
              <select
                value={protocol}
                onChange={(e) =>
                  setProtocol(e.target.value as "" | "tcp" | "udp" | "icmp")
                }
                className={inputClass()}
              >
                <option value="">Dowolny</option>
                <option value="tcp">TCP</option>
                <option value="udp">UDP</option>
                <option value="icmp">ICMP</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">
                Port docelowy
              </label>
              <input
                type="number"
                min={1}
                max={65535}
                value={dstPort}
                onChange={(e) => setDstPort(e.target.value)}
                placeholder="dowolny"
                className={`${inputClass(fieldErrors.dst_port)} font-mono`}
              />
              {fieldErrors.dst_port && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                  {fieldErrors.dst_port}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">
                Priorytet
              </label>
              <input
                type="number"
                min={0}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                placeholder="domyślny"
                className={`${inputClass(fieldErrors.priority)} font-mono`}
              />
              {fieldErrors.priority && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                  {fieldErrors.priority}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">
              Uzasadnienie
            </label>
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Po co ta reguła — przeczyta to ktoś za pół roku"
              className={inputClass()}
            />
          </div>

          <div className="flex items-start gap-2 rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>
              Reguła trafia do bazy, ale ruchu jeszcze nie zmienia. Zacznie
              obowiązywać dopiero po zastosowaniu reguł, a w raporcie odchyleń
              pojawi się jako dopisana ręcznie.
            </p>
          </div>

          {formError && (
            <p className="rounded bg-red-100 px-3 py-2 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300">
              {formError}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-800">
          <button
            onClick={onClose}
            className="rounded px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Anuluj
          </button>
          <button
            onClick={handleSubmit}
            disabled={create.isPending}
            className="rounded bg-blue-600 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
          >
            {create.isPending ? "Zapisuję..." : "Utwórz regułę"}
          </button>
        </div>
      </div>
    </div>
  );
}
