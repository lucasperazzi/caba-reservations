import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api";
import { Header } from "./HomePage";
import { useAuth } from "../auth";
import type { Paquete } from "../types";
import { diasHastaVencimiento } from "../utils/fecha";
import { usePageBg } from "../hooks/usePageBg";

function fechaCorta(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00-03:00" : "Z"));
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

export function PaquetesPage() {
  usePageBg("paquetes");
  const { user, logout } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["paquetes"], queryFn: apiClient.paquetes });

  const activos = data?.data.activos ?? [];
  const pendientes = data?.data.pendientes ?? [];
  const historial = data?.data.historial ?? [];

  return (
    <div className="min-h-screen">
      <Header user={user?.name ?? ""} userEmail={user?.email} onLogout={logout} />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Mis paquetes</h2>

        {isLoading && <p className="text-neutral-300">Cargando…</p>}

        {!isLoading && activos.length === 0 && pendientes.length === 0 && historial.length === 0 && (
          <p className="text-sm text-neutral-300">No tenés paquetes de acceso.</p>
        )}

        {/* Paquetes activos */}
        {!isLoading && activos.length > 0 && (
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-200">Activos</h3>
            <div className="bg-black/40 p-4 backdrop-blur-md">
              {activos.map((p) => (
                <PaqueteRow key={p.id} p={p} activo />
              ))}
            </div>
          </section>
        )}

        {/* Pendientes de uso — solo si hay */}
        {!isLoading && pendientes.length > 0 && (
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-200">
              Pendientes de uso
            </h3>
            <div className="bg-black/40 p-4 backdrop-blur-md">
              {pendientes.map((p) => (
                <PaqueteRow key={p.id} p={p} />
              ))}
            </div>
          </section>
        )}

        {/* Historial */}
        {!isLoading && historial.length > 0 && (
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-200">Historial</h3>
            <div className="bg-black/40 p-4 backdrop-blur-md">
              {historial.map((p) => (
                <PaqueteRow key={p.id} p={p} />
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
  completed: "text-neutral-300",
  cancelled: "text-red-400",
  draft: "text-neutral-300",
  expired: "text-amber-400",
  pending: "text-sky-400",
};

const estadoHold: Record<string, string> = {
  active: "/holds-png/green-round.png",
  completed: "/holds-png/hold-14.png",
  cancelled: "/holds-png/red-round.png",
  draft: "/holds-png/hold-14.png",
  expired: "/holds-png/hold-03.png",
  pending: "/holds-png/hold-01.png",
};

function PaqueteRow({ p, activo }: { p: Paquete; activo?: boolean }) {
  const usados = p.creditosTotales - p.creditosDisponibles;
  const pct = p.creditosTotales > 0 ? (p.creditosDisponibles / p.creditosTotales) * 100 : 0;

  // Vencimiento cercano: paquete activo, quedan créditos y vence en 7 días o menos
  const diasVenc = activo && p.creditosDisponibles > 0 ? diasHastaVencimiento(p.fechaFin) : null;
  const vencCercano = diasVenc !== null && diasVenc >= 0 && diasVenc <= 7;

  return (
    <div className={`group grid grid-cols-[1fr_auto] items-center gap-x-3 border-t px-3 py-4 transition-colors first:border-t-0 sm:gap-x-4 ${activo ? "border-white" : "border-white"}`}>
      <div className="min-w-0">
        <p className="break-words text-base font-bold leading-tight tracking-tight text-white sm:text-xl">
          {p.descripcion}
        </p>
        <p className="mt-1 text-xs text-neutral-300">
          {fechaCorta(p.fechaInicio)} → {fechaCorta(p.fechaFin)} · {p.reservas} {p.reservas === 1 ? "reserva" : "reservas"}
        </p>
        {activo && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-300">
                {p.creditosDisponibles}/{p.creditosTotales} disponibles
              </span>
              {usados > 0 && <span className="text-neutral-400">{usados} usado{usados !== 1 ? "s" : ""}</span>}
            </div>
            <div className="mt-1 h-1.5 w-full bg-white/10">
              <div className="h-full bg-emerald-400 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
        {vencCercano && (
          <p className="mt-2 text-xs font-semibold text-amber-400">
            Se te está por vencer{diasVenc === 0 ? " hoy" : `, te quedan ${diasVenc} día${diasVenc === 1 ? "" : "s"}`} para usar este paquete
          </p>
        )}
        {!activo && (
          <p className="mt-0.5 text-xs text-neutral-400">
            {p.creditosDisponibles}/{p.creditosTotales} créditos sin usar
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 self-start">
        <span className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider sm:text-xs ${estadoColor[p.estado] ?? "text-neutral-300"}`}>
          <img src={estadoHold[p.estado] ?? "/holds-png/hold-14.png"} alt="" className="h-3 w-3 object-contain sm:h-3.5 sm:w-3.5" />
          {p.estadoLabel}
        </span>
      </div>
    </div>
  );
}
