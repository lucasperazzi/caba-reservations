import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, AuthError } from "./api";
import type { UserInfo } from "./types";

interface AuthCtx {
  user: UserInfo | null;
  isLoading: boolean;
  login: (user: string, password: string) => Promise<void>;
  signup: (name: string, lastname: string, login: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();

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
    const u = await apiClient.login(user, password);
    qc.setQueryData(["me"], u);
  };

  const signup = async (name: string, lastname: string, login: string, password: string) => {
    const u = await apiClient.signup(name, lastname, login, password);
    qc.setQueryData(["me"], u);
  };

  const logout = async () => {
    await apiClient.logout();
    qc.setQueryData(["me"], null);
    qc.clear();
  };

  return (
    <Ctx.Provider value={{ user: user ?? null, isLoading, login, signup, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
