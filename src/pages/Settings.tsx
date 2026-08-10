import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Menu,
  X,
  Moon,
  Sun,
  LogOut,
  Radio,
  Power,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Shield,
} from "lucide-react";
import { api } from "../api/client";
import Sidebar from "../components/Sidebar";
import type { definitions } from "../api/types";

type WiFiSettings = definitions["WiFiSettings"];
type UpdateWiFiRequest = definitions["UpdateWiFiRequest"];
type ReauthRequest = definitions["ReauthRequest"];

export default function Settings() {
  const queryClient = useQueryClient();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState("wifi");

  const [wifiForm, setWifiForm] = useState<UpdateWiFiRequest>({
    ssid: "",
    band: "dual",
    channel: 0,
    security_mode: "wpa2_wpa3_mixed",
    pmf_enabled: true,
    pmf_required: false,
    min_psk_entropy: 60,
  });
  const [wifiSuccess, setWifiSuccess] = useState("");
  const [wifiError, setWifiError] = useState("");

  const [reauthModalType, setReauthModalType] = useState<
    "reboot" | "factory-reset" | null
  >(null);
  const [reauthPassword, setReauthPassword] = useState("");
  const [reauthConfirm, setReauthConfirm] = useState("");
  const [reauthError, setReauthError] = useState("");

  useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const res =
        await api.get<definitions["SessionResponse"]>("/auth/session");
      return res.data;
    },
    staleTime: Infinity,
  });

  const { data: wifiData, isLoading: wifiLoading } = useQuery({
    queryKey: ["wifi-settings"],
    queryFn: async () => {
      const res = await api.get<WiFiSettings>("/wifi/settings");
      return res.data;
    },
    refetchInterval: false,
  });

  useEffect(() => {
    if (wifiData) {
      setWifiForm({
        ssid: wifiData.ssid || "",
        band: (wifiData.band as any) || "dual",
        channel: wifiData.channel || 0,
        security_mode: (wifiData.security_mode as any) || "wpa2_wpa3_mixed",
        pmf_enabled: wifiData.pmf_enabled ?? true,
        pmf_required: wifiData.pmf_required ?? false,
        min_psk_entropy: wifiData.min_psk_entropy || 60,
      });
    }
  }, [wifiData]);

  const updateWifiMutation = useMutation({
    mutationFn: async (payload: UpdateWiFiRequest) => {
      const res = await api.patch("/wifi/settings", payload);
      return res.data;
    },
    onSuccess: () => {
      setWifiSuccess("Ustawienia radia zostały zaktualizowane.");
      setWifiError("");
      queryClient.invalidateQueries({ queryKey: ["wifi-settings"] });
      setTimeout(() => setWifiSuccess(""), 4000);
    },
    onError: (error: any) => {
      setWifiError(
        error?.response?.data?.error?.message ||
          "Nie udało się zapisać ustawień.",
      );
      setWifiSuccess("");
    },
  });

  const systemActionMutation = useMutation({
    mutationFn: async ({
      action,
      payload,
    }: {
      action: "reboot" | "factory-reset";
      payload: ReauthRequest;
    }) => {
      const res = await api.post(`/system/${action}`, payload);
      return res.data;
    },
    onSuccess: () => {
      setReauthModalType(null);
      setReauthPassword("");
      setReauthConfirm("");
      localStorage.removeItem("csrf_token");
      window.location.href = "/login";
    },
    onError: (error: any) => {
      setReauthError(
        error?.response?.data?.error?.message ||
          "Operacja odrzucona. Sprawdź hasło.",
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

  const handleWifiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateWifiMutation.mutate(wifiForm);
  };

  const handleSystemAction = (e: React.FormEvent) => {
    e.preventDefault();
    setReauthError("");
    if (!reauthModalType) return;

    if (reauthConfirm !== reauthModalType) {
      setReauthError(`Aby potwierdzić, wpisz dokładnie: ${reauthModalType}`);
      return;
    }

    systemActionMutation.mutate({
      action: reauthModalType,
      payload: {
        password: reauthPassword,
        confirm: reauthConfirm,
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex transition-colors duration-200 dark:bg-gray-950 font-sans relative">
      {reauthModalType && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-[#1a1d21]">
              <h3
                className={`font-bold flex items-center gap-2 ${reauthModalType === "factory-reset" ? "text-red-600 dark:text-red-500" : "text-orange-600 dark:text-orange-500"}`}
              >
                <AlertTriangle className="w-5 h-5" />
                {reauthModalType === "factory-reset"
                  ? "Przywrócenie ustawień fabrycznych"
                  : "Ponowne uruchomienie"}
              </h3>
              <button
                onClick={() => {
                  setReauthModalType(null);
                  setReauthError("");
                  setReauthConfirm("");
                  setReauthPassword("");
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSystemAction} className="p-6 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 font-medium">
                Ta akcja wymaga potwierdzenia. Podaj swoje hasło administratora
                oraz wpisz słowo kluczowe poniżej.
              </p>

              {reauthError && (
                <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-3 rounded flex items-start gap-3">
                  <p className="text-sm text-red-700 dark:text-red-400 font-bold">
                    {reauthError}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Hasło administratora
                </label>
                <input
                  required
                  type="password"
                  value={reauthPassword}
                  onChange={(e) => setReauthPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#1a1d21] text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Wpisz:{" "}
                  <span className="font-mono text-red-600 dark:text-red-400">
                    {reauthModalType}
                  </span>
                </label>
                <input
                  required
                  type="text"
                  value={reauthConfirm}
                  onChange={(e) => setReauthConfirm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#1a1d21] text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none text-sm font-mono"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-200 dark:border-gray-800 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setReauthModalType(null);
                    setReauthError("");
                    setReauthConfirm("");
                    setReauthPassword("");
                  }}
                  className="px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={systemActionMutation.isPending}
                  className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {systemActionMutation.isPending
                    ? "Wykonywanie..."
                    : "Potwierdź wykonanie"}
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
              Ustawienia Systemu
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
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex space-x-1 bg-gray-200/50 dark:bg-gray-800/50 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("wifi")}
                className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors flex items-center justify-center gap-2 ${activeTab === "wifi" ? "bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}
              >
                <Radio className="w-4 h-4" /> Wi-Fi & Radio
              </button>
              <button
                onClick={() => setActiveTab("system")}
                className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors flex items-center justify-center gap-2 ${activeTab === "system" ? "bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}
              >
                <Power className="w-4 h-4" /> Administracja Hubem
              </button>
            </div>

            {activeTab === "wifi" && (
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6 animate-in fade-in duration-200">
                <div className="mb-6 border-b border-gray-200 dark:border-gray-800 pb-4">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Radio className="w-5 h-5 text-blue-600 dark:text-blue-400" />{" "}
                    Ustawienia sieci rozgłaszanej
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Konfiguracja głównego SSID oraz standardów zabezpieczeń
                    radia HostAPD.
                  </p>
                </div>

                {wifiLoading ? (
                  <div className="py-8 text-center text-gray-500 font-mono text-sm">
                    Wczytywanie konfiguracji radia...
                  </div>
                ) : (
                  <form onSubmit={handleWifiSubmit} className="space-y-6">
                    {wifiError && (
                      <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-3 rounded flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-700 dark:text-red-400 font-medium">
                          {wifiError}
                        </p>
                      </div>
                    )}
                    {wifiSuccess && (
                      <div className="bg-emerald-50 dark:bg-emerald-900/30 border-l-4 border-emerald-500 p-3 rounded flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                          {wifiSuccess}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Nazwa Sieci (SSID)
                          </label>
                          <input
                            required
                            type="text"
                            value={wifiForm.ssid}
                            onChange={(e) =>
                              setWifiForm({ ...wifiForm, ssid: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#1a1d21] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Częstotliwość (Band)
                          </label>
                          <select
                            value={wifiForm.band}
                            onChange={(e) =>
                              setWifiForm({
                                ...wifiForm,
                                band: e.target.value as any,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#1a1d21] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm cursor-pointer"
                          >
                            <option value="2_4">2.4 GHz</option>
                            <option value="5">5 GHz</option>
                            <option value="dual">
                              Dual Band (2.4 + 5 GHz)
                            </option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Kanał (Channel)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={wifiForm.channel}
                            onChange={(e) =>
                              setWifiForm({
                                ...wifiForm,
                                channel: parseInt(e.target.value, 10) || 0,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#1a1d21] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Wartość 0 oznacza automatyczny wybór (ACS).
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Tryb Zabezpieczeń
                          </label>
                          <select
                            value={wifiForm.security_mode}
                            onChange={(e) =>
                              setWifiForm({
                                ...wifiForm,
                                security_mode: e.target.value as any,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#1a1d21] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm cursor-pointer"
                          >
                            <option value="wpa2">
                              Tylko WPA2 (Starsze urządzenia)
                            </option>
                            <option value="wpa2_wpa3_mixed">
                              WPA2 / WPA3 Mixed (Zalecane)
                            </option>
                            <option value="wpa3">
                              Tylko WPA3 (Wysokie bezpieczeństwo)
                            </option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Min. Entropia PSK (Bit)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={wifiForm.min_psk_entropy}
                            onChange={(e) =>
                              setWifiForm({
                                ...wifiForm,
                                min_psk_entropy:
                                  parseInt(e.target.value, 10) || 0,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#1a1d21] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                          />
                        </div>
                        <div className="pt-2">
                          <label className="flex items-center gap-3 mb-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={wifiForm.pmf_enabled}
                              onChange={(e) =>
                                setWifiForm({
                                  ...wifiForm,
                                  pmf_enabled: e.target.checked,
                                })
                              }
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div>
                              <span className="block text-sm font-bold text-gray-900 dark:text-white">
                                PMF (Protected Management Frames)
                              </span>
                              <span className="block text-xs text-gray-500">
                                Zabezpiecza przed atakami deautentykacji.
                              </span>
                            </div>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={wifiForm.pmf_required}
                              disabled={!wifiForm.pmf_enabled}
                              onChange={(e) =>
                                setWifiForm({
                                  ...wifiForm,
                                  pmf_required: e.target.checked,
                                })
                              }
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                            />
                            <div
                              className={
                                !wifiForm.pmf_enabled ? "opacity-50" : ""
                              }
                            >
                              <span className="block text-sm font-bold text-gray-900 dark:text-white">
                                Wymagaj PMF
                              </span>
                              <span className="block text-xs text-gray-500">
                                Urządzenia bez obsługi PMF nie połączą się.
                              </span>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-end">
                      <button
                        type="submit"
                        disabled={updateWifiMutation.isPending}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                      >
                        {updateWifiMutation.isPending
                          ? "Zapisywanie..."
                          : "Zapisz i Zastosuj"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {activeTab === "system" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                  <div className="mb-4">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 text-orange-600 dark:text-orange-500" />{" "}
                      Ponowne uruchomienie
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Hub uruchomi się od nowa. Urządzenia stracą łączność na
                      około minutę, a konfiguracja zostaje nienaruszona.
                    </p>
                  </div>
                  <button
                    onClick={() => setReauthModalType("reboot")}
                    className="px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-800 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 dark:text-orange-400 rounded-lg text-sm font-bold transition-colors"
                  >
                    Uruchom ponownie
                  </button>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-red-200 dark:border-red-900/50 p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-red-100 dark:bg-red-900/20 rounded-bl-full -mr-8 -mt-8 z-0"></div>
                  <div className="relative z-10">
                    <div className="mb-4">
                      <h2 className="text-lg font-bold text-red-700 dark:text-red-500 flex items-center gap-2">
                        <Shield className="w-5 h-5" /> Przywrócenie ustawień
                        fabrycznych
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 max-w-2xl">
                        Ta operacja jest{" "}
                        <strong className="text-red-600 dark:text-red-400">
                          nieodwracalna
                        </strong>
                        . Usunięte zostaną wszystkie segmenty, profile polityk,
                        reguły firewalla, urządzenia, dzienniki bezpieczeństwa i
                        konta użytkowników. Hub wróci do stanu sprzed pierwszej
                        konfiguracji i trzeba go będzie skonfigurować od zera.
                      </p>
                    </div>
                    <button
                      onClick={() => setReauthModalType("factory-reset")}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm"
                    >
                      Przywróć ustawienia fabryczne
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
