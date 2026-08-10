import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Menu,
  Moon,
  Sun,
  LogOut,
  Monitor,
  LogOut as SignOut,
  RefreshCw,
} from "lucide-react";
import { api } from "../api/client";
import Sidebar from "../components/Sidebar";
import type { definitions } from "../api/types";

type Session = definitions["Session"];
type ListResponseSession =
  definitions["ListResponse-security-hub_internal_dto_Session"];

function shortAgent(userAgent?: string): string {
  if (!userAgent) return "nieznany klient";
  const browser =
    /Firefox\/[\d.]+/.exec(userAgent)?.[0] ||
    /Edg\/[\d.]+/.exec(userAgent)?.[0] ||
    /Chrome\/[\d.]+/.exec(userAgent)?.[0] ||
    /Safari\/[\d.]+/.exec(userAgent)?.[0] ||
    userAgent.slice(0, 40);
  const system = /Windows|Macintosh|Linux|Android|iPhone|iPad/.exec(
    userAgent,
  )?.[0];
  return system ? `${browser} · ${system}` : browser;
}

export default function Sessions() {
  const queryClient = useQueryClient();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const res = await api.get<ListResponseSession>("/sessions");
      return res.data;
    },
  });

  const revoke = useMutation({
    mutationFn: async (sessionId: string) => {
      await api.delete(`/sessions/${sessionId}`);
      return sessionId;
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (err: unknown) => {
      const e = err as {
        response?: { status?: number; data?: { error?: { message?: string } } };
      };
      setError(
        e?.response?.status === 404
          ? "Nie znaleziono sesji albo nie masz do niej dostępu."
          : e?.response?.data?.error?.message || "Nie udało się zamknąć sesji.",
      );
    },
  });

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark", !isDarkMode);
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // wylogowanie lokalne i tak musi dojść do skutku
    }
    localStorage.removeItem("csrf_token");
    window.location.href = "/login";
  };

  const sessions: Session[] = (data?.data ?? []).filter((s) => !s.revoked_at);

  return (
    <div className="min-h-screen bg-gray-100 flex transition-colors duration-200 dark:bg-gray-950 font-sans relative">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 z-10">
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center">
            <button
              className="lg:hidden p-2 -ml-2 mr-3 text-gray-600 hover:bg-gray-100 rounded-lg dark:text-gray-400 dark:hover:bg-gray-800"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-800 dark:text-white">
              Aktywne sesje
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="rounded p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-800"
              title="Odśwież"
            >
              <RefreshCw
                className={`h-5 w-5 ${isFetching ? "animate-spin" : ""}`}
              />
            </button>
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

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <p className="mb-4 max-w-2xl text-xs text-gray-500 dark:text-gray-400">
            Miejsca, z których ktoś jest zalogowany do panelu. Zamknięcie sesji
            wylogowuje ją natychmiast — przydatne, gdy zostawiłeś otwartą
            przeglądarkę na cudzym komputerze.
          </p>

          {error && (
            <p className="mb-4 rounded bg-red-100 px-3 py-2 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            {isLoading ? (
              <p className="p-8 text-center text-sm text-gray-500">
                Pobieram sesje...
              </p>
            ) : sessions.length === 0 ? (
              <p className="p-8 text-center text-sm text-gray-500">
                Brak aktywnych sesji.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {sessions.map((session) => (
                  <li
                    key={session.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-4"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <Monitor className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white">
                          {shortAgent(session.user_agent)}
                          {session.is_current && (
                            <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                              ta przeglądarka
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-gray-500 dark:text-gray-400">
                          {session.ip_address || "brak adresu"} · zalogowano{" "}
                          {session.created_at
                            ? new Date(session.created_at).toLocaleString()
                            : "-"}
                        </p>
                        <p className="font-mono text-[11px] text-gray-400">
                          ostatnia aktywność{" "}
                          {session.last_active_at
                            ? new Date(session.last_active_at).toLocaleString()
                            : "-"}
                          {session.expires_at
                            ? ` · wygasa ${new Date(session.expires_at).toLocaleString()}`
                            : ""}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const question = session.is_current
                          ? "Zamknąć bieżącą sesję? Zostaniesz wylogowany."
                          : "Zamknąć tę sesję? Zalogowana osoba straci dostęp natychmiast.";
                        if (window.confirm(question)) {
                          revoke.mutate(session.id as string);
                        }
                      }}
                      disabled={revoke.isPending}
                      className="flex items-center gap-1.5 rounded bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-40 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                    >
                      <SignOut className="h-3.5 w-3.5" /> Zamknij
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
