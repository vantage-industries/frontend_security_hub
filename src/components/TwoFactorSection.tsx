import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as QRCode from "qrcode";
import {
  ShieldCheck,
  ShieldOff,
  Copy,
  Check,
  AlertTriangle,
  X,
} from "lucide-react";
import { api } from "../api/client";
import type { definitions } from "../api/types";

type MFASetupResponse = definitions["MFASetupResponse"];
type RecoveryCodesResponse = definitions["RecoveryCodesResponse"];

type Props = {
  enabled: boolean;
};

function errorMessage(err: unknown, fallback: string): string {
  const e = err as {
    response?: { status?: number; data?: { error?: { message?: string } } };
  };
  if (e?.response?.status === 401) {
    return "Kod się nie zgadza. Sprawdź, czy zegar w telefonie jest zsynchronizowany.";
  }
  return e?.response?.data?.error?.message || fallback;
}

export default function TwoFactorSection({ enabled }: Props) {
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<"idle" | "scan" | "codes" | "disable">(
    "idle",
  );
  const [setupData, setSetupData] = useState<MFASetupResponse | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [password, setPassword] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [codesWarning, setCodesWarning] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [copied, setCopied] = useState(false);
  const [secretShown, setSecretShown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const uri = setupData?.otpauth_uri;
    if (!uri) return;

    let cancelled = false;
    QRCode.toDataURL(uri, { width: 200, margin: 1 })
      .then((url: string) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            "Nie udało się narysować kodu QR. Wpisz klucz ręcznie w aplikacji.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [setupData]);

  const reset = () => {
    setStage("idle");
    setSetupData(null);
    setQrDataUrl(null);
    setTotpCode("");
    setPassword("");
    setCodes([]);
    setCodesWarning(null);
    setAcknowledged(false);
    setSecretShown(false);
    setError(null);
  };

  const setup = useMutation({
    mutationFn: async () => {
      const res = await api.post<MFASetupResponse>("/auth/mfa/setup");
      return res.data;
    },
    onSuccess: (data) => {
      setError(null);
      setSetupData(data);
      setStage("scan");
    },
    onError: (err: unknown) =>
      setError(errorMessage(err, "Nie udało się rozpocząć konfiguracji.")),
  });

  const confirm = useMutation({
    mutationFn: async () => {
      const res = await api.post<RecoveryCodesResponse>("/auth/mfa/confirm", {
        totp_code: totpCode,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setError(null);
      setCodes(data.recovery_codes ?? []);
      setCodesWarning(data.warning ?? null);
      setStage("codes");
      queryClient.invalidateQueries({ queryKey: ["session"] });
      queryClient.invalidateQueries({ queryKey: ["account-session"] });
    },
    onError: (err: unknown) =>
      setError(errorMessage(err, "Nie udało się włączyć weryfikacji.")),
  });

  const disable = useMutation({
    mutationFn: async () => {
      await api.post("/auth/mfa/disable", {
        password,
        totp_code: totpCode,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
      queryClient.invalidateQueries({ queryKey: ["account-session"] });
      reset();
    },
    onError: (err: unknown) =>
      setError(errorMessage(err, "Nie udało się wyłączyć weryfikacji.")),
  });

  const handleCopyCodes = async () => {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Przeglądarka nie pozwoliła na kopiowanie. Przepisz ręcznie.");
    }
  };

  const codeInput = (
    <input
      value={totpCode}
      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
      maxLength={6}
      inputMode="numeric"
      autoComplete="one-time-code"
      placeholder="000000"
      className="w-40 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-center font-mono text-xl tracking-widest text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-[#1a1d21] dark:text-white"
    />
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
            <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Weryfikacja dwuetapowa
          </h2>
          <p className="mt-1 max-w-xl text-sm text-gray-500 dark:text-gray-400">
            Przy logowaniu poza hasłem trzeba będzie podać kod z aplikacji w
            telefonie. Samo wykradzione hasło przestaje wystarczać.
          </p>
        </div>

        <span
          className={`rounded px-2.5 py-1 text-xs font-bold ${
            enabled
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          }`}
        >
          {enabled ? "Włączona" : "Wyłączona"}
        </span>
      </div>

      {stage === "idle" && (
        <>
          {enabled ? (
            <button
              onClick={() => {
                setError(null);
                setStage("disable");
              }}
              className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-700 transition-colors hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <ShieldOff className="h-4 w-4" /> Wyłącz weryfikację
            </button>
          ) : (
            <button
              onClick={() => setup.mutate()}
              disabled={setup.isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {setup.isPending ? "Przygotowuję..." : "Włącz weryfikację"}
            </button>
          )}
        </>
      )}

      {stage === "scan" && (
        <div className="space-y-4">
          <ol className="ml-4 list-decimal space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <li>
              Zainstaluj aplikację uwierzytelniającą, na przykład Aegis, Google
              Authenticator albo 1Password.
            </li>
            <li>Zeskanuj kod albo wpisz klucz ręcznie.</li>
            <li>Przepisz sześciocyfrowy kod, który się pojawi.</li>
          </ol>

          <div className="flex flex-wrap items-start gap-6">
            <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Kod QR do aplikacji uwierzytelniajacej"
                  width={200}
                  height={200}
                />
              ) : (
                <p className="w-[200px] text-center text-xs text-gray-500">
                  Rysuję kod...
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <p className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Nie możesz zeskanować?
                </p>
                {secretShown ? (
                  <code className="block break-all rounded bg-gray-100 px-3 py-2 font-mono text-xs text-gray-800 dark:bg-gray-950 dark:text-gray-200">
                    {setupData?.secret}
                  </code>
                ) : (
                  <button
                    onClick={() => setSecretShown(true)}
                    className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Pokaż klucz do wpisania ręcznie
                  </button>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Kod z aplikacji
                </label>
                {codeInput}
              </div>
            </div>
          </div>

          {error && (
            <p className="rounded bg-red-100 px-3 py-2 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={reset}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Anuluj
            </button>
            <button
              onClick={() => {
                setError(null);
                confirm.mutate();
              }}
              disabled={totpCode.length !== 6 || confirm.isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
            >
              {confirm.isPending ? "Sprawdzam..." : "Potwierdź i włącz"}
            </button>
          </div>
        </div>
      )}

      {stage === "codes" && (
        <div className="space-y-4">
          <div className="rounded border border-amber-300 bg-amber-50 p-3 text-xs font-bold text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
            {codesWarning ||
              "Te kody zobaczysz tylko teraz. Zapisz je poza telefonem — bez nich utrata telefonu oznacza utratę dostępu do panelu."}
          </div>

          <div className="grid grid-cols-2 gap-2 rounded bg-gray-950 p-4 sm:grid-cols-3">
            {codes.map((code) => (
              <code
                key={code}
                className="font-mono text-sm tracking-wider text-emerald-300"
              >
                {code}
              </code>
            ))}
          </div>

          <button
            onClick={handleCopyCodes}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            Kopiuj wszystkie
          </button>

          <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-1"
            />
            Zapisałem kody w bezpiecznym miejscu.
          </label>

          <button
            onClick={reset}
            disabled={!acknowledged}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
          >
            Gotowe
          </button>
        </div>
      )}

      {stage === "disable" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
              <h3 className="flex items-center gap-2 text-sm font-bold text-red-600 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" /> Wyłącz weryfikację
              </h3>
              <button
                onClick={reset}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Zamknij"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-4">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Konto wróci do ochrony samym hasłem. Dotychczasowe kody
                odzyskiwania przestaną działać.
              </p>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Hasło
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-red-500 dark:border-gray-700 dark:bg-[#1a1d21] dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Kod z aplikacji
                </label>
                {codeInput}
              </div>

              {error && (
                <p className="rounded bg-red-100 px-3 py-2 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300">
                  {error}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-800">
              <button
                onClick={reset}
                className="rounded px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Anuluj
              </button>
              <button
                onClick={() => {
                  setError(null);
                  disable.mutate();
                }}
                disabled={
                  !password || totpCode.length !== 6 || disable.isPending
                }
                className="rounded bg-red-600 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-40"
              >
                {disable.isPending ? "Wyłączam..." : "Wyłącz"}
              </button>
            </div>
          </div>
        </div>
      )}

      {stage === "idle" && error && (
        <p className="mt-3 rounded bg-red-100 px-3 py-2 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
