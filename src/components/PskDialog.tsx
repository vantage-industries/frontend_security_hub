import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as QRCode from "qrcode";
import { Copy, Check, X } from "lucide-react";
import { api } from "../api/client";
import type { definitions } from "../api/types";
import ConfirmByName from "./ConfirmByName";

type Device = definitions["Device"];
type RotatePSKResponse = definitions["RotatePSKResponse"];
type WiFiSettings = definitions["WiFiSettings"];

type Props = {
  device: Device;
  deviceId: string;
  onClose: () => void;
};

function errorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { error?: { message?: string } } } };
  return e?.response?.data?.error?.message || fallback;
}

function escapeWifiValue(value: string): string {
  return value.replace(/([\\;,:"])/g, "\\$1");
}

export default function PskDialog({ device, deviceId, onClose }: Props) {
  const queryClient = useQueryClient();
  const [psk, setPsk] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRevoke, setShowRevoke] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  const deviceLabel =
    device.display_name ||
    device.model_name ||
    device.macs?.[0]?.mac ||
    "urządzenie";

  const { data: wifi } = useQuery({
    queryKey: ["wifi-settings"],
    queryFn: async () => {
      const res = await api.get<WiFiSettings>("/wifi/settings");
      return res.data;
    },
    staleTime: 300000,
    retry: false,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["device", deviceId] });
    queryClient.invalidateQueries({ queryKey: ["devices"] });
  };

  const rotate = useMutation({
    mutationFn: async () => {
      const res = await api.post<RotatePSKResponse>(
        `/devices/${deviceId}/psk/rotate`,
      );
      return res.data;
    },
    onSuccess: (data) => {
      setPsk(data.psk ?? null);
      setWarning(data.warning ?? null);
      setAcknowledged(false);
      invalidate();
    },
    onError: (err: unknown) =>
      setError(errorMessage(err, "Nie udało się wydać PSK.")),
  });

  const revoke = useMutation({
    mutationFn: async () => {
      await api.delete(`/devices/${deviceId}/psk`);
    },
    onSuccess: () => {
      invalidate();
      onClose();
    },
    onError: (err: unknown) =>
      setError(errorMessage(err, "Nie udało się odwołać PSK.")),
  });

  useEffect(() => {
    if (!psk) return;
    if (!wifi?.ssid) {
      setQrError("Brak SSID — kod QR wymaga uprawnienia wifi:read.");
      return;
    }

    let cancelled = false;
    const payload = `WIFI:T:WPA;S:${escapeWifiValue(wifi.ssid)};P:${escapeWifiValue(psk)};;`;

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
  }, [psk, wifi]);

  const handleCopy = async () => {
    if (!psk) return;
    try {
      await navigator.clipboard.writeText(psk);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Przeglądarka nie pozwoliła na kopiowanie. Przepisz ręcznie.");
    }
  };

  if (showRevoke) {
    return (
      <ConfirmByName
        title="Odwołaj PSK"
        expected={deviceLabel}
        consequences={[
          "Urządzenie natychmiast traci możliwość uwierzytelnienia w sieci Wi-Fi.",
          "Bieżąca sesja 802.11 zostanie zamknięta.",
          "Ponowne podłączenie wymaga wydania nowego PSK.",
        ]}
        confirmLabel="Odwołaj PSK"
        isPending={revoke.isPending}
        error={error}
        onClose={() => {
          setShowRevoke(false);
          setError(null);
        }}
        onConfirm={() => revoke.mutate()}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <h2 className="text-sm font-bold text-gray-800 dark:text-white">
            Poświadczenie Wi-Fi (PSK)
          </h2>
          {!psk && (
            <button
              onClick={onClose}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Zamknij"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
          {psk ? (
            <>
              <div className="rounded border border-amber-300 bg-amber-50 p-3 text-xs font-bold text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                {warning ||
                  "Ten sekret nie zostanie pokazany ponownie. Skopiuj go teraz."}
              </div>

              <div className="flex items-center gap-2 rounded bg-gray-900 p-3 dark:bg-gray-950">
                <code className="flex-1 break-all font-mono text-sm text-emerald-400">
                  {psk}
                </code>
                <button
                  onClick={handleCopy}
                  className="rounded bg-gray-700 p-2 text-gray-200 transition-colors hover:bg-gray-600"
                  aria-label="Kopiuj PSK"
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
                      alt="Kod QR do polaczenia z siecia Wi-Fi"
                      className="rounded bg-white p-2"
                      width={200}
                      height={200}
                    />
                    <p className="text-center text-[11px] text-gray-500 dark:text-gray-400">
                      Zeskanuj aparatem, żeby połączyć się z siecią{" "}
                      <span className="font-mono font-bold">{wifi?.ssid}</span>.
                      Kod zawiera sekret — nie rób mu zdjęcia.
                    </p>
                  </>
                ) : (
                  <p className="text-center text-[11px] text-gray-500 dark:text-gray-400">
                    {qrError || "Generuję kod QR..."}
                  </p>
                )}
              </div>

              <label className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="mt-0.5"
                />
                Zapisałem PSK w bezpiecznym miejscu.
              </label>
            </>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {device.has_psk
                ? "Rotacja wyda nowe poświadczenie i unieważni poprzednie. Urządzenie rozłączy się do czasu wpisania nowego PSK."
                : "Urządzenie nie ma jeszcze poświadczenia. Zostanie wydane jedno, pokazane dokładnie raz."}
            </p>
          )}

          {error && (
            <p className="rounded bg-red-100 px-3 py-2 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-800">
          {device.has_psk && !psk ? (
            <button
              onClick={() => {
                setError(null);
                setShowRevoke(true);
              }}
              className="text-xs font-semibold text-red-600 hover:underline dark:text-red-400"
            >
              Odwołaj PSK
            </button>
          ) : (
            <span />
          )}

          <div className="flex gap-2">
            {psk ? (
              <button
                onClick={onClose}
                disabled={!acknowledged}
                className="rounded bg-blue-600 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Gotowe
              </button>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="rounded px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Anuluj
                </button>
                <button
                  onClick={() => {
                    setError(null);
                    rotate.mutate();
                  }}
                  disabled={rotate.isPending}
                  className="rounded bg-blue-600 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
                >
                  {rotate.isPending
                    ? "Generuję..."
                    : device.has_psk
                      ? "Rotuj PSK"
                      : "Wydaj PSK"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
