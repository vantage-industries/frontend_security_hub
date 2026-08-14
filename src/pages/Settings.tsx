import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  Shield,
} from "lucide-react";
import { api } from "../api/client";
import Sidebar from "../components/Sidebar";
import { useSession } from "../hooks/useSession";
import type { definitions } from "../api/types";

type WiFiSettings = definitions["WiFiSettings"];
type ReauthRequest = definitions["ReauthRequest"];

export default function Settings() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState("wifi");

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

  const { can } = useSession();

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
                    <Radio className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    Sieć rozgłaszana
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Konfiguracja radia należy do obrazu systemu i nie da się jej
                    zmienić z panelu. Poniżej stan odczytany z urządzenia.
                  </p>
                </div>

                {wifiLoading ? (
                  <div className="py-8 text-center text-gray-500 font-mono text-sm">
                    Wczytywanie konfiguracji radia...
                  </div>
                ) : !wifiData ? (
                  <p className="py-8 text-center text-sm text-gray-500">
                    Radio nie jest jeszcze skonfigurowane.
                  </p>
                ) : (
                  <div className="space-y-6">
                    {wifiData.radio?.in_sync === false && (
                      <div className="rounded border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                        <p className="flex items-center gap-1.5 font-bold">
                          <AlertTriangle className="h-4 w-4" />
                          Zapis w bazie nie zgadza się z konfiguracją radia
                        </p>
                        <p className="mt-1">
                          Rozjazd dotyczy:{" "}
                          <span className="font-mono">
                            {(wifiData.radio.divergent_fields ?? []).join(
                              ", ",
                            ) || "nieznanych pól"}
                          </span>
                          .
                        </p>
                        {(wifiData.radio.divergent_fields ?? []).includes(
                          "ssid",
                        ) && (
                          <p className="mt-2 font-semibold">
                            Rozjeżdża się SSID — to poważne. Przy dodawaniu
                            urządzenia panel podaje zapisaną nazwę sieci, więc
                            kod QR poprowadzi do sieci, której nie ma.
                          </p>
                        )}
                      </div>
                    )}

                    {wifiData.radio?.readable === false && (
                      <p className="rounded border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-400">
                        Nie udało się odczytać konfiguracji hostapd
                        {wifiData.radio.unreadable
                          ? `: ${wifiData.radio.unreadable}`
                          : "."}
                      </p>
                    )}

                    <div>
                      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Sieć główna
                      </h3>
                      <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <dt className="text-xs text-gray-500">Nazwa sieci</dt>
                          <dd className="font-mono text-gray-800 dark:text-gray-200">
                            {wifiData.radio?.ssid || wifiData.ssid || "-"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Pasmo</dt>
                          <dd className="font-mono text-gray-800 dark:text-gray-200">
                            {wifiData.radio?.band || wifiData.band || "-"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Kanał</dt>
                          <dd className="font-mono text-gray-800 dark:text-gray-200">
                            {wifiData.radio?.channel ||
                              wifiData.channel ||
                              "auto"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">
                            Zabezpieczenia
                          </dt>
                          <dd className="font-mono text-gray-800 dark:text-gray-200">
                            {wifiData.radio?.security_mode ||
                              wifiData.security_mode ||
                              "-"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">
                            Ochrona ramek (PMF)
                          </dt>
                          <dd className="font-mono text-gray-800 dark:text-gray-200">
                            {(wifiData.radio?.pmf_required ??
                            wifiData.pmf_required)
                              ? "wymagana"
                              : (wifiData.radio?.pmf_enabled ??
                                  wifiData.pmf_enabled)
                                ? "włączona"
                                : "wyłączona"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Interfejs</dt>
                          <dd className="font-mono text-gray-800 dark:text-gray-200">
                            {wifiData.radio?.interface || "-"}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    {wifiData.guest_radio && (
                      <div>
                        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Sieć dla gości
                        </h3>
                        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                          <div>
                            <dt className="text-xs text-gray-500">
                              Nazwa sieci
                            </dt>
                            <dd className="font-mono text-gray-800 dark:text-gray-200">
                              {wifiData.guest_radio.ssid || "-"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-gray-500">Pasmo</dt>
                            <dd className="font-mono text-gray-800 dark:text-gray-200">
                              {wifiData.guest_radio.band || "-"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-gray-500">Interfejs</dt>
                            <dd className="font-mono text-gray-800 dark:text-gray-200">
                              {wifiData.guest_radio.interface || "-"}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    )}

                    <div>
                      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Klucze urządzeń
                      </h3>
                      <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="text-xs text-gray-500">
                            Długość generowanego klucza
                          </dt>
                          <dd className="font-mono text-gray-800 dark:text-gray-200">
                            {wifiData.device_psk_length || "-"} znaków
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">
                            Minimalna entropia
                          </dt>
                          <dd className="font-mono text-gray-800 dark:text-gray-200">
                            {wifiData.min_psk_entropy || "-"} bitów
                          </dd>
                        </div>
                      </dl>
                    </div>

                    {wifiData.updated_at && (
                      <p className="font-mono text-[11px] text-gray-400">
                        Zapis zaktualizowano{" "}
                        {new Date(wifiData.updated_at).toLocaleString()}
                      </p>
                    )}
                  </div>
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
                    disabled={!can("system:reboot")}
                    title={
                      can("system:reboot")
                        ? undefined
                        : "Wymaga uprawnienia system:reboot"
                    }
                    className="disabled:cursor-not-allowed disabled:opacity-40 px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-800 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 dark:text-orange-400 rounded-lg text-sm font-bold transition-colors"
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
                      disabled={!can("system:factory_reset")}
                      title={
                        can("system:factory_reset")
                          ? undefined
                          : "Wymaga uprawnienia system:factory_reset — tylko właściciel"
                      }
                      className="disabled:cursor-not-allowed disabled:opacity-40 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm"
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
