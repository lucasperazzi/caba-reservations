import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api";
import { Header } from "./HomePage";
import { useAuth } from "../auth";
import type { Paquete } from "../types";

function fechaCorta(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00-03:00" : "Z"));
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

export function PaquetesPage() {
  const { logout } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["paquetes"], queryFn: apiClient.paquetes });

  const activos = data?.data.activos ?? [];
  const historial = data?.data.historial ?? [];

  return (
    <div className="min-h-screen">
      <Header user="" onLogout={logout} />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <h2 className="text-xl font-bold tracking-tight text-white">Mis paquetes</h2>

        {isLoading && <p className="text-neutral-500">Cargando…</p>}

        {!isLoading && activos.length === 0 && historial.length === 0 && (
          <p className="text-sm text-neutral-500">No tenés paquetes de acceso.</p>
        )}

        {/* Paquetes activos */}
        {!isLoading && activos.length > 0 && (
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">Activos</h3>
            <div className="border-y border-white/25">
              {activos.map((p, i) => (
                <PaqueteRow key={p.id} p={p} index={i} total={activos.length} activo />
              ))}
            </div>
          </section>
        )}

        {/* Historial */}
        {!isLoading && historial.length > 0 && (
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">Historial</h3>
            <div className="border-y border-white/25">
              {historial.map((p, i) => (
                <PaqueteRow key={p.id} p={p} index={i} total={historial.length} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

const estadoColor: Record<string, string> = {
  active: "text-emerald-400",
  completed: "text-neutral-500",
  cancelled: "text-red-400",
  draft: "text-neutral-500",
  expired: "text-amber-400",
};

function PaqueteRow({ p, index, total, activo }: { p: Paquete; index: number; total: number; activo?: boolean }) {
  const indexLabel = String(index + 1).padStart(2, "0");
  const totalLabel = String(total).padStart(2, "0");
  const usados = p.creditosTotales - p.creditosDisponibles;

  return (
    <div className="group grid grid-cols-[auto_1fr_auto] items-center gap-x-3 border-t border-white/15 px-3 py-4 transition-colors first:border-t-0 sm:gap-x-4">
      <span className="min-w-[3.5ch] self-start text-xs font-bold tracking-wide text-neutral-500">
        {indexLabel}
        <span className="opacity-60">/{totalLabel}</span>
      </span>

      <div className="min-w-0">
        <p className="break-words text-lg font-bold leading-tight tracking-tight text-white sm:text-xl">
          {p.descripcion}
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          {fechaCorta(p.fechaInicio)} → {fechaCorta(p.fechaFin)} · {p.reservas} {p.reservas === 1 ? "reserva" : "reservas"}
        </p>
        {activo && (
          <p className="mt-0.5 text-xs font-semibold text-neutral-300">
            {p.creditosDisponibles}/{p.creditosTotales} créditos disponibles
            {usados > 0 && <span className="text-neutral-500"> · {usados} usado{usados !== 1 ? "s" : ""}</span>}
          </p>
        )}
        {!activo && (
          <p className="mt-0.5 text-xs text-neutral-500">
            {p.creditosDisponibles}/{p.creditosTotales} créditos sin usar
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 self-start">
        <span className={`text-xs font-semibold uppercase tracking-wider ${estadoColor[p.estado] ?? "text-neutral-500"}`}>
          {p.estadoLabel}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-600">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </div>
  );
}
