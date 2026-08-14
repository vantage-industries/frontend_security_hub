import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Menu, Moon, Sun, LogOut, Info } from "lucide-react";
import { api } from "../api/client";
import Sidebar from "../components/Sidebar";
import type { definitions } from "../api/types";

type PolicyProfile = definitions["PolicyProfile"];
type PolicyRule = definitions["PolicyRule"];
type ListResponsePolicyProfile =
  definitions["ListResponse-security-hub_internal_dto_PolicyProfile"];
type ListResponsePolicyRule = definitions["ListResponse-PolicyRule"];

export default function Policies() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(
    null,
  );

  const { data: profilesData, isLoading: isProfilesLoading } = useQuery({
    queryKey: ["policy-profiles"],
    queryFn: async () => {
      const res = await api.get<ListResponsePolicyProfile>("/policy-profiles");
      if (
        res.data?.data &&
        res.data.data.length > 0 &&
        selectedProfileId === null
      ) {
        setSelectedProfileId(res.data.data[0].id || null);
      }
      return res.data;
    },
  });

  const { data: rulesData, isLoading: isRulesLoading } = useQuery({
    queryKey: ["policy-rules", selectedProfileId],
    queryFn: async () => {
      const res = await api.get<ListResponsePolicyRule>(
        `/policy-profiles/${selectedProfileId}/rules`,
      );
      return res.data;
    },
    enabled: selectedProfileId !== null,
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

  const selectedProfile = profilesData?.data?.find(
    (p) => p.id === selectedProfileId,
  );

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
              Profile Polityk
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
          <div className="max-w-7xl mx-auto">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 flex items-start gap-3 mb-6">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Profile polityk to wbudowane, rygorystyczne szablony reguł
                zapory. Są <strong>tylko do odczytu</strong>. Zmiany zachowania
                sieci wykonuje się przez własne reguły w zakładce Firewall.
              </p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              <div className="w-full lg:w-1/3 space-y-4">
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                    <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                      Dostępne szablony
                    </h2>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {isProfilesLoading ? (
                      <div className="p-8 text-center text-sm text-gray-500">
                        Pobieranie profili...
                      </div>
                    ) : (
                      profilesData?.data?.map((profile: PolicyProfile) => (
                        <button
                          key={profile.id}
                          onClick={() =>
                            setSelectedProfileId(profile.id as number)
                          }
                          className={`w-full text-left p-4 transition-colors flex items-center justify-between ${
                            selectedProfileId === profile.id
                              ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500"
                              : "hover:bg-gray-50 dark:hover:bg-gray-800/50 border-l-4 border-transparent"
                          }`}
                        >
                          <div>
                            <div
                              className={`font-bold ${selectedProfileId === profile.id ? "text-blue-700 dark:text-blue-400" : "text-gray-900 dark:text-white"}`}
                            >
                              {profile.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                              {profile.description}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="w-full lg:w-2/3">
                {selectedProfileId !== null && (
                  <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col h-full">
                    <div className="p-4 bg-gray-50 border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700 flex justify-between items-center">
                      <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200">
                        Reguły profilu:{" "}
                        <span className="text-blue-600 dark:text-blue-400">
                          {selectedProfile?.name}
                        </span>
                      </h2>
                      {selectedProfile?.is_builtin && (
                        <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-[10px] font-bold uppercase tracking-wider">
                          Built-in
                        </span>
                      )}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                        <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                          <tr>
                            <th className="px-4 py-3 w-16">Prio</th>
                            <th className="px-4 py-3">Kierunek / Strefa</th>
                            <th className="px-4 py-3">Protokół / Cel</th>
                            <th className="px-4 py-3">Akcja</th>
                            <th className="px-4 py-3 w-1/3">Komentarz</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {isRulesLoading ? (
                            <tr>
                              <td
                                colSpan={5}
                                className="p-8 text-center text-sm text-gray-500"
                              >
                                Pobieranie reguł profilu...
                              </td>
                            </tr>
                          ) : !rulesData?.data ||
                            rulesData.data.length === 0 ? (
                            <tr>
                              <td
                                colSpan={5}
                                className="p-8 text-center text-sm text-gray-500"
                              >
                                Ten profil nie posiada żadnych reguł.
                              </td>
                            </tr>
                          ) : (
                            rulesData.data.map((rule: PolicyRule) => (
                              <tr
                                key={rule.id}
                                className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                              >
                                <td className="px-4 py-3 font-mono text-xs text-gray-500">
                                  {rule.priority}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 px-2 py-0.5 rounded text-[10px] uppercase font-bold font-sans">
                                    {rule.direction}
                                  </span>
                                  {rule.dst_zone && (
                                    <span className="ml-2 text-xs font-mono text-gray-500">
                                      → {rule.dst_zone}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="font-bold text-blue-600 dark:text-blue-400">
                                    {rule.protocol || "ANY"}
                                  </span>
                                  <span className="mx-1 text-gray-400">:</span>
                                  <span className="font-mono text-xs text-gray-800 dark:text-gray-200">
                                    {rule.dst_port || rule.dst_domain || "ANY"}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-sans ${
                                      rule.action === "drop" ||
                                      rule.action === "reject"
                                        ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                                    }`}
                                  >
                                    {rule.action}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-xs italic text-gray-500 dark:text-gray-400">
                                  {rule.comment || "-"}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
