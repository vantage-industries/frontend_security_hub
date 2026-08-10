import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { definitions } from "../api/types";

type SessionResponse = definitions["SessionResponse"];

export function useSession() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const res = await api.get<SessionResponse>("/auth/session");
      return res.data;
    },
    staleTime: 60000,
    retry: false,
  });

  const permissions = data?.permissions ?? [];
  const role = (data?.role ?? "").toLowerCase();

  return {
    session: data,
    role,
    permissions,
    isLoading,
    isAuthenticated: !isError && !!data,
    can: (permission: string) => permissions.includes(permission),
    canAny: (...list: string[]) =>
      list.some((permission) => permissions.includes(permission)),
  };
}
