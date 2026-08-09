import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Menu,
  X,
  Moon,
  Sun,
  LogOut,
  CheckCircle2,
  XCircle,
  Cpu,
  Clock,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { api } from "../api/client";
import Sidebar from "../components/Sidebar";
import type { definitions } from "../api/types";

type Device = definitions["Device"];
type Fingerprint = definitions["Fingerprint"];
type ListResponseDevice =
  definitions["ListResponse-security-hub_internal_dto_Device"];

const FingerprintBadge = ({ deviceId }: { deviceId: string }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["fingerprints", deviceId],
    queryFn: async () => {
      const res = await api.get<{ data: Fingerprint[] }>(
        `/devices/${deviceId}/fingerprints?limit=1`,
      );
      return res.data;
    },
  });

  if (isLoading)
    return <span className="text-xs text-gray-400">Analiza...</span>;
  if (!data?.data || data.data.length === 0)
    return (
      <span className="text-xs text-gray-400">Brak danych (Unrecognized)</span>
    );

  const fp = data.data[0];
  return (
    <div className="flex items-center gap-2 mt-1">
      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
        {fp.value}
      </span>
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400">
        Pewność: {fp.confidence}%
      </span>
    </div>
  );
};

export default function Onboarding() {
  const queryClient = useQueryClient();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [approveModalData, setApproveModalData] = useState<Device | null>(null);
  const [approveForm, setApproveForm] = useState({
    displayName: "",
    vlanId: "10",
  });

  const { data: pendingData, isLoading } = useQuery({
    queryKey: ["onboarding-pending"],
    queryFn: async () => {
      const res = await api.get<ListResponseDevice>(
        "/onboarding/pending?limit=50",
      );
      return res.data;
    },
    refetchInterval: 10000,
  });

  const approveMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: definitions["ApproveOnboardingRequest"];
    }) => {
      const res = await api.post(`/onboarding/${id}/approve`, payload);
      return res.data;
    },
    onSuccess: () => {
      setApproveModalData(null);
      queryClient.invalidateQueries({ queryKey: ["onboarding-pending"] });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["system-status"] });
    },
    onError: (error: any) => {
      alert(
        error?.response?.data?.error?.message ||
          "Błąd podczas zatwierdzania urządzenia.",
      );
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/onboarding/${id}/reject`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-pending"] });
      queryClient.invalidateQueries({ queryKey: ["system-status"] });
    },
    onError: (error: any) => {
      alert(
        error?.response?.data?.error?.message ||
          "Błąd podczas odrzucania urządzenia.",
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

  const handleApproveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (approveModalData && approveModalData.id) {
      approveMutation.mutate({
        id: approveModalData.id,
        payload: {
          display_name: approveForm.displayName,
          vlan_id: parseInt(approveForm.vlanId, 10),
        },
      });
    }
  };

  const openApproveModal = (device: Device) => {
    const mac = device.macs && device.macs.length > 0 ? device.macs[0].mac : "";
    setApproveForm({
      displayName: device.vendor_name || mac || "Nowe Urządzenie",
      vlanId: "10",
    });
    setApproveModalData(device);
  };

  const pendingDevices = pendingData?.data || [];
  const sortedDevices = [...pendingDevices].sort((a, b) => {
    const timeA = a.first_seen ? new Date(a.first_seen).getTime() : 0;
    const timeB = b.first_seen ? new Date(b.first_seen).getTime() : 0;
    return timeA - timeB;
  });

  return (
    <div className="min-h-screen bg-gray-100 flex transition-colors duration-200 dark:bg-gray-950 font-sans relative">
      {approveModalData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-[#1a1d21]">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" /> Wpuść do
                sieci
              </h3>
              <button
                onClick={() => setApproveModalData(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleApproveSubmit} className="p-6 space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg flex items-start gap-3 border border-blue-100 dark:border-blue-900/30">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  Urządzenie otrzyma nową dzierżawę IP w wybranym segmencie, a
                  system wygeneruje dla niego odpowiednie reguły firewall.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Nazwa wyświetlana
                </label>
                <input
                  required
                  type="text"
                  value={approveForm.displayName}
                  onChange={(e) =>
                    setApproveForm({
                      ...approveForm,
                      displayName: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#1a1d21] text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Docelowy VLAN
                </label>
                <select
                  value={approveForm.vlanId}
                  onChange={(e) =>
                    setApproveForm({ ...approveForm, vlanId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#1a1d21] text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm cursor-pointer"
                >
                  <option value="10">VLAN 10 (Zaufane / Trusted)</option>
                  <option value="20">VLAN 20 (Goście / Guest)</option>
                  <option value="30">VLAN 30 (IoT / Smart Home)</option>
                  <option value="40">VLAN 40 (Kamery IP / CAM)</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-200 dark:border-gray-800 mt-6">
                <button
                  type="button"
                  onClick={() => setApproveModalData(null)}
                  className="px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={approveMutation.isPending}
                  className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {approveMutation.isPending
                    ? "Zatwierdzanie..."
                    : "Zatwierdź urządzenie"}
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
              Skrzynka Onboardingu
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
          {isLoading ? (
            <div className="flex justify-center p-12 text-gray-500 font-mono text-sm">
              Pobieranie kolejki...
            </div>
          ) : sortedDevices.length === 0 ? (
            <div className="max-w-2xl mx-auto mt-12 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center shadow-sm">
              <ShieldCheck className="w-20 h-20 text-emerald-500 mx-auto mb-6 opacity-80" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Wszystko gotowe!
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                Brak nowych urządzeń oczekujących na przegląd i przydział.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-7xl mx-auto">
              {sortedDevices.map((device: Device) => {
                const macInfo =
                  device.macs && device.macs.length > 0 ? device.macs[0] : null;
                const isRandom = macInfo?.is_randomized;

                return (
                  <div
                    key={device.id}
                    className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Cpu className="w-4 h-4 text-gray-400" />
                          <span className="font-mono font-bold text-lg text-gray-900 dark:text-white">
                            {macInfo?.mac || "Brak MAC"}
                          </span>
                        </div>
                        {isRandom ? (
                          <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 rounded text-[10px] font-bold uppercase">
                            Adres Losowy (Zaciemniony)
                          </span>
                        ) : (
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {device.vendor_name ||
                              macInfo?.oui_vendor ||
                              "Nieznany OUI"}
                          </span>
                        )}
                      </div>
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 rounded-full text-[10px] font-bold uppercase tracking-wider animate-pulse">
                        Nowe
                      </span>
                    </div>

                    <div className="p-4 flex-1 space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                          Identyfikacja (Fingerprint)
                        </h4>
                        <FingerprintBadge deviceId={device.id as string} />
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Zauważono po raz
                          pierwszy
                        </h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                          {device.first_seen
                            ? new Date(device.first_seen).toLocaleString()
                            : "Nieznana"}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 bg-gray-50 dark:bg-gray-800/50">
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              "Czy na pewno chcesz odrzucić to urządzenie? Zostanie zablokowane i wyrzucone z sieci.",
                            )
                          ) {
                            rejectMutation.mutate(device.id as string);
                          }
                        }}
                        disabled={rejectMutation.isPending}
                        className="flex-1 flex justify-center items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border-2 border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" /> Odrzuć
                      </button>
                      <button
                        onClick={() => openApproveModal(device)}
                        className="flex-1 flex justify-center items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Zatwierdź
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
