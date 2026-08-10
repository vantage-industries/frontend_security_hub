import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Menu,
  X,
  Moon,
  Sun,
  LogOut,
  Edit2,
  Save,
  Shield,
  Server,
} from "lucide-react";
import { api } from "../api/client";
import Sidebar from "../components/Sidebar";
import { useSession } from "../hooks/useSession";
import type { definitions } from "../api/types";

type VLAN = definitions["VLAN"];
//type PolicyProfile = definitions["PolicyProfile"];
type ListResponseVLAN =
  definitions["ListResponse-security-hub_internal_dto_VLAN"];
type ListResponsePolicy =
  definitions["ListResponse-security-hub_internal_dto_PolicyProfile"];

export default function Vlans() {
  const queryClient = useQueryClient();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [editingVlan, setEditingVlan] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{
    display_name: string;
    client_isolation: boolean;
    policy_profile_id: string;
  }>({
    display_name: "",
    client_isolation: false,
    policy_profile_id: "",
  });

  const { data: vlansData, isLoading: isVlansLoading } = useQuery({
    queryKey: ["vlans"],
    queryFn: async () => {
      const res = await api.get<ListResponseVLAN>("/vlans");
      return res.data;
    },
    refetchInterval: 15000,
  });

  const { data: policiesData } = useQuery({
    queryKey: ["policies"],
    queryFn: async () => {
      const res = await api.get<ListResponsePolicy>("/policy-profiles");
      return res.data;
    },
  });

  const { can } = useSession();

  const updateVlanMutation = useMutation({
    mutationFn: async ({
      vid,
      payload,
    }: {
      vid: number;
      payload: definitions["UpdateVLANRequest"];
    }) => {
      const res = await api.patch(`/vlans/${vid}`, payload);
      return res.data;
    },
    onSuccess: () => {
      setEditingVlan(null);
      queryClient.invalidateQueries({ queryKey: ["vlans"] });
      queryClient.invalidateQueries({ queryKey: ["system-status"] });
    },
    onError: (error: any) => {
      alert(
        error?.response?.data?.error?.message ||
          "Nie udało się zaktualizować segmentu VLAN.",
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

  const handleEditClick = (vlan: VLAN) => {
    setEditForm({
      display_name: vlan.display_name || "",
      client_isolation: vlan.client_isolation || false,
      policy_profile_id: vlan.policy_profile_id
        ? vlan.policy_profile_id.toString()
        : "",
    });
    setEditingVlan(vlan.vid as number);
  };

  const handleSaveClick = (vid: number) => {
    const payload: definitions["UpdateVLANRequest"] = {
      display_name: editForm.display_name,
      client_isolation: editForm.client_isolation,
      detach_profile: editForm.policy_profile_id === "",
    };

    if (editForm.policy_profile_id !== "") {
      payload.policy_profile_id = parseInt(editForm.policy_profile_id, 10);
    }

    updateVlanMutation.mutate({ vid, payload });
  };

  const sortedVlans = vlansData?.data
    ? [...vlansData.data].sort((a, b) => (a.vid || 0) - (b.vid || 0))
    : [];

  return (
    <div className="min-h-screen bg-gray-100 flex transition-colors duration-200 dark:bg-gray-950 font-sans relative">
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
              Segmenty Sieci (VLAN)
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
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                  <Server className="w-5 h-5 text-blue-500" /> Architektura
                  Adresacji
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                    <tr>
                      <th className="px-6 py-4">VLAN ID / Nazwa</th>
                      <th className="px-6 py-4">Podsieć (CIDR)</th>
                      <th className="px-6 py-4">Brama Domyślna</th>
                      <th className="px-6 py-4">Pula DHCP</th>
                      <th className="px-6 py-4 text-center">
                        Izolacja Klientów
                      </th>
                      <th className="px-6 py-4">Profil Bezpieczeństwa</th>
                      <th className="px-6 py-4 text-right">Akcje</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {isVlansLoading ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="p-8 text-center text-gray-500"
                        >
                          Pobieranie architektury sieci...
                        </td>
                      </tr>
                    ) : (
                      sortedVlans.map((vlan) => {
                        const isDeployed = vlan.is_deployed;
                        const isEditing = editingVlan === vlan.vid;

                        return (
                          <tr
                            key={vlan.vid}
                            className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${!isDeployed ? "opacity-60 bg-gray-50/50 dark:bg-gray-900/50" : ""}`}
                          >
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-3">
                                <span
                                  className={`px-2 py-1 rounded text-xs font-bold ${isDeployed ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" : "bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-500"}`}
                                >
                                  VID {vlan.vid}
                                </span>
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editForm.display_name}
                                    onChange={(e) =>
                                      setEditForm({
                                        ...editForm,
                                        display_name: e.target.value,
                                      })
                                    }
                                    className="border border-blue-400 rounded px-2 py-1 text-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-white outline-none w-32"
                                    placeholder={vlan.name}
                                  />
                                ) : (
                                  <div className="font-bold text-gray-900 dark:text-white">
                                    {vlan.display_name || vlan.name}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-3 font-mono text-gray-500 dark:text-gray-400">
                              {vlan.subnet_cidr || "-"}
                            </td>
                            <td className="px-6 py-3 font-mono font-medium text-gray-800 dark:text-gray-200">
                              {vlan.gateway_ip || "-"}
                            </td>
                            <td className="px-6 py-3 font-mono text-xs">
                              {vlan.dhcp_pool_start
                                ? `${vlan.dhcp_pool_start} - ${vlan.dhcp_pool_end}`
                                : "Brak"}
                            </td>
                            <td className="px-6 py-3 text-center">
                              {isEditing ? (
                                <select
                                  value={
                                    editForm.client_isolation ? "true" : "false"
                                  }
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      client_isolation:
                                        e.target.value === "true",
                                    })
                                  }
                                  className="border border-blue-400 rounded px-2 py-1 text-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-white outline-none"
                                >
                                  <option value="false">Wyłączona</option>
                                  <option value="true">Włączona</option>
                                </select>
                              ) : vlan.client_isolation ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400">
                                  Izolowany
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                  Swobodny
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-3">
                              {isEditing ? (
                                <select
                                  value={editForm.policy_profile_id}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      policy_profile_id: e.target.value,
                                    })
                                  }
                                  className="border border-blue-400 rounded px-2 py-1 text-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-white outline-none w-40"
                                >
                                  <option value="">Brak profilu</option>
                                  {policiesData?.data?.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <Shield
                                    className={`w-3.5 h-3.5 ${vlan.policy_profile_id ? "text-emerald-500" : "text-gray-300 dark:text-gray-700"}`}
                                  />
                                  <span
                                    className={
                                      vlan.policy_profile_id
                                        ? "text-gray-700 dark:text-gray-300 font-medium"
                                        : "text-gray-400 italic"
                                    }
                                  >
                                    {vlan.policy_profile || "Brak"}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-3 text-right">
                              {!isDeployed ? (
                                <span className="text-[10px] uppercase font-bold text-gray-400 border border-gray-200 dark:border-gray-800 px-2 py-1 rounded">
                                  Zastrzeżony
                                </span>
                              ) : isEditing ? (
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => setEditingVlan(null)}
                                    className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleSaveClick(vlan.vid as number)
                                    }
                                    disabled={updateVlanMutation.isPending}
                                    className="p-1.5 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded transition-colors"
                                  >
                                    <Save className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleEditClick(vlan)}
                                  disabled={!can("vlan:update")}
                                  title={
                                    can("vlan:update")
                                      ? undefined
                                      : "Wymaga uprawnienia vlan:update"
                                  }
                                  className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
