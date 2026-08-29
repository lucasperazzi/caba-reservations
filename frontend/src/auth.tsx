import { createContext, useContext, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, AuthError } from "./api";
import type { UserInfo } from "./types";

interface AuthCtx {
  user: UserInfo | null;
  isLoading: boolean;
  login: (user: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [loggingIn, setLoggingIn] = useState(false);

  const { data: user, isLoading } = useQuery<UserInfo | null>({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await apiClient.me();
      } catch (e) {
        if (e instanceof AuthError) return null;
        throw e;
      }
    },
    retry: false,
  });

  const login = async (user: string, password: string) => {
    setLoggingIn(true);
    try {
      const u = await apiClient.login(user, password);
      qc.setQueryData(["me"], u);
    } finally {
      setLoggingIn(false);
    }
  };

  const logout = async () => {
    await apiClient.logout();
    qc.setQueryData(["me"], null);
    qc.clear();
  };

  return (
    <Ctx.Provider value={{ user: user ?? null, isLoading: isLoading || loggingIn, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
