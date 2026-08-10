import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import * as QRCode from "qrcode";
import { Copy, Check, AlertTriangle } from "lucide-react";
import type { definitions } from "../api/types";

type CredentialResponse = definitions["CredentialResponse"];

type Props = {
  credential: CredentialResponse;
  note?: ReactNode;
  doneLabel?: string;
  onDone: () => void;
};

export default function CredentialReveal({
  credential,
  note,
  doneLabel = "Gotowe",
  onDone,
}: Props) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  const psk = credential.psk ?? "";
  const payload = credential.wifi_qr_payload;
  const syncStatus = credential.credential_sync?.status;
  const syncError = credential.credential_sync?.error;
  const isSynced = syncStatus === "applied";

  useEffect(() => {
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
  }, [payload]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(psk);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(
        "Przeglądarka nie pozwoliła na kopiowanie. Przepisz ręcznie.",
      );
    }
  };

  return (
    <>
      <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-xs font-bold text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          {credential.warning ||
            "Ten klucz nie zostanie pokazany ponownie. Zapisz go teraz."}
        </div>

        {!isSynced && (
          <div className="space-y-1 rounded border border-red-300 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <p className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="h-3.5 w-3.5" />
              Punkt dostępowy nie zna jeszcze tego klucza
            </p>
            <p>
              Status synchronizacji: {syncStatus || "nieznany"}. Urządzenie nie
              połączy się, dopóki nie zmieni się na „applied”. Odśwież stan hubu
              i spróbuj ponownie za chwilę.
            </p>
            {syncError && <p className="font-mono">{syncError}</p>}
          </div>
        )}

        <div className="flex items-center gap-2 rounded bg-gray-900 p-3 dark:bg-gray-950">
          <code className="flex-1 break-all font-mono text-sm text-emerald-400">
            {psk || "brak klucza w odpowiedzi"}
          </code>
          <button
            onClick={handleCopy}
            disabled={!psk}
            className="rounded bg-gray-700 p-2 text-gray-200 transition-colors hover:bg-gray-600 disabled:opacity-40"
            aria-label="Kopiuj klucz"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>

        {credential.operator_supplied && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            To klucz podany przez Ciebie, nie wygenerowany przez appliance.
          </p>
        )}

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
                <span className="font-mono font-bold">
                  {credential.ssid || "hubu"}
                </span>
                . Kod zawiera klucz — nie rób mu zdjęcia.
              </p>
            </>
          ) : (
            <p className="text-center text-[11px] text-gray-500 dark:text-gray-400">
              {qrError || "Generuję kod QR..."}
            </p>
          )}
        </div>

        {note}

        {copyError && (
          <p className="rounded bg-red-100 px-3 py-2 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {copyError}
          </p>
        )}

        <label className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-0.5"
          />
          Zapisałem klucz w bezpiecznym miejscu.
        </label>
      </div>

      <div className="flex justify-end border-t border-gray-200 px-4 py-3 dark:border-gray-800">
        <button
          onClick={onDone}
          disabled={!acknowledged}
          className="rounded bg-blue-600 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {doneLabel}
        </button>
      </div>
    </>
  );
}
