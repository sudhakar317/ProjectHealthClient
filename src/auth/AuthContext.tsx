import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { getMe, logout as apiLogout, type Me } from "@/api/auth";
import { setUnauthorizedHandler } from "@/api/client";

interface AuthState {
  user: Me | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const ME_KEY = ["me"];
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ME_KEY, queryFn: getMe, retry: false, staleTime: 30_000, refetchOnWindowFocus: true });

  useEffect(() => {
    setUnauthorizedHandler(() => queryClient.setQueryData(ME_KEY, null));
    return () => setUnauthorizedHandler(null);
  }, [queryClient]);

  const logout = async () => {
    await apiLogout();
    queryClient.setQueryData(ME_KEY, null);
  };

  return (
    <AuthContext.Provider value={{ user: data ?? null, loading: isLoading, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
