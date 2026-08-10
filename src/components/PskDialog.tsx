import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { api } from "../api/client";
import { useSession } from "../hooks/useSession";
import type { definitions } from "../api/types";
import ConfirmByName from "./ConfirmByName";
import CredentialReveal from "./CredentialReveal";

type Device = definitions["Device"];
type CredentialResponse = definitions["CredentialResponse"];
type RotatePSKRequest = definitions["RotatePSKRequest"];

type Props = {
  device: Device;
  deviceId: string;
  onClose: () => void;
};

function errorMessage(err: unknown, fallback: string): string {
  const e = err as {
    response?: { data?: { error?: { code?: string; message?: string } } };
  };
  const code = e?.response?.data?.error?.code;
  if (code === "invalid_device_passphrase") {
    return "Klucz musi mieć 8–63 znaki ASCII, bez spacji na brzegach.";
  }
  if (code === "weak_device_passphrase") {
    return "Ten klucz jest zbyt popularny. Wybierz inny.";
  }
  return e?.response?.data?.error?.message || fallback;
}

export default function PskDialog({ device, deviceId, onClose }: Props) {
  const queryClient = useQueryClient();
  const { can } = useSession();
  const [credential, setCredential] = useState<CredentialResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRevoke, setShowRevoke] = useState(false);
  const [useOwnPsk, setUseOwnPsk] = useState(false);
  const [psk, setPsk] = useState("");

  const deviceLabel =
    device.display_name ||
    device.model_name ||
    device.macs?.[0]?.mac ||
    "urządzenie";

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["device", deviceId] });
    queryClient.invalidateQueries({ queryKey: ["devices"] });
  };

  const rotate = useMutation({
    mutationFn: async (payload: RotatePSKRequest) => {
      const res = await api.post<CredentialResponse>(
        `/devices/${deviceId}/psk/rotate`,
        payload,
      );
      return res.data;
    },
    onSuccess: (data) => {
      setCredential(data);
      invalidate();
    },
    onError: (err: unknown) =>
      setError(errorMessage(err, "Nie udało się wydać klucza.")),
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
      setError(errorMessage(err, "Nie udało się odwołać klucza.")),
  });

  const handleRotate = () => {
    setError(null);
    if (useOwnPsk) {
      if (psk.length < 8 || psk.length > 63) {
        setError("Klucz musi mieć od 8 do 63 znaków.");
        return;
      }
      if (psk !== psk.trim()) {
        setError("Klucz nie może zaczynać się ani kończyć spacją.");
        return;
      }
      rotate.mutate({ psk });
      return;
    }
    rotate.mutate({});
  };

  if (showRevoke) {
    return (
      <ConfirmByName
        title="Odwołaj klucz"
        expected={deviceLabel}
        consequences={[
          "Urządzenie natychmiast traci możliwość uwierzytelnienia w sieci Wi-Fi.",
          "Bieżąca sesja zostanie zamknięta.",
          "Ponowne podłączenie wymaga wydania nowego klucza.",
        ]}
        confirmLabel="Odwołaj klucz"
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
            Klucz Wi-Fi urządzenia
          </h2>
          {!credential && (
            <button
              onClick={onClose}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Zamknij"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {credential ? (
          <CredentialReveal credential={credential} onDone={onClose} />
        ) : (
          <>
            <div className="space-y-4 p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {device.has_psk
                  ? "Rotacja wyda nowy klucz i unieważni poprzedni. Urządzenie rozłączy się do czasu wpisania nowego."
                  : "Urządzenie nie ma jeszcze klucza. Zostanie wydany jeden, pokazany dokładnie raz."}
              </p>

              <div className="rounded border border-gray-200 p-3 dark:border-gray-800">
                <label className="flex items-start gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={useOwnPsk}
                    onChange={(e) => {
                      setUseOwnPsk(e.target.checked);
                      setError(null);
                    }}
                    className="mt-0.5"
                  />
                  Podaj własny klucz
                </label>

                {useOwnPsk ? (
                  <input
                    value={psk}
                    onChange={(e) => setPsk(e.target.value)}
                    placeholder="8–63 znaki ASCII"
                    className="mt-3 w-full rounded border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  />
                ) : (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Appliance wygeneruje klucz sam, bez znaków mylących się przy
                    przepisywaniu.
                  </p>
                )}
              </div>

              {error && (
                <p className="rounded bg-red-100 px-3 py-2 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300">
                  {error}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-800">
              {device.has_psk && can("device:psk:revoke") ? (
                <button
                  onClick={() => {
                    setError(null);
                    setShowRevoke(true);
                  }}
                  className="text-xs font-semibold text-red-600 hover:underline dark:text-red-400"
                >
                  Odwołaj klucz
                </button>
              ) : (
                <span />
              )}

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="rounded px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleRotate}
                  disabled={rotate.isPending}
                  className="rounded bg-blue-600 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
                >
                  {rotate.isPending
                    ? "Generuję..."
                    : device.has_psk
                      ? "Rotuj klucz"
                      : "Wydaj klucz"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
