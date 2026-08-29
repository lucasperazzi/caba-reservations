import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api";
import { Header } from "./HomePage";
import { useAuth } from "../auth";

export function MisTurnosPage() {
  const { logout } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["mis-turnos"], queryFn: apiClient.misTurnos });

  const turnos = (data?.data ?? [])
    .filter((t) => t.estado === "open")
    .sort((a, b) => b.create_date.localeCompare(a.create_date));

  return (
    <div className="min-h-screen bg-slate-50">
      <Header user="" onLogout={logout} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h2 className="mb-4 text-xl font-bold">Mis turnos reservados</h2>
        {isLoading && <p className="text-slate-500">Cargando…</p>}
        {!isLoading && turnos.length === 0 && (
          <p className="text-slate-400">No hay próximos turnos reservados.</p>
        )}
        <div className="space-y-2">
          {turnos.map((t) => (
            <div key={t.registrationId} className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="font-medium">{t.evento.nombre.split(" (")[0]}</p>
              <p className="text-xs text-slate-500">Reservado el {t.create_date.slice(0, 10)}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
