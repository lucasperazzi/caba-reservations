import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api";
import { Header } from "./HomePage";
import { useAuth } from "../auth";
import { useTheme } from "../theme";
import type { MiTurno } from "../types";

function fechaEvento(nombre: string): Date | null {
  const m = nombre.match(/\((\d{4}-\d{2}-\d{2})/);
  return m ? new Date(m[1] + "T00:00:00-03:00") : null;
}

function nombreLargo(nombre: string): string {
  return nombre.split(" (")[0];
}

function fechaStr(d: Date): string {
  return d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
}

export function MisTurnosPage() {
  const { logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { data, isLoading } = useQuery({ queryKey: ["mis-turnos"], queryFn: apiClient.misTurnos });

  const ahora = new Date();

  const conFecha = (data?.data ?? [])
    .map((t) => ({ ...t, fecha: fechaEvento(t.evento.nombre) }))
    .filter((t): t is MiTurno & { fecha: Date } => t.fecha !== null);

  const futuros = conFecha
    .filter((t) => t.estado === "open" && t.fecha! >= ahora)
    .sort((a, b) => a.fecha!.getTime() - b.fecha!.getTime());

  const proximo = futuros[0];
  const siguientes = futuros.slice(1);

  const historial = conFecha
    .filter((t) => t.estado !== "open" || t.fecha! < ahora)
    .sort((a, b) => b.fecha!.getTime() - a.fecha!.getTime());

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header user="" onLogout={logout} theme={theme} onToggleTheme={toggle} />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <h2 className="text-xl font-bold dark:text-white">Mis turnos</h2>

        {isLoading && <p className="text-slate-500 dark:text-slate-400">Cargando…</p>}

        {/* Próximo turno */}
        {!isLoading && (
          <section className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">Próximo turno reservado</h3>
            {proximo ? (
              <div>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{nombreLargo(proximo.evento.nombre)}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">{fechaStr(proximo.fecha!)}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No tenés turnos reservados.</p>
            )}
          </section>
        )}

        {/* Siguientes turnos */}
        {!isLoading && siguientes.length > 0 && (
          <section>
            <h3 className="mb-3 text-sm font-medium text-slate-500 dark:text-slate-400">Próximos turnos reservados</h3>
            <div className="space-y-2">
              {siguientes.map((t) => (
                <TurnoCard key={t.registrationId} t={t} />
              ))}
            </div>
          </section>
        )}

        {/* Historial */}
        {!isLoading && historial.length > 0 && (
          <section>
            <h3 className="mb-3 text-sm font-medium text-slate-500 dark:text-slate-400">Historial</h3>
            <div className="space-y-2">
              {historial.map((t) => (
                <TurnoCard key={t.registrationId} t={t} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function TurnoCard({ t }: { t: MiTurno & { fecha: Date } }) {
  const estadoColor: Record<string, string> = {
    open: "text-emerald-600 dark:text-emerald-400",
    done: "text-slate-400",
    cancel: "text-red-500",
  };
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <p className="font-medium dark:text-white">{nombreLargo(t.evento.nombre)}</p>
        <span className={`text-xs capitalize ${estadoColor[t.estado] ?? "text-slate-400"}`}>{t.estado}</span>
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 capitalize">{fechaStr(t.fecha)}</p>
    </div>
  );
}
