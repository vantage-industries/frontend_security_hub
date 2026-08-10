import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api } from "../api/client";
import type { definitions } from "../api/types";
import EnrollDeviceDialog from "./EnrollDeviceDialog";
import { useSession } from "../hooks/useSession";

type ListResponseDevice =
  definitions["ListResponse-security-hub_internal_dto_Device"];

export default function AddDeviceButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { can } = useSession();

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

  if (!can("device:enroll")) {
    return null;
  }

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

      {isOpen && <EnrollDeviceDialog onClose={() => setIsOpen(false)} />}
    </>
  );
}
