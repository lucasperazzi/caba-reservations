import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
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
  const { user, logout } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["paquetes"], queryFn: apiClient.paquetes });

  const activos = data?.data.activos ?? [];
  const historial = data?.data.historial ?? [];

  return (
    <div className="min-h-screen">
      <Header user={user?.name ?? ""} userEmail={user?.email} onLogout={logout} />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Mis paquetes</h2>

        {isLoading && <p className="text-neutral-400">Cargando…</p>}

        {!isLoading && activos.length === 0 && historial.length === 0 && (
          <div>
            <p className="text-sm text-neutral-400">No tenés paquetes de acceso.</p>
            <Link to="/turnos" className="mt-3 inline-block text-sm font-semibold text-emerald-400 hover:text-emerald-300">
              Reservar un turno →
            </Link>
          </div>
        )}

        {/* Paquetes activos */}
        {!isLoading && activos.length > 0 && (
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Activos
            </h3>
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
  completed: "text-neutral-400",
  cancelled: "text-red-400",
  draft: "text-neutral-400",
  expired: "text-amber-400",
};

const estadoDot: Record<string, string> = {
  active: "bg-emerald-400",
  completed: "bg-neutral-400",
  cancelled: "bg-red-400",
  draft: "bg-neutral-400",
  expired: "bg-amber-400",
};

function PaqueteRow({ p, index, total, activo }: { p: Paquete; index: number; total: number; activo?: boolean }) {
  const indexLabel = String(index + 1).padStart(2, "0");
  const totalLabel = String(total).padStart(2, "0");
  const usados = p.creditosTotales - p.creditosDisponibles;
  const pct = p.creditosTotales > 0 ? (p.creditosDisponibles / p.creditosTotales) * 100 : 0;

  return (
    <div className={`group grid grid-cols-[auto_1fr_auto] items-center gap-x-3 border-t px-3 py-4 transition-colors first:border-t-0 sm:gap-x-4 ${activo ? "border-emerald-400/20" : "border-white/15"}`}>
      <span className="min-w-[3.5ch] self-start text-xs font-bold tracking-wide text-neutral-500">
        {indexLabel}
        <span className="opacity-60">/{totalLabel}</span>
      </span>

      <div className="min-w-0">
        <p className="break-words text-lg font-bold leading-tight tracking-tight text-white sm:text-xl">
          {p.descripcion}
        </p>
        <p className="mt-1 text-xs text-neutral-400">
          {fechaCorta(p.fechaInicio)} → {fechaCorta(p.fechaFin)} · {p.reservas} {p.reservas === 1 ? "reserva" : "reservas"}
        </p>
        {activo && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-300">
                {p.creditosDisponibles}/{p.creditosTotales} disponibles
              </span>
              {usados > 0 && <span className="text-neutral-500">{usados} usado{usados !== 1 ? "s" : ""}</span>}
            </div>
            <div className="mt-1 h-1.5 w-full bg-white/10">
              <div className="h-full bg-emerald-400 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
        {!activo && (
          <p className="mt-0.5 text-xs text-neutral-500">
            {p.creditosDisponibles}/{p.creditosTotales} créditos sin usar
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 self-start">
        <span className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${estadoColor[p.estado] ?? "text-neutral-400"}`}>
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${estadoDot[p.estado] ?? "bg-neutral-400"}`} />
          {p.estadoLabel}
        </span>
      </div>
    </div>
  );
}
