import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Globe, X } from "lucide-react";
import { api } from "../api/client";

type Props = {
  deviceId: string;
};

const storageKey = (deviceId: string) => `internet-window:${deviceId}`;

function readExpiry(deviceId: string): number | null {
  const raw = localStorage.getItem(storageKey(deviceId));
  if (!raw) return null;
  const ts = Number(raw);
  if (!Number.isFinite(ts) || ts <= Date.now()) {
    localStorage.removeItem(storageKey(deviceId));
    return null;
  }
  return ts;
}

function formatCountdown(msLeft: number): string {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

function errorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { error?: { message?: string } } } };
  return e?.response?.data?.error?.message || fallback;
}

export default function InternetWindowButton({ deviceId }: Props) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [minutes, setMinutes] = useState(60);
  const [error, setError] = useState<string | null>(null);
  const [expiry, setExpiry] = useState<number | null>(() =>
    readExpiry(deviceId),
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiry) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [expiry]);

  useEffect(() => {
    if (expiry && expiry <= now) {
      localStorage.removeItem(storageKey(deviceId));
      setExpiry(null);
      queryClient.invalidateQueries({
        queryKey: ["device-firewall", deviceId],
      });
    }
  }, [now, expiry, deviceId, queryClient]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["device-firewall", deviceId] });
    queryClient.invalidateQueries({ queryKey: ["system-status"] });
  };

  const grant = useMutation({
    mutationFn: async (requested: number) => {
      await api.post(`/devices/${deviceId}/internet-window`, {
        minutes: requested,
      });
      return requested;
    },
    onSuccess: (granted) => {
      const until = Date.now() + granted * 60000;
      localStorage.setItem(storageKey(deviceId), String(until));
      setExpiry(until);
      setNow(Date.now());
      invalidate();
      setIsOpen(false);
    },
    onError: (err: unknown) =>
      setError(errorMessage(err, "Nie udało się otworzyć okna internetowego.")),
  });

  const revoke = useMutation({
    mutationFn: async () => {
      await api.delete(`/devices/${deviceId}/internet-window`);
    },
    onSuccess: () => {
      localStorage.removeItem(storageKey(deviceId));
      setExpiry(null);
      invalidate();
    },
    onError: (err: unknown) =>
      setError(errorMessage(err, "Nie udało się zamknąć okna internetowego.")),
  });

  return (
    <>
      <button
        onClick={() => {
          setError(null);
          setIsOpen(true);
        }}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded text-xs font-semibold transition-colors"
      >
        <Globe className="w-4 h-4" /> Okno Internetowe
      </button>

      {expiry && (
        <span className="flex items-center gap-2 rounded bg-emerald-50 px-2 py-1 font-mono text-[11px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          {formatCountdown(expiry - now)}
          <button
            onClick={() => revoke.mutate()}
            disabled={revoke.isPending}
            className="font-sans underline underline-offset-2 hover:no-underline disabled:opacity-40"
          >
            zamknij
          </button>
        </span>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
              <h2 className="text-sm font-bold text-gray-800 dark:text-white">
                Okno internetowe
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Zamknij"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-4">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Czasowa zgoda na ruch wychodzący. Po upływie okna reguła znika
                sama i nie zostaje w konfiguracji. Maksymalnie 24 godziny.
              </p>

              <div className="flex gap-2">
                {[15, 60, 240].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setMinutes(preset)}
                    className={`flex-1 rounded border px-3 py-2 text-xs font-bold transition-colors ${
                      minutes === preset
                        ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                    }`}
                  >
                    {preset < 60 ? `${preset} min` : `${preset / 60} h`}
                  </button>
                ))}
              </div>

              <div>
                <label
                  htmlFor="window-minutes"
                  className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400"
                >
                  Albo własna wartość (minuty)
                </label>
                <input
                  id="window-minutes"
                  type="number"
                  min={1}
                  max={1440}
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>

              {expiry && (
                <p className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                  Okno jest już otwarte i wygasa za{" "}
                  {formatCountdown(expiry - now)}. Nowe zastąpi obecne.
                </p>
              )}

              {error && (
                <p className="rounded bg-red-100 px-3 py-2 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300">
                  {error}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-800">
              <button
                onClick={() => setIsOpen(false)}
                className="rounded px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Anuluj
              </button>
              <button
                onClick={() => {
                  setError(null);
                  grant.mutate(minutes);
                }}
                disabled={
                  !Number.isFinite(minutes) ||
                  minutes < 1 ||
                  minutes > 1440 ||
                  grant.isPending
                }
                className="rounded bg-blue-600 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {grant.isPending ? "Otwieram..." : "Otwórz okno"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
