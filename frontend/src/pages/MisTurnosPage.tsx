import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api";
import { Header } from "./HomePage";
import { useAuth } from "../auth";
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
    <div className="min-h-screen bg-black">
      <Header user="" onLogout={logout} />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <h2 className="text-xl font-bold tracking-tight text-white">Mis turnos</h2>

        {isLoading && <p className="text-neutral-500">Cargando…</p>}

        {/* Próximo turno: caja destacada, distinta a los items de lista */}
        {!isLoading && (
          <section className="border-2 border-white bg-neutral-950 p-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">Turno reservado más cercano:</h3>
            {proximo ? (
              <div>
                <p className="text-2xl font-bold leading-tight tracking-tight text-white">{nombreLargo(proximo.evento.nombre)}</p>
                <p className="mt-1 text-sm capitalize text-neutral-400">{fechaStr(proximo.fecha!)}</p>
              </div>
            ) : (
              <p className="text-sm text-neutral-500">No tenés turnos reservados.</p>
            )}
          </section>
        )}

        {/* Siguientes turnos */}
        {!isLoading && siguientes.length > 0 && (
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">Próximos turnos reservados</h3>
            <div className="border-y border-white/25">
              {siguientes.map((t, i) => (
                <MiTurnoRow key={t.registrationId} t={t} index={i} total={siguientes.length} />
              ))}
            </div>
          </section>
        )}

        {/* Historial */}
        {!isLoading && historial.length > 0 && (
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">Historial</h3>
            <div className="border-y border-white/25">
              {historial.map((t, i) => (
                <MiTurnoRow key={t.registrationId} t={t} index={i} total={historial.length} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

const estadoColor: Record<string, string> = {
  open: "text-emerald-400",
  done: "text-neutral-500",
  cancel: "text-red-400",
};

const estadoLabel: Record<string, string> = {
  open: "Reservado",
  done: "Realizado",
  cancel: "Cancelado",
};

function MiTurnoRow({ t, index, total }: { t: MiTurno & { fecha: Date }; index: number; total: number }) {
  const indexLabel = String(index + 1).padStart(2, "0");
  const totalLabel = String(total).padStart(2, "0");

  return (
    <div className="group grid grid-cols-[auto_1fr_auto] items-center gap-x-3 border-t border-white/15 px-3 py-4 transition-colors first:border-t-0 sm:gap-x-4">
      <span className="min-w-[3.5ch] self-start text-xs font-bold tracking-wide text-neutral-500">
        {indexLabel}
        <span className="opacity-60">/{totalLabel}</span>
      </span>

      <div className="min-w-0">
        <p className="break-words text-lg font-bold leading-tight tracking-tight text-white sm:text-xl">
          {nombreLargo(t.evento.nombre)}
        </p>
        <p className="mt-1 text-xs capitalize text-neutral-500">{fechaStr(t.fecha)}</p>
      </div>

      <span className={`self-start text-xs font-semibold uppercase tracking-wider ${estadoColor[t.estado] ?? "text-neutral-500"}`}>
        {estadoLabel[t.estado] ?? t.estado}
      </span>
    </div>
  );
}
