import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Menu,
  Moon,
  Sun,
  LogOut,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { api } from "../api/client";
import Sidebar from "../components/Sidebar";
import type { definitions } from "../api/types";

// type Device = definitions["Device"];
type ListResponseDevice =
  definitions["ListResponse-security-hub_internal_dto_Device"];

export default function Devices() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [search, setSearch] = useState("");
  const [vlanFilter, setVlanFilter] = useState("");
  const [classificationFilter, setClassificationFilter] = useState("");
  const [page, setPage] = useState(0);
  const limit = 15;

  const { data: devicesData, isLoading } = useQuery({
    queryKey: ["devices", search, vlanFilter, classificationFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("limit", limit.toString());
      params.append("offset", (page * limit).toString());
      if (search) params.append("search", search);
      if (vlanFilter) params.append("vlan", vlanFilter);
      if (classificationFilter)
        params.append("classification", classificationFilter);

      const res = await api.get<ListResponseDevice>(
        `/devices?${params.toString()}`,
      );
      return res.data;
    },
    refetchInterval: 10000,
  });

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark", !isDarkMode);
  };

  const totalPages = Math.ceil((devicesData?.total || 0) / limit);

  return (
    <div className="min-h-screen bg-gray-100 flex transition-colors duration-200 dark:bg-gray-950 font-sans">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-4 md:px-6 border-b border-gray-200 sticky top-0 z-30 dark:bg-gray-900 dark:border-gray-800">
          <div className="flex items-center">
            <button
              className="lg:hidden p-2 -ml-2 mr-3 text-gray-600 hover:bg-gray-100 rounded-lg dark:text-gray-400 dark:hover:bg-gray-800"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-800 dark:text-white">
              Inwentarz Urządzeń
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
              onClick={async () => {
                try {
                  await api.post("/auth/logout");
                } catch (e) {}
                localStorage.removeItem("csrf_token");
                window.location.href = "/login";
              }}
              className="flex items-center gap-2 p-2 text-red-600 hover:bg-red-50 rounded dark:text-red-400 dark:hover:bg-red-950/50"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline font-medium text-sm">
                Wyloguj
              </span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-4 overflow-auto flex flex-col">
          <div className="bg-white dark:bg-gray-900 rounded shadow-sm border border-gray-200 dark:border-gray-800 p-3 mb-4 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-gray-400 ml-1" />
              <input
                type="text"
                placeholder="Szukaj po nazwie, IP lub MAC..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="w-full bg-transparent text-sm text-gray-800 dark:text-white focus:outline-none px-1"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={vlanFilter}
                onChange={(e) => {
                  setVlanFilter(e.target.value);
                  setPage(0);
                }}
                className="bg-gray-50 border border-gray-200 dark:bg-gray-800 dark:border-gray-700 text-xs rounded px-2 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none"
              >
                <option value="">Wszystkie VLANy</option>
                <option value="10">VLAN 10</option>
                <option value="20">VLAN 20</option>
                <option value="30">VLAN 30</option>
                <option value="99">VLAN 99</option>
              </select>

              <select
                value={classificationFilter}
                onChange={(e) => {
                  setClassificationFilter(e.target.value);
                  setPage(0);
                }}
                className="bg-gray-50 border border-gray-200 dark:bg-gray-800 dark:border-gray-700 text-xs rounded px-2 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none"
              >
                <option value="">Wszystkie klasy</option>
                <option value="trusted">Trusted</option>
                <option value="guest">Guest</option>
                <option value="iot">IoT</option>
                <option value="quarantined">Quarantined</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden flex-1 flex flex-col justify-between">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-3 py-2 border-b dark:border-gray-700 w-10 text-center">
                      St
                    </th>
                    <th className="px-3 py-2 border-b dark:border-gray-700">
                      Nazwa Urządzenia
                    </th>
                    <th className="px-3 py-2 border-b dark:border-gray-700">
                      Producent / Model
                    </th>
                    <th className="px-3 py-2 border-b dark:border-gray-700">
                      VLAN
                    </th>
                    <th className="px-3 py-2 border-b dark:border-gray-700">
                      Klasyfikacja
                    </th>
                    <th className="px-3 py-2 border-b dark:border-gray-700">
                      Adres MAC
                    </th>
                    <th className="px-3 py-2 border-b dark:border-gray-700">
                      Ostatnio widziane
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-xs">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="p-8 text-center font-sans text-gray-500"
                      >
                        Ładowanie urządzeń...
                      </td>
                    </tr>
                  ) : devicesData?.data?.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="p-8 text-center font-sans text-gray-500"
                      >
                        Brak urządzeń.
                      </td>
                    </tr>
                  ) : (
                    devicesData?.data?.map((device) => {
                      const macEntry =
                        device.macs && device.macs.length > 0
                          ? device.macs[0]
                          : null;
                      return (
                        <tr
                          key={device.id}
                          onClick={() => navigate(`/devices/${device.id}`)}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                        >
                          <td className="px-3 py-2 text-center">
                            <span
                              className={`inline-block w-2.5 h-2.5 rounded-full ${device.is_active ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"}`}
                            />
                          </td>
                          <td className="px-3 py-2 font-sans font-medium text-gray-800 dark:text-white">
                            {device.display_name ||
                              device.model_name ||
                              "Nienazwany"}
                          </td>
                          <td className="px-3 py-2 font-sans text-gray-500 dark:text-gray-400">
                            {device.vendor_name ||
                              macEntry?.oui_vendor ||
                              "Nieznany"}
                          </td>
                          <td className="px-3 py-2">
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded text-[10px] font-bold">
                              VLAN {device.vlan_id || "-"}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-sans">
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 rounded text-[10px]">
                              {device.classification || "unassigned"}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {macEntry?.mac || "-"}
                            {macEntry?.is_randomized && (
                              <span className="ml-1 text-[9px] bg-orange-100 text-orange-700 px-1 rounded">
                                RAND
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-sans text-gray-500 text-[11px]">
                            {device.last_seen
                              ? new Date(device.last_seen).toLocaleString()
                              : "-"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-gray-50 border-t border-gray-200 dark:bg-gray-800 dark:border-gray-700 flex items-center justify-between font-sans text-xs">
              <span className="text-gray-500">
                Łącznie:{" "}
                <strong className="text-gray-700 dark:text-gray-300">
                  {devicesData?.total || 0}
                </strong>{" "}
                urządzeń
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                  className="p-1 border rounded bg-white dark:bg-gray-900 dark:border-gray-700 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2">
                  Strona {page + 1} z {totalPages || 1}
                </span>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                  className="p-1 border rounded bg-white dark:bg-gray-900 dark:border-gray-700 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
