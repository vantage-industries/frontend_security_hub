import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, X, Inbox } from "lucide-react";
import { api } from "../api/client";
import type { definitions } from "../api/types";

type ListResponseDevice =
  definitions["ListResponse-security-hub_internal_dto_Device"];

export default function AddDeviceButton() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const { data: pending } = useQuery({
    queryKey: ["onboarding-pending"],
    queryFn: async () => {
      const res = await api.get<ListResponseDevice>(
        "/onboarding/pending?limit=1",
      );
      return res.data;
    },
    refetchInterval: 30000,
    retry: false,
  });

  const waiting = pending?.total ?? 0;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded bg-blue-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-700"
      >
        <Plus className="h-4 w-4" /> Dodaj urządzenie
        {waiting > 0 && (
          <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] text-blue-700">
            {waiting}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
              <h2 className="text-sm font-bold text-gray-800 dark:text-white">
                Jak dodać urządzenie
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Zamknij"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 p-4 text-sm text-gray-600 dark:text-gray-400">
              <p>
                Urządzeń nie dodaje się ręcznie. Podłącz je do sieci Wi-Fi hubu
                — zgłosi się samo i trafi do kolejki oczekujących.
              </p>
              <p>
                Tam nadajesz mu nazwę i segment, a dopiero zatwierdzenie
                wpuszcza je do sieci. Do tego czasu nie ma dostępu do niczego.
              </p>

              <div className="flex items-center gap-2 rounded bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 dark:bg-gray-950 dark:text-gray-300">
                <Inbox className="h-4 w-4" />
                {waiting > 0
                  ? `Oczekujących: ${waiting}`
                  : "Kolejka jest pusta"}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-800">
              <button
                onClick={() => setIsOpen(false)}
                className="rounded px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Zamknij
              </button>
              <button
                onClick={() => navigate("/onboarding")}
                className="rounded bg-blue-600 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700"
              >
                Przejdź do kolejki
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
