import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as QRCode from "qrcode";
import {
  Menu,
  Moon,
  Sun,
  LogOut,
  Radio,
  QrCode,
  AlertTriangle,
  Copy,
  Check,
  EyeOff,
  Users as UsersIcon,
  Shuffle,
  Pin,
} from "lucide-react";
import { api } from "../api/client";
import Sidebar from "../components/Sidebar";
import { useSession } from "../hooks/useSession";
import type { definitions } from "../api/types";

type WiFiSettings = definitions["WiFiSettings"];
type GuestCredential = definitions["GuestCredential"];
type GuestClient = definitions["GuestClient"];
type GuestClientList =
  definitions["ListResponse-security-hub_internal_dto_GuestClient"];

function escapeWifiQrField(value: string): string {
  return value.replace(/([\\;,:"])/g, "\\$1");
}

function buildWifiQrPayload(ssid: string, password: string): string {
  return `WIFI:T:WPA;S:${escapeWifiQrField(ssid)};P:${escapeWifiQrField(password)};;`;
}

function errorMessage(err: unknown, fallback: string): string {
  const e = err as {
    response?: { status?: number; data?: { error?: { message?: string } } };
  };
  if (e?.response?.status === 403) {
    return "Brak uprawnienia wifi:guest_secret:read do odczytu hasła gościnnego.";
  }
  if (e?.response?.status === 404) {
    return "Nie udało się odczytać hasła gościnnego — sieć gościnna jest nieskonfigurowana albo konfiguracja hostapd jest nieczytelna.";
  }
  return e?.response?.data?.error?.message || fallback;
}

function clientsErrorMessage(err: unknown): string {
  const e = err as {
    response?: { status?: number; data?: { error?: { message?: string } } };
  };
  if (e?.response?.status === 403) {
    return "Brak uprawnienia wifi:read do odczytu listy klientów gościnnych.";
  }
  return (
    e?.response?.data?.error?.message ||
    "Nie udało się pobrać listy podłączonych klientów."
  );
}

function formatDateTime(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pl-PL");
}

export default function GuestWifi() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  const { can } = useSession();

  const { data: wifiData, isLoading: wifiLoading } = useQuery({
    queryKey: ["wifi-settings"],
    queryFn: async () => {
      const res = await api.get<WiFiSettings>("/wifi/settings");
      return res.data;
    },
    refetchInterval: false,
  });

  const {
    data: credential,
    isFetching: credentialLoading,
    error: credentialError,
    refetch: refetchCredential,
  } = useQuery({
    queryKey: ["guest-wifi-credential"],
    queryFn: async () => {
      const res = await api.get<GuestCredential>("/wifi/guest/credential");
      return res.data;
    },
    enabled: revealed,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const {
    data: clientsData,
    isLoading: clientsLoading,
    error: clientsError,
  } = useQuery({
    queryKey: ["guest-wifi-clients"],
    queryFn: async () => {
      const res = await api.get<GuestClientList>("/wifi/guest/clients");
      return res.data;
    },
    enabled: can("wifi:read"),
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  const guestRadio = wifiData?.guest_radio;
  const guestClients = clientsData?.data ?? [];

  useEffect(() => {
    if (!credential) return;

    const payload =
      credential.wifi_qr_payload ||
      (credential.ssid && credential.passphrase
        ? buildWifiQrPayload(credential.ssid, credential.passphrase)
        : null);

    if (!payload) {
      setQrError("Appliance nie zwrócił danych do kodu QR.");
      return;
    }

    let cancelled = false;
    QRCode.toDataURL(payload, {
      width: 200,
      margin: 1,
      errorCorrectionLevel: "M",
    })
      .then((url: string) => {
        if (!cancelled) {
          setQrDataUrl(url);
          setQrError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setQrError("Nie udało się wygenerować kodu QR.");
      });

    return () => {
      cancelled = true;
    };
  }, [credential]);

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

  const handleReveal = () => {
    setCopied(false);
    if (revealed) {
      refetchCredential();
    } else {
      setRevealed(true);
    }
  };

  const handleHide = () => {
    setRevealed(false);
    setQrDataUrl(null);
    setQrError(null);
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!credential?.passphrase) return;
    try {
      await navigator.clipboard.writeText(credential.passphrase);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // schowek może być niedostępny — użytkownik przepisze ręcznie
    }
  };

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
              Wi-Fi dla Gości
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
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6 animate-in fade-in duration-200">
              <div className="mb-6 border-b border-gray-200 dark:border-gray-800 pb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Radio className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Sieć dla gości
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Konfiguracja radia gościnnego należy do obrazu systemu i nie
                  da się jej zmienić z panelu. Poniżej stan odczytany z
                  urządzenia.
                </p>
              </div>

              {wifiLoading ? (
                <div className="py-8 text-center text-gray-500 font-mono text-sm">
                  Wczytywanie konfiguracji radia...
                </div>
              ) : !guestRadio ? (
                <p className="py-8 text-center text-sm text-gray-500">
                  Sieć gościnna nie jest jeszcze skonfigurowana na tym hubie.
                </p>
              ) : (
                <div className="space-y-6">
                  {guestRadio.in_sync === false && (
                    <div className="rounded border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                      <p className="flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="h-4 w-4" />
                        Zapis w bazie nie zgadza się z konfiguracją radia
                      </p>
                      <p className="mt-1">
                        Rozjazd dotyczy:{" "}
                        <span className="font-mono">
                          {(guestRadio.divergent_fields ?? []).join(", ") ||
                            "nieznanych pól"}
                        </span>
                        .
                      </p>
                      {(guestRadio.divergent_fields ?? []).includes(
                        "ssid",
                      ) && (
                        <p className="mt-2 font-semibold">
                          Rozjeżdża się SSID — to poważne. Kod QR poprowadzi do
                          nazwy sieci zapisanej w bazie, a nie do tej, którą
                          faktycznie rozgłasza radio.
                        </p>
                      )}
                    </div>
                  )}

                  {guestRadio.readable === false && (
                    <p className="rounded border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-400">
                      Nie udało się odczytać konfiguracji hostapd
                      {guestRadio.unreadable
                        ? `: ${guestRadio.unreadable}`
                        : "."}
                    </p>
                  )}

                  <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <dt className="text-xs text-gray-500">Nazwa sieci</dt>
                      <dd className="font-mono text-gray-800 dark:text-gray-200">
                        {guestRadio.ssid || "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Pasmo</dt>
                      <dd className="font-mono text-gray-800 dark:text-gray-200">
                        {guestRadio.band || "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Kanał</dt>
                      <dd className="font-mono text-gray-800 dark:text-gray-200">
                        {guestRadio.channel || "auto"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">
                        Zabezpieczenia
                      </dt>
                      <dd className="font-mono text-gray-800 dark:text-gray-200">
                        {guestRadio.security_mode || "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">
                        Ochrona ramek (PMF)
                      </dt>
                      <dd className="font-mono text-gray-800 dark:text-gray-200">
                        {guestRadio.pmf_required
                          ? "wymagana"
                          : guestRadio.pmf_enabled
                            ? "włączona"
                            : "wyłączona"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Interfejs</dt>
                      <dd className="font-mono text-gray-800 dark:text-gray-200">
                        {guestRadio.interface || "-"}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6 animate-in fade-in duration-200">
              <div className="mb-6 border-b border-gray-200 dark:border-gray-800 pb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Hasło i kod QR
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Hasło jest współdzielone przez wszystkich gości i czytane
                  bezpośrednio z konfiguracji hostapd. Każde wyświetlenie
                  zapisuje wpis w dzienniku zdarzeń.
                </p>
              </div>

              {!revealed ? (
                <button
                  onClick={handleReveal}
                  disabled={!can("wifi:guest_secret:read")}
                  title={
                    can("wifi:guest_secret:read")
                      ? undefined
                      : "Wymaga uprawnienia wifi:guest_secret:read"
                  }
                  className="disabled:cursor-not-allowed disabled:opacity-40 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700"
                >
                  <QrCode className="h-4 w-4" />
                  Pokaż hasło i kod QR
                </button>
              ) : credentialLoading ? (
                <div className="py-8 text-center text-gray-500 font-mono text-sm">
                  Odczytuję hasło z urządzenia...
                </div>
              ) : credentialError ? (
                <div className="space-y-4">
                  <p className="rounded bg-red-100 px-3 py-2 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300">
                    {errorMessage(
                      credentialError,
                      "Nie udało się odczytać hasła gościnnego.",
                    )}
                  </p>
                  <button
                    onClick={handleHide}
                    className="text-xs font-semibold text-gray-600 hover:underline dark:text-gray-400"
                  >
                    Zamknij
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded border border-amber-300 bg-amber-50 p-3 text-xs font-bold text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                    To hasło widzi każdy gość sieci. Nie rób zdjęcia kodu QR w
                    miejscu publicznym.
                  </div>

                  <div className="flex items-center gap-2 rounded bg-gray-900 p-3 dark:bg-gray-950">
                    <code className="flex-1 break-all font-mono text-sm text-emerald-400">
                      {credential?.passphrase || "brak hasła w odpowiedzi"}
                    </code>
                    <button
                      onClick={handleCopy}
                      disabled={!credential?.passphrase}
                      className="rounded bg-gray-700 p-2 text-gray-200 transition-colors hover:bg-gray-600 disabled:opacity-40"
                      aria-label="Kopiuj hasło"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <div className="flex flex-col items-center gap-2 rounded border border-gray-200 p-4 dark:border-gray-800">
                    {qrDataUrl ? (
                      <>
                        <img
                          src={qrDataUrl}
                          alt="Kod QR do polaczenia z siecia Wi-Fi dla gosci"
                          className="rounded bg-white p-2"
                          width={200}
                          height={200}
                        />
                        <p className="text-center text-[11px] text-gray-500 dark:text-gray-400">
                          Zeskanuj aparatem, żeby połączyć się z siecią{" "}
                          <span className="font-mono font-bold">
                            {credential?.ssid || "gościnną"}
                          </span>
                          . Kod zawiera hasło — nie udostępniaj go dalej.
                        </p>
                      </>
                    ) : (
                      <p className="text-center text-[11px] text-gray-500 dark:text-gray-400">
                        {qrError || "Generuję kod QR..."}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleHide}
                    className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:underline dark:text-gray-400"
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                    Ukryj hasło
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 animate-in fade-in duration-200">
              <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <UsersIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Podłączeni klienci
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Urządzenia widoczne obecnie w dzierżawach DHCP sieci
                  gościnnej. Sieć gościnna nie przypisuje tożsamości
                  urządzeniom — to tylko bieżące dzierżawy.
                </p>
              </div>

              {!can("wifi:read") ? (
                <p className="py-8 text-center text-sm text-gray-500">
                  Brak uprawnienia wifi:read do odczytu listy klientów
                  gościnnych.
                </p>
              ) : clientsLoading ? (
                <div className="py-8 text-center text-gray-500 font-mono text-sm">
                  Wczytywanie listy klientów...
                </div>
              ) : clientsError ? (
                <p className="p-6 text-sm text-red-700 dark:text-red-300">
                  {clientsErrorMessage(clientsError)}
                </p>
              ) : guestClients.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">
                  Brak podłączonych klientów.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                    <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">
                      <tr>
                        <th className="px-4 py-2 border-b dark:border-gray-700">
                          Nazwa hosta
                        </th>
                        <th className="px-4 py-2 border-b dark:border-gray-700">
                          Adres IP
                        </th>
                        <th className="px-4 py-2 border-b dark:border-gray-700">
                          Adres MAC
                        </th>
                        <th className="px-4 py-2 border-b dark:border-gray-700">
                          Producent
                        </th>
                        <th className="px-4 py-2 border-b dark:border-gray-700">
                          Wygasa
                        </th>
                        <th className="px-4 py-2 border-b dark:border-gray-700">
                          Flagi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-xs">
                      {guestClients.map((client: GuestClient, idx: number) => (
                        <tr
                          key={client.mac || `${client.ip_address}-${idx}`}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <td className="px-4 py-2 font-sans text-gray-800 dark:text-gray-200">
                            {client.hostname || "-"}
                          </td>
                          <td className="px-4 py-2 font-bold text-gray-800 dark:text-gray-200">
                            {client.ip_address || "-"}
                          </td>
                          <td className="px-4 py-2">{client.mac || "-"}</td>
                          <td className="px-4 py-2 font-sans text-gray-700 dark:text-gray-300">
                            {client.vendor || "-"}
                          </td>
                          <td className="px-4 py-2 font-sans text-[11px] text-gray-500">
                            {formatDateTime(client.lease_end)}
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex flex-wrap gap-1">
                              {client.is_static && (
                                <span
                                  title="Statyczna rezerwacja adresu"
                                  className="inline-flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold font-sans uppercase text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                                >
                                  <Pin className="h-3 w-3" />
                                  Statyczny
                                </span>
                              )}
                              {client.is_randomized_mac && (
                                <span
                                  title="Urządzenie rozgłasza losowy adres MAC"
                                  className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold font-sans uppercase text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                >
                                  <Shuffle className="h-3 w-3" />
                                  Losowy MAC
                                </span>
                              )}
                              {!client.is_static && !client.is_randomized_mac && (
                                <span className="text-gray-400">-</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
