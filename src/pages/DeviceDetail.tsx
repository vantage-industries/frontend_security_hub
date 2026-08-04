import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Activity,
  Network,
  Cpu,
  ShieldAlert,
  Wifi,
  Key,
  Globe,
  Trash2,
  Save,
  Edit2,
  X,
} from "lucide-react";
import { api } from "../api/client";
import type { definitions } from "../api/types";

type BaseDevice = definitions["Device"];
type Device = BaseDevice & {
  id?: string;
  name?: string;
  ip_address?: string;
  mac_address?: string;
  is_random_mac?: boolean;
  vendor?: string;
  vlan_id?: number;
  is_active?: boolean;
  classification?: string;
  classified_by?: string;
  classified_at?: string;
  last_seen?: string;
  first_seen?: string;
  notes?: string;
  is_static_ip?: boolean;
  psk?: string;
};

type DeviceSession = {
  id: string;
  start_time?: string;
  end_time?: string;
  ssid?: string;
  bssid?: string;
  rx_bytes?: number;
  tx_bytes?: number;
  disconnect_reason?: string;
};

type DeviceLease = {
  id: string;
  ip_address?: string;
  mac_address?: string;
  hostname?: string;
  expires_at?: string;
  state?: string;
};

type DeviceFingerprint = {
  id: string;
  os_name?: string;
  os_version?: string;
  method?: string;
  confidence?: number;
  last_seen?: string;
};

type DeviceDomain = {
  id: string;
  domain?: string;
  query_count?: number;
  blocked?: boolean;
  last_queried?: string;
};

type DeviceAlert = {
  id: string;
  timestamp?: string;
  severity?: string;
  signature?: string;
  dst_ip?: string;
  dst_port?: number;
};

type DeviceFirewallRule = {
  id: string;
  name?: string;
  action?: string;
  direction?: string;
  protocol?: string;
  port?: string;
  is_active?: boolean;
};

export default function DeviceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");

  const { data: device, isLoading } = useQuery({
    queryKey: ["device", id],
    queryFn: async () => {
      const res = await api.get<Device>(`/devices/${id}`);
      return res.data;
    },
    refetchInterval: 10000,
  });

  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ["device-sessions", id],
    queryFn: async () => {
      const res = await api.get<{ data: DeviceSession[]; total: number }>(
        `/devices/${id}/sessions`,
      );
      return res.data;
    },
    enabled: activeTab === "sessions",
    refetchInterval: 10000,
  });

  const { data: leasesData, isLoading: leasesLoading } = useQuery({
    queryKey: ["device-leases", id],
    queryFn: async () => {
      const res = await api.get<{ data: DeviceLease[]; total: number }>(
        `/devices/${id}/leases`,
      );
      return res.data;
    },
    enabled: activeTab === "leases",
    refetchInterval: 10000,
  });

  const { data: fingerprintsData, isLoading: fingerprintsLoading } = useQuery({
    queryKey: ["device-fingerprints", id],
    queryFn: async () => {
      const res = await api.get<{ data: DeviceFingerprint[]; total: number }>(
        `/devices/${id}/fingerprints`,
      );
      return res.data;
    },
    enabled: activeTab === "fingerprints",
    refetchInterval: 10000,
  });

  const { data: domainsData, isLoading: domainsLoading } = useQuery({
    queryKey: ["device-domains", id],
    queryFn: async () => {
      const res = await api.get<{ data: DeviceDomain[]; total: number }>(
        `/devices/${id}/domains`,
      );
      return res.data;
    },
    enabled: activeTab === "domains",
    refetchInterval: 10000,
  });

  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ["device-alerts", id],
    queryFn: async () => {
      const res = await api.get<{ data: DeviceAlert[]; total: number }>(
        `/devices/${id}/alerts`,
      );
      return res.data;
    },
    enabled: activeTab === "alerts",
    refetchInterval: 10000,
  });

  const { data: firewallData, isLoading: firewallLoading } = useQuery({
    queryKey: ["device-firewall", id],
    queryFn: async () => {
      const res = await api.get<{ data: DeviceFirewallRule[]; total: number }>(
        `/devices/${id}/firewall`,
      );
      return res.data;
    },
    enabled: activeTab === "firewall",
    refetchInterval: 10000,
  });

  const tabs = [
    { id: "overview", label: "Przegląd" },
    { id: "sessions", label: "Sesje (802.11)" },
    { id: "leases", label: "Dzierżawy DHCP" },
    { id: "fingerprints", label: "Fingerprinty" },
    { id: "domains", label: "Domeny DNS" },
    { id: "alerts", label: "Alerty IDS" },
    { id: "firewall", label: "Reguły Firewall" },
  ];

  const formatBytes = (bytes?: number) => {
    if (bytes === undefined || bytes === null) return "-";
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center text-sm font-mono text-gray-500">
        Ładowanie danych urządzenia...
      </div>
    );
  }

  if (!device) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center flex-col gap-4">
        <div className="text-red-500 font-bold">Nie znaleziono urządzenia.</div>
        <button
          onClick={() => navigate("/devices")}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Wróć do listy
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 font-sans flex flex-col">
      <header className="h-14 bg-white shadow-sm flex items-center px-4 border-b border-gray-200 dark:bg-gray-900 dark:border-gray-800 shrink-0">
        <button
          onClick={() => navigate("/devices")}
          className="mr-4 p-1.5 text-gray-500 hover:bg-gray-100 rounded dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
            {device.name || "Nienazwany"}
          </h1>
          <span
            className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${device.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}
          >
            {device.is_active ? "Online" : "Offline"}
          </span>
        </div>
      </header>

      <main className="flex-1 p-4 overflow-auto flex flex-col gap-4 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-white">
          <div
            className={`${device.is_active ? "bg-[#2a8bf2]" : "bg-gray-600"} p-3 rounded shadow-sm flex flex-col justify-between h-24`}
          >
            <div className="flex items-center justify-between opacity-90">
              <span className="text-xs font-bold uppercase tracking-wider">
                Status Połączenia
              </span>
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xl font-bold">
                {device.is_active ? "Połączony" : "Rozłączony"}
              </div>
              <div className="text-[11px] opacity-75 mt-0.5 font-mono">
                L. seen:{" "}
                {device.last_seen
                  ? new Date(device.last_seen).toLocaleString()
                  : "-"}
              </div>
            </div>
          </div>

          <div className="bg-[#43a047] p-3 rounded shadow-sm flex flex-col justify-between h-24">
            <div className="flex items-center justify-between opacity-90">
              <span className="text-xs font-bold uppercase tracking-wider">
                Adresacja (Sieć)
              </span>
              <Network className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-bold font-mono tracking-tight">
                {device.ip_address || "Brak IP"}
              </div>
              <div className="text-[11px] font-bold bg-white/20 inline-block px-1.5 py-0.5 rounded mt-1">
                VLAN {device.vlan_id || "-"}
              </div>
            </div>
          </div>

          <div className="bg-[#fb8c00] p-3 rounded shadow-sm flex flex-col justify-between h-24">
            <div className="flex items-center justify-between opacity-90">
              <span className="text-xs font-bold uppercase tracking-wider">
                Sprzęt (MAC)
              </span>
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-bold font-mono tracking-tight flex items-center gap-2">
                {device.mac_address}
                {device.is_random_mac && (
                  <span className="text-[9px] bg-red-500 text-white px-1 py-0.5 rounded">
                    RAND
                  </span>
                )}
              </div>
              <div className="text-[11px] opacity-90 mt-1 truncate">
                {device.vendor || "Nieznany producent"}
              </div>
            </div>
          </div>

          <div
            className={`p-3 rounded shadow-sm flex flex-col justify-between h-24 ${device.classification === "quarantined" ? "bg-[#e53935]" : "bg-[#8e24aa]"}`}
          >
            <div className="flex items-center justify-between opacity-90">
              <span className="text-xs font-bold uppercase tracking-wider">
                Klasyfikacja
              </span>
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xl font-bold capitalize">
                {device.classification || "Brak"}
              </div>
              <div className="text-[11px] opacity-75 mt-0.5 truncate">
                Przez: {device.classified_by || "System"}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded shadow-sm p-2 flex flex-wrap gap-2 items-center">
          <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded text-xs font-semibold transition-colors">
            <Network className="w-4 h-4" /> Reklasyfikacja (Zmień VLAN)
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded text-xs font-semibold transition-colors">
            <Key className="w-4 h-4" /> Rotacja PSK
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded text-xs font-semibold transition-colors">
            <Wifi className="w-4 h-4" /> Statyczne IP
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded text-xs font-semibold transition-colors">
            <Globe className="w-4 h-4" /> Okno Internetowe
          </button>
          <div className="flex-1"></div>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded text-xs font-semibold transition-colors border border-red-200 dark:border-red-900/50">
            <Trash2 className="w-4 h-4" /> Usuń urządzenie
          </button>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded shadow-sm flex flex-col flex-1 min-h-[400px]">
          <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-800 hide-scrollbar bg-gray-50 dark:bg-gray-800/50">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400 bg-white dark:bg-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-0 flex-1 overflow-auto">
            {activeTab === "overview" && (
              <div className="flex flex-col md:flex-row gap-4 p-4">
                <div className="flex-1">
                  <div className="mb-4">
                    <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      Tożsamość Urządzenia
                    </h3>
                    <div className="border border-gray-200 dark:border-gray-800 rounded overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                          <tr className="bg-gray-50 dark:bg-gray-800/30">
                            <th className="py-2 px-3 font-semibold text-gray-600 dark:text-gray-400 w-1/3">
                              Nazwa
                            </th>
                            <td className="py-2 px-3 font-mono text-gray-800 dark:text-gray-200 flex items-center gap-2">
                              {isEditingName ? (
                                <>
                                  <input
                                    type="text"
                                    className="bg-white dark:bg-gray-950 border border-blue-400 px-2 py-0.5 rounded text-sm w-full outline-none"
                                    value={editNameValue}
                                    onChange={(e) =>
                                      setEditNameValue(e.target.value)
                                    }
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => setIsEditingName(false)}
                                    className="text-green-600 p-1 hover:bg-green-50 rounded"
                                  >
                                    <Save className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setIsEditingName(false)}
                                    className="text-gray-400 p-1 hover:bg-gray-100 rounded"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <span>{device.name || "Brak nazwy"}</span>
                                  <button
                                    onClick={() => {
                                      setEditNameValue(device.name || "");
                                      setIsEditingName(true);
                                    }}
                                    className="text-blue-500 hover:bg-blue-50 p-1 rounded dark:hover:bg-blue-900/30"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <th className="py-2 px-3 font-semibold text-gray-600 dark:text-gray-400">
                              Adres MAC
                            </th>
                            <td className="py-2 px-3 font-mono text-gray-800 dark:text-gray-200">
                              {device.mac_address}
                              {device.is_random_mac && (
                                <span className="ml-2 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-sans">
                                  Losowy
                                </span>
                              )}
                            </td>
                          </tr>
                          <tr className="bg-gray-50 dark:bg-gray-800/30">
                            <th className="py-2 px-3 font-semibold text-gray-600 dark:text-gray-400">
                              Producent (OUI)
                            </th>
                            <td className="py-2 px-3 font-mono text-gray-800 dark:text-gray-200">
                              {device.vendor || "Nieznany"}
                            </td>
                          </tr>
                          <tr>
                            <th className="py-2 px-3 font-semibold text-gray-600 dark:text-gray-400">
                              Klasyfikacja
                            </th>
                            <td className="py-2 px-3 font-mono text-gray-800 dark:text-gray-200">
                              <span className="bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 px-2 py-0.5 rounded text-xs">
                                {device.classification || "Brak"}
                              </span>
                            </td>
                          </tr>
                          <tr className="bg-gray-50 dark:bg-gray-800/30">
                            <th className="py-2 px-3 font-semibold text-gray-600 dark:text-gray-400">
                              VLAN ID
                            </th>
                            <td className="py-2 px-3 font-mono text-blue-600 dark:text-blue-400 font-bold">
                              {device.vlan_id || "Brak"}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      Czas i Historia
                    </h3>
                    <div className="border border-gray-200 dark:border-gray-800 rounded overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                          <tr>
                            <th className="py-2 px-3 font-semibold text-gray-600 dark:text-gray-400 w-1/3">
                              Pierwsze widzenie
                            </th>
                            <td className="py-2 px-3 font-mono text-gray-800 dark:text-gray-200">
                              {device.first_seen
                                ? new Date(device.first_seen).toLocaleString()
                                : "Brak danych"}
                            </td>
                          </tr>
                          <tr className="bg-gray-50 dark:bg-gray-800/30">
                            <th className="py-2 px-3 font-semibold text-gray-600 dark:text-gray-400">
                              Ostatnie widzenie
                            </th>
                            <td className="py-2 px-3 font-mono text-gray-800 dark:text-gray-200">
                              {device.last_seen
                                ? new Date(device.last_seen).toLocaleString()
                                : "Brak danych"}
                            </td>
                          </tr>
                          <tr>
                            <th className="py-2 px-3 font-semibold text-gray-600 dark:text-gray-400">
                              Data klasyfikacji
                            </th>
                            <td className="py-2 px-3 font-mono text-gray-800 dark:text-gray-200">
                              {device.classified_at
                                ? new Date(
                                    device.classified_at,
                                  ).toLocaleString()
                                : "Nigdy"}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-80 flex flex-col gap-4">
                  <div>
                    <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      Notatki Administratora
                    </h3>
                    <textarea
                      className="w-full h-32 border border-gray-200 dark:border-gray-800 rounded bg-gray-50 dark:bg-gray-950 p-2 text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-blue-500 resize-none"
                      placeholder="Dodaj notatkę o tym urządzeniu..."
                      defaultValue={device.notes || ""}
                    ></textarea>
                    <div className="flex justify-end mt-2">
                      <button className="px-3 py-1 bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300 rounded text-xs font-bold hover:bg-gray-300 transition-colors">
                        Zapisz notatkę
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "sessions" && (
              <div className="p-0">
                <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-2 border-b dark:border-gray-700">
                        Start Sesji
                      </th>
                      <th className="px-4 py-2 border-b dark:border-gray-700">
                        Koniec Sesji
                      </th>
                      <th className="px-4 py-2 border-b dark:border-gray-700">
                        BSSID / SSID
                      </th>
                      <th className="px-4 py-2 border-b dark:border-gray-700 text-right">
                        TX / RX Bajty
                      </th>
                      <th className="px-4 py-2 border-b dark:border-gray-700">
                        Powód rozłączenia
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-xs">
                    {sessionsLoading ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-8 text-center font-sans text-gray-500"
                        >
                          Ładowanie historii sesji...
                        </td>
                      </tr>
                    ) : !sessionsData?.data ||
                      sessionsData.data.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-8 text-center font-sans text-gray-500"
                        >
                          Brak zarejestrowanych sesji dla tego urządzenia.
                        </td>
                      </tr>
                    ) : (
                      sessionsData.data.map((session) => (
                        <tr
                          key={session.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <td className="px-4 py-2">
                            {session.start_time
                              ? new Date(session.start_time).toLocaleString()
                              : "-"}
                          </td>
                          <td className="px-4 py-2">
                            {session.end_time ? (
                              new Date(session.end_time).toLocaleString()
                            ) : (
                              <span className="text-emerald-600 font-bold dark:text-emerald-400">
                                Trwa...
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            {session.bssid || "-"} <br />
                            <span className="text-[10px] text-gray-400 font-sans">
                              {session.ssid || ""}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <span className="text-blue-600 dark:text-blue-400">
                              {formatBytes(session.tx_bytes)}
                            </span>
                            <span className="mx-1 text-gray-400">/</span>
                            <span className="text-purple-600 dark:text-purple-400">
                              {formatBytes(session.rx_bytes)}
                            </span>
                          </td>
                          <td className="px-4 py-2 font-sans text-[11px] text-gray-500">
                            {session.disconnect_reason || "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "leases" && (
              <div className="p-0">
                <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-2 border-b dark:border-gray-700 w-16">
                        Status
                      </th>
                      <th className="px-4 py-2 border-b dark:border-gray-700">
                        Adres IP
                      </th>
                      <th className="px-4 py-2 border-b dark:border-gray-700">
                        Adres MAC
                      </th>
                      <th className="px-4 py-2 border-b dark:border-gray-700">
                        Hostname (DHCP)
                      </th>
                      <th className="px-4 py-2 border-b dark:border-gray-700">
                        Wygasa
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-xs">
                    {leasesLoading ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-8 text-center font-sans text-gray-500"
                        >
                          Ładowanie dzierżaw DHCP...
                        </td>
                      </tr>
                    ) : !leasesData?.data || leasesData.data.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-8 text-center font-sans text-gray-500"
                        >
                          Brak zarejestrowanych dzierżaw dla tego urządzenia.
                        </td>
                      </tr>
                    ) : (
                      leasesData.data.map((lease) => {
                        const isActive =
                          lease.state === "active" || lease.state === "bound";
                        return (
                          <tr
                            key={lease.id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          >
                            <td className="px-4 py-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-sans ${isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"}`}
                              >
                                {lease.state || "unknown"}
                              </span>
                            </td>
                            <td className="px-4 py-2 font-bold text-gray-800 dark:text-gray-200">
                              {lease.ip_address || "-"}
                            </td>
                            <td className="px-4 py-2">
                              {lease.mac_address || "-"}
                            </td>
                            <td className="px-4 py-2 font-sans text-gray-700 dark:text-gray-300">
                              {lease.hostname || (
                                <span className="text-gray-400 italic">
                                  brak podanego
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 font-sans text-[11px] text-gray-500">
                              {lease.expires_at
                                ? new Date(lease.expires_at).toLocaleString()
                                : "-"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "fingerprints" && (
              <div className="p-0">
                <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-2 border-b dark:border-gray-700">
                        System Operacyjny
                      </th>
                      <th className="px-4 py-2 border-b dark:border-gray-700">
                        Wersja
                      </th>
                      <th className="px-4 py-2 border-b dark:border-gray-700">
                        Metoda detekcji
                      </th>
                      <th className="px-4 py-2 border-b dark:border-gray-700">
                        Pewność (%)
                      </th>
                      <th className="px-4 py-2 border-b dark:border-gray-700">
                        Ostatnio widziane
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-xs">
                    {fingerprintsLoading ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-8 text-center font-sans text-gray-500"
                        >
                          Ładowanie fingerprintów...
                        </td>
                      </tr>
                    ) : !fingerprintsData?.data ||
                      fingerprintsData.data.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-8 text-center font-sans text-gray-500"
                        >
                          Brak zebranych fingerprintów dla tego urządzenia.
                        </td>
                      </tr>
                    ) : (
                      fingerprintsData.data.map((fp) => (
                        <tr
                          key={fp.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <td className="px-4 py-2 font-sans font-bold text-gray-800 dark:text-gray-200">
                            {fp.os_name || "Nieznany"}
                          </td>
                          <td className="px-4 py-2 font-sans">
                            {fp.os_version || "-"}
                          </td>
                          <td className="px-4 py-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-sans bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400">
                              {fp.method || "DHCP"}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${fp.confidence && fp.confidence > 80 ? "bg-emerald-500" : "bg-orange-500"}`}
                                  style={{ width: `${fp.confidence || 0}%` }}
                                ></div>
                              </div>
                              <span className="text-[10px]">
                                {fp.confidence || 0}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2 font-sans text-[11px] text-gray-500">
                            {fp.last_seen
                              ? new Date(fp.last_seen).toLocaleString()
                              : "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "domains" && (
              <div className="p-0">
                <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-2 border-b dark:border-gray-700">
                        Domena
                      </th>
                      <th className="px-4 py-2 border-b dark:border-gray-700">
                        Status
                      </th>
                      <th className="px-4 py-2 border-b dark:border-gray-700">
                        Ilość zapytań
                      </th>
                      <th className="px-4 py-2 border-b dark:border-gray-700">
                        Ostatnie zapytanie
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-xs">
                    {domainsLoading ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="p-8 text-center font-sans text-gray-500"
                        >
                          Ładowanie zapytań DNS...
                        </td>
                      </tr>
                    ) : !domainsData?.data || domainsData.data.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="p-8 text-center font-sans text-gray-500"
                        >
                          Brak zarejestrowanych zapytań DNS.
                        </td>
                      </tr>
                    ) : (
                      domainsData.data.map((domain) => (
                        <tr
                          key={domain.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <td className="px-4 py-2 font-bold text-gray-800 dark:text-gray-200">
                            {domain.domain || "-"}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-sans ${domain.blocked ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"}`}
                            >
                              {domain.blocked ? "Blocked" : "Allowed"}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-blue-600 dark:text-blue-400">
                            {domain.query_count || 0}
                          </td>
                          <td className="px-4 py-2 font-sans text-[11px] text-gray-500">
                            {domain.last_queried
                              ? new Date(domain.last_queried).toLocaleString()
                              : "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "alerts" && (
              <div className="p-0">
                <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-2 border-b dark:border-gray-700">
                        Czas
                      </th>
                      <th className="px-4 py-2 border-b dark:border-gray-700">
                        Waga
                      </th>
                      <th className="px-4 py-2 border-b dark:border-gray-700">
                        Sygnatura reguły (Suricata)
                      </th>
                      <th className="px-4 py-2 border-b dark:border-gray-700">
                        Cel (IP Dst)
                      </th>
                      <th className="px-4 py-2 border-b dark:border-gray-700">
                        Port
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-xs">
                    {alertsLoading ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-8 text-center font-sans text-gray-500"
                        >
                          Ładowanie alertów...
                        </td>
                      </tr>
                    ) : !alertsData?.data || alertsData.data.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-8 text-center font-sans text-gray-500"
                        >
                          Brak alertów bezpieczeństwa dla tego urządzenia.
                        </td>
                      </tr>
                    ) : (
                      alertsData.data.map((alert) => (
                        <tr
                          key={alert.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <td className="px-4 py-2 font-sans text-[11px] text-gray-500">
                            {alert.timestamp
                              ? new Date(alert.timestamp).toLocaleString()
                              : "-"}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-sans ${alert.severity === "critical" ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" : "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400"}`}
                            >
                              {alert.severity || "warning"}
                            </span>
                          </td>
                          <td className="px-4 py-2 font-bold text-gray-800 dark:text-gray-200">
                            {alert.signature || "Nieznana reguła"}
                          </td>
                          <td className="px-4 py-2 text-blue-600 dark:text-blue-400">
                            {alert.dst_ip || "-"}
                          </td>
                          <td className="px-4 py-2">{alert.dst_port || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "firewall" && (
              <div className="p-0">
                <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-2 border-b dark:border-gray-700">
                        Nazwa reguły
                      </th>
                      <th className="px-4 py-2 border-b dark:border-gray-700">
                        Kierunek
                      </th>
                      <th className="px-4 py-2 border-b dark:border-gray-700">
                        Protokół / Port
                      </th>
                      <th className="px-4 py-2 border-b dark:border-gray-700">
                        Akcja
                      </th>
                      <th className="px-4 py-2 border-b dark:border-gray-700 w-16 text-center">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-xs">
                    {firewallLoading ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-8 text-center font-sans text-gray-500"
                        >
                          Ładowanie reguł firewall...
                        </td>
                      </tr>
                    ) : !firewallData?.data ||
                      firewallData.data.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-8 text-center font-sans text-gray-500"
                        >
                          Urządzenie dziedziczy bazowe reguły (brak nadpisań).
                        </td>
                      </tr>
                    ) : (
                      firewallData.data.map((rule) => (
                        <tr
                          key={rule.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <td className="px-4 py-2 font-sans text-gray-800 dark:text-gray-200 font-medium">
                            {rule.name || "-"}
                          </td>
                          <td className="px-4 py-2">
                            <span className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 px-2 py-0.5 rounded text-[10px] uppercase font-bold font-sans">
                              {rule.direction || "OUT"}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-blue-600 dark:text-blue-400">
                            {rule.protocol || "TCP"} : {rule.port || "any"}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-sans ${rule.action === "drop" ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"}`}
                            >
                              {rule.action || "accept"}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span
                              className={`inline-block w-2.5 h-2.5 rounded-full ${rule.is_active !== false ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"}`}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
