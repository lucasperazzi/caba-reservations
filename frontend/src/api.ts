import type { UserInfo, Turno, MiTurno, PaquetesData, Profile, Country, State } from "./types";

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: "include", ...options });
  if (res.status === 401) throw new AuthError("No autenticado");
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "Error desconocido" }));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export class AuthError extends Error {}

export const apiClient = {
  login: (user: string, password: string) =>
    api<UserInfo>("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, password }),
    }),
  signup: (name: string, lastname: string, login: string, password: string) =>
    api<UserInfo>("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, lastname, login, password }),
    }),
  authFeatures: () => api<{ google: boolean; signup: boolean }>("/api/auth/features"),
  logout: () => api<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  me: () => api<UserInfo>("/api/me"),
  turnos: (from: string, to: string, sede?: string) =>
    api<{ data: Turno[] }>(`/api/turnos?from=${from}&to=${to}${sede ? `&sede=${sede}` : ""}`),
  misTurnos: () => api<{ data: MiTurno[] }>("/api/turnos/mios"),
  reservar: (eventId: number) =>
    api<{ ok: boolean }>(`/api/turnos/${eventId}/reservar`, { method: "POST" }),
  paquetes: () => api<{ data: PaquetesData }>("/api/paquetes"),
  profile: () => api<Profile>("/api/me/profile"),
  updateProfile: (data: Partial<Profile>) =>
    api<{ ok: boolean }>("/api/me/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  countries: () => api<{ data: Country[] }>("/api/me/countries"),
  states: (countryId: number) => api<{ data: State[] }>(`/api/me/states?country_id=${countryId}`),
};
