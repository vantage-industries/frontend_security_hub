import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Menu,
  X,
  Moon,
  Sun,
  LogOut,
  Search,
  ShieldAlert,
  CheckCircle2,
  Network,
} from "lucide-react";
import { api } from "../api/client";
import Sidebar from "../components/Sidebar";
import type { definitions } from "../api/types";

type Device = definitions["Device"];
type ListResponseDevice =
  definitions["ListResponse-security-hub_internal_dto_Device"];
type VLAN = definitions["VLAN"];
type ListResponseVLAN =
  definitions["ListResponse-security-hub_internal_dto_VLAN"];

export default function Quarantine() {
  const queryClient = useQueryClient();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [releaseModalData, setReleaseModalData] = useState<{
    id: string;
    name: string;
    vlanId?: number;
  } | null>(null);
  const [selectedVlan, setSelectedVlan] = useState("");

  useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const res =
        await api.get<definitions["SessionResponse"]>("/auth/session");
      return res.data;
    },
    staleTime: Infinity,
  });

  const { data: quarantineData, isLoading } = useQuery({
    queryKey: ["quarantine"],
    queryFn: async () => {
      const res = await api.get<ListResponseDevice>("/quarantine?limit=100");
      return res.data;
    },
    refetchInterval: 10000,
  });

  const { data: vlanData, isLoading: vlansLoading } = useQuery({
    queryKey: ["vlans"],
    queryFn: async () => {
      const res = await api.get<ListResponseVLAN>("/vlans");
      return res.data;
    },
    staleTime: 300000,
  });

  const vlans: VLAN[] = vlanData?.data ?? [];
  const availableVlans = vlans.filter(
    (v) => v.vid !== releaseModalData?.vlanId,
  );
  const chosenVlan = vlans.find((v) => String(v.vid) === selectedVlan);

  const releaseMutation = useMutation({
    mutationFn: async ({
      id,
      targetVlanId,
    }: {
      id: string;
      targetVlanId: number;
    }) => {
      const payload: definitions["ReleaseQuarantineRequest"] = {
        target_vlan_id: targetVlanId,
      };
      const res = await api.post(`/quarantine/${id}/release`, payload);
      return res.data;
    },
    onSuccess: () => {
      setReleaseModalData(null);
      queryClient.invalidateQueries({ queryKey: ["quarantine"] });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["system-status"] });
    },
    onError: (error: any) => {
      alert(
        error?.response?.data?.error?.message ||
          "Nie udało się zwolnić urządzenia z kwarantanny.",
      );
    },
  });

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) {}
    localStorage.removeItem("csrf_token");
    window.location.href = "/login";
  };

  const handleReleaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (releaseModalData) {
      releaseMutation.mutate({
        id: releaseModalData.id,
        targetVlanId: parseInt(selectedVlan, 10),
      });
    }
  };

  const filteredDevices =
    quarantineData?.data?.filter((dev: Device) => {
      const name = (
        dev.display_name ||
        dev.model_name ||
        dev.vendor_name ||
        ""
      ).toLowerCase();

      return name.includes(searchQuery.toLowerCase());
    }) || [];

  return (
    <div className="min-h-screen bg-gray-100 flex transition-colors duration-200 dark:bg-gray-950 font-sans relative">
      {releaseModalData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-200 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-[#1a1d21]">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Network className="w-5 h-5 text-emerald-500" /> Odblokuj
                urządzenie
              </h3>
              <button
                onClick={() => setReleaseModalData(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleReleaseSubmit} className="p-6 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Urządzenie{" "}
                <strong className="text-gray-900 dark:text-white">
                  {releaseModalData.name}
                </strong>{" "}
                opuści kwarantannę.
              </p>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Wybierz docelowy VLAN
                </label>
                <select
                  value={selectedVlan}
                  onChange={(e) => setSelectedVlan(e.target.value)}
                  disabled={vlansLoading}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#1a1d21] text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm cursor-pointer"
                >
                  <option value="">
                    {vlansLoading ? "Pobieram segmenty..." : "— wybierz —"}
                  </option>
                  {availableVlans.map((v) => (
                    <option key={v.vid} value={v.vid}>
                      VLAN {v.vid} — {v.display_name || v.name}
                      {v.is_deployed === false ? " (niewdrożony)" : ""}
                    </option>
                  ))}
                </select>
                {chosenVlan?.is_deployed === false && (
                  <p className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    Ten segment nie jest wdrożony. Urządzenie straci łączność do
                    czasu jego uruchomienia.
                  </p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setReleaseModalData(null)}
                  className="px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={releaseMutation.isPending || !selectedVlan}
                  className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {releaseMutation.isPending ? "Zwalnianie..." : "Odblokuj"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 z-10">
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-4 md:px-6 border-b border-gray-200 sticky top-0 z-30 dark:bg-gray-900 dark:border-gray-800">
          <div className="flex items-center">
            <button
              className="lg:hidden p-2 -ml-2 mr-3 text-gray-600 hover:bg-gray-100 rounded-lg dark:text-gray-400 dark:hover:bg-gray-800"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-800 dark:text-white">
              Kwarantanna
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
          <div className="max-w-7xl mx-auto space-y-4">
            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 flex items-center gap-4">
              <div className="relative w-full max-w-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Szukaj urządzenia po nazwie..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#1a1d21] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none sm:text-sm"
                />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden flex flex-col min-h-[500px]">
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                    <tr>
                      <th className="px-6 py-4">Urządzenie / Hostname</th>
                      <th className="px-6 py-4">Powód kwarantanny</th>
                      <th className="px-6 py-4">Data dodania</th>
                      <th className="px-6 py-4 text-right">Akcje</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {isLoading ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="p-8 text-center text-gray-500"
                        >
                          Pobieranie listy kwarantanny...
                        </td>
                      </tr>
                    ) : filteredDevices.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="p-16 text-center text-gray-500 flex flex-col items-center justify-center"
                        >
                          <ShieldAlert className="w-12 h-12 text-emerald-500 mb-3 opacity-80" />
                          <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
                            Brak urządzeń w kwarantannie
                          </p>
                          <p className="text-sm mt-1">
                            Wszystko jest w porządku.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredDevices.map((dev: Device) => {
                        const primaryMac =
                          dev.macs && dev.macs.length > 0
                            ? dev.macs[0].mac
                            : "-";
                        const displayName =
                          dev.display_name ||
                          dev.model_name ||
                          primaryMac ||
                          dev.id ||
                          "Nieznane";

                        return (
                          <tr
                            key={dev.id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                          >
                            <td className="px-6 py-3">
                              <div className="font-bold text-gray-900 dark:text-white">
                                {displayName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {dev.vendor_name || "Nieznany producent"}
                              </div>
                            </td>
                            <td className="px-6 py-3">
                              <span className="px-2.5 py-1 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 rounded text-[11px] uppercase font-bold">
                                Blokada: {dev.classified_by || "System IDS"}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-xs text-gray-500 font-mono">
                              {dev.classified_at
                                ? new Date(dev.classified_at).toLocaleString()
                                : "-"}
                            </td>
                            <td className="px-6 py-3 text-right">
                              <button
                                onClick={() => {
                                  setSelectedVlan("");
                                  setReleaseModalData({
                                    id: dev.id as string,
                                    name: displayName as string,
                                    vlanId: dev.vlan_id,
                                  });
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                              >
                                <CheckCircle2 className="w-4 h-4" /> Odblokuj
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
