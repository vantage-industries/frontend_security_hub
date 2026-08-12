import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { api } from "../api/client";
import type { definitions } from "../api/types";
import CredentialReveal from "./CredentialReveal";
import { useSession } from "../hooks/useSession";

type CredentialResponse = definitions["CredentialResponse"];
type EnrollDeviceRequest = definitions["EnrollDeviceRequest"];

type Props = {
  onClose: () => void;
};

type FieldErrors = {
  display_name?: string;
  mac?: string;
  psk?: string;
};

type ApiError = {
  response?: {
    data?: {
      error?: {
        code?: string;
        message?: string;
        fields?: { [key: string]: string };
      };
    };
  };
};

const macPattern = /^(?:[0-9a-f]{2}[:-]){5}[0-9a-f]{2}$|^[0-9a-f]{12}$/i;

export default function EnrollDeviceDialog({ onClose }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can } = useSession();

  const [displayName, setDisplayName] = useState("");
  const [mac, setMac] = useState("");
  const [notes, setNotes] = useState("");
  const [useOwnPsk, setUseOwnPsk] = useState(false);
  const [grantInternet, setGrantInternet] = useState(false);
  const [setupMinutes, setSetupMinutes] = useState(60);
  const [psk, setPsk] = useState("");

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [windowWarning, setWindowWarning] = useState<string | null>(null);
  const [credential, setCredential] = useState<CredentialResponse | null>(null);

  const enroll = useMutation({
    mutationFn: async (payload: EnrollDeviceRequest) => {
      const res = await api.post<CredentialResponse>(
        "/devices/enroll",
        payload,
      );
      return res.data;
    },
    onSuccess: async (data) => {
      setCredential(data);
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding-pending"] });
      queryClient.invalidateQueries({ queryKey: ["system-status"] });

      if (grantInternet && data.device?.id) {
        try {
          await api.post(`/devices/${data.device.id}/internet-window`, {
            minutes: setupMinutes,
          });
        } catch (err) {
          const body = (
            err as { response?: { data?: { error?: { message?: string } } } }
          )?.response?.data?.error;
          setWindowWarning(
            body?.message ||
              "Urządzenie dodano, ale nie udało się otworzyć okna internetowego. Możesz je otworzyć z karty urządzenia.",
          );
        }
      }
    },
    onError: (err: unknown) => {
      const body = (err as ApiError)?.response?.data?.error;
      const code = body?.code;
      const next: FieldErrors = {};

      if (body?.fields) {
        if (body.fields.display_name)
          next.display_name = body.fields.display_name;
        if (body.fields.mac) next.mac = body.fields.mac;
        if (body.fields.psk) next.psk = body.fields.psk;
      }

      if (code === "invalid_mac") {
        next.mac = "Adres MAC ma niepoprawny format.";
      } else if (code === "mac_in_use") {
        next.mac = "Ten adres MAC należy już do innego urządzenia.";
      } else if (code === "invalid_device_passphrase") {
        next.psk = "Klucz musi mieć 8–63 znaki ASCII, bez spacji na brzegach.";
      } else if (code === "weak_device_passphrase") {
        next.psk = "Ten klucz jest zbyt popularny. Wybierz inny.";
      }

      setFieldErrors(next);

      if (code === "vlan_not_deployed") {
        setFormError(
          "Segment kwarantanny nie jest wdrożony, więc urządzenie nie miałoby gdzie trafić. Wdróż go w Segmentach sieci i spróbuj ponownie.",
        );
      } else if (Object.keys(next).length === 0) {
        setFormError(body?.message || "Nie udało się dodać urządzenia.");
      } else {
        setFormError(null);
      }
    },
  });

  const validate = (): boolean => {
    const next: FieldErrors = {};

    if (!displayName.trim()) {
      next.display_name = "Nazwa jest wymagana.";
    }
    if (mac.trim() && !macPattern.test(mac.trim())) {
      next.mac = "Oczekiwany format to aa:bb:cc:dd:ee:ff.";
    }
    if (useOwnPsk) {
      const value = psk;
      if (value.length < 8 || value.length > 63) {
        next.psk = "Klucz musi mieć od 8 do 63 znaków.";
      } else if (value !== value.trim()) {
        next.psk = "Klucz nie może zaczynać się ani kończyć spacją.";
      }
    }

    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    setFormError(null);
    if (!validate()) return;

    const payload: EnrollDeviceRequest = { display_name: displayName.trim() };
    if (mac.trim()) payload.mac = mac.trim();
    if (notes.trim()) payload.notes = notes.trim();
    if (useOwnPsk && psk) payload.psk = psk;

    enroll.mutate(payload);
  };

  const inputClass = (error?: string) =>
    `w-full rounded border px-3 py-2 text-sm outline-none dark:bg-gray-950 dark:text-white ${
      error
        ? "border-red-500 focus:border-red-500"
        : "border-gray-300 focus:border-blue-500 dark:border-gray-700"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <h2 className="text-sm font-bold text-gray-800 dark:text-white">
            {credential ? "Klucz urządzenia" : "Dodaj urządzenie"}
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
          <CredentialReveal
            credential={credential}
            doneLabel="Gotowe"
            onDone={onClose}
            note={
              <div className="space-y-2 rounded bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-950 dark:text-gray-400">
                {windowWarning && (
                  <p className="rounded bg-amber-100 px-2 py-1.5 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                    {windowWarning}
                  </p>
                )}
                {grantInternet && !windowWarning && (
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                    Dostęp do internetu otwarty na{" "}
                    {setupMinutes < 60
                      ? `${setupMinutes} min`
                      : `${setupMinutes / 60} h`}
                    .
                  </p>
                )}
                <p>
                  Urządzenie czeka teraz w kwarantannie na pierwsze połączenie.
                  Wpisz ten klucz w sprzęcie albo zeskanuj kod.
                </p>
                <p>
                  Gdy się zgłosi, przydziel je do segmentu na liście nowych
                  urządzeń. Do tego czasu nie ma dostępu do sieci.
                </p>
                <button
                  onClick={() => navigate("/onboarding")}
                  className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
                >
                  Przejdź do nowych urządzeń
                </button>
              </div>
            }
          />
        ) : (
          <>
            <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Klucz powstaje przed urządzeniem: punkt dostępowy wpuści sprzęt
                dopiero wtedy, gdy zna jego hasło. Po zapisaniu dostaniesz klucz
                pokazany jeden raz.
              </p>

              <div>
                <label
                  htmlFor="enroll-name"
                  className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400"
                >
                  Nazwa urządzenia
                </label>
                <input
                  id="enroll-name"
                  autoFocus
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Kamera w pokoju dziecięcym"
                  className={inputClass(fieldErrors.display_name)}
                />
                {fieldErrors.display_name && (
                  <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                    {fieldErrors.display_name}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="enroll-mac"
                  className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400"
                >
                  Adres MAC (opcjonalnie)
                </label>
                <input
                  id="enroll-mac"
                  value={mac}
                  onChange={(e) => setMac(e.target.value)}
                  placeholder="aa:bb:cc:dd:ee:ff"
                  className={`${inputClass(fieldErrors.mac)} font-mono`}
                />
                {fieldErrors.mac ? (
                  <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                    {fieldErrors.mac}
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    Podany z etykiety sprzętu pozwala od razu rozpoznać
                    producenta. Nie jest tożsamością urządzenia.
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="enroll-notes"
                  className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400"
                >
                  Notatka (opcjonalnie)
                </label>
                <textarea
                  id="enroll-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={inputClass()}
                />
              </div>

              <div className="rounded border border-gray-200 p-3 dark:border-gray-800">
                <label className="flex items-start gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={useOwnPsk}
                    onChange={(e) => {
                      setUseOwnPsk(e.target.checked);
                      setFieldErrors({ ...fieldErrors, psk: undefined });
                    }}
                    className="mt-0.5"
                  />
                  Podaj własny klucz
                </label>

                {useOwnPsk ? (
                  <div className="mt-3">
                    <input
                      value={psk}
                      onChange={(e) => setPsk(e.target.value)}
                      placeholder="8–63 znaki ASCII"
                      className={`${inputClass(fieldErrors.psk)} font-mono`}
                    />
                    {fieldErrors.psk && (
                      <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                        {fieldErrors.psk}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Appliance wygeneruje klucz sam — krótki, bez znaków mylących
                    się przy przepisywaniu z telefonu. Własny podaj tylko wtedy,
                    gdy aplikacja producenta nie przyjmie wygenerowanego.
                  </p>
                )}
              </div>

              {can("device:internet_window:grant") && (
                <div className="rounded border border-gray-200 p-3 dark:border-gray-800">
                  <label className="flex items-start gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={grantInternet}
                      onChange={(e) => setGrantInternet(e.target.checked)}
                      className="mt-0.5"
                    />
                    Dostęp do internetu na czas konfiguracji
                  </label>

                  {grantInternet ? (
                    <div className="mt-3">
                      <div className="flex gap-2">
                        {[15, 60, 240].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setSetupMinutes(preset)}
                            className={`flex-1 rounded border px-3 py-2 text-xs font-bold transition-colors ${
                              setupMinutes === preset
                                ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                            }`}
                          >
                            {preset < 60 ? `${preset} min` : `${preset / 60} h`}
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Okno zamknie się samo i nie zostanie w konfiguracji.
                        Urządzenie przez ten czas jest w kwarantannie, więc
                        dostaje wyłącznie ruch wychodzący.
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Wiele sprzętów przy pierwszym uruchomieniu musi pobrać
                      aktualizację albo połączyć się z chmurą producenta. Bez
                      tego okna nie zrobi tego, dopóki nie przydzielisz go do
                      segmentu.
                    </p>
                  )}
                </div>
              )}

              {formError && (
                <p className="rounded bg-red-100 px-3 py-2 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300">
                  {formError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-800">
              <button
                onClick={onClose}
                className="rounded px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Anuluj
              </button>
              <button
                onClick={handleSubmit}
                disabled={enroll.isPending}
                className="rounded bg-blue-600 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
              >
                {enroll.isPending ? "Dodaję..." : "Dodaj i wygeneruj klucz"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
