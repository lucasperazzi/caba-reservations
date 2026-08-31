import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../api";
import { Header } from "./HomePage";
import { useAuth } from "../auth";
import type { MiTurno } from "../types";
import { fechaLarga } from "../utils/fecha";
import { usePageBg } from "../hooks/usePageBg";

function fechaEvento(nombre: string): Date | null {
  const m = nombre.match(/\((\d{4}-\d{2}-\d{2})/);
  return m ? new Date(m[1] + "T00:00:00-03:00") : null;
}

function nombreLargo(nombre: string): string {
  return nombre.split(" (")[0];
}

export function MisTurnosPage() {
  usePageBg("turnos");
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["mis-turnos"], queryFn: apiClient.misTurnos });

  // "Hoy" a medianoche (zona horaria local del navegador), para comparar por
  // día calendario y no descartar turnos de hoy cuya fecha se parsea a 00:00.
  const hoy = new Date();
  const hoyMedianoche = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

  const conFecha = (data?.data ?? [])
    .map((t) => ({ ...t, fecha: fechaEvento(t.evento.nombre) }))
    .filter((t): t is MiTurno & { fecha: Date } => t.fecha !== null);

  const futuros = conFecha
    .filter((t) => t.estado === "open" && t.fecha! >= hoyMedianoche)
    .sort((a, b) => a.fecha!.getTime() - b.fecha!.getTime());

  const proximo = futuros[0];
  const siguientes = futuros.slice(1);

  const repetirProximaSemana = (t: MiTurno & { fecha: Date }) => {
    const baseName = t.evento.nombre.split(" (")[0];
    // Sumar 7 días a la fecha en formato string para evitar issues de zona horaria
    const fecha = t.fecha;
    const target = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + 7);
    const targetStr = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`;
    nav("/turnos", { state: { searchName: baseName, targetDate: targetStr } });
  };

  const historial = conFecha
    .filter((t) => t.estado !== "open" || t.fecha! < hoyMedianoche)
    .sort((a, b) => b.fecha!.getTime() - a.fecha!.getTime());

  return (
    <div className="min-h-screen">
      <Header user={user?.name ?? ""} userEmail={user?.email} onLogout={logout} />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Mis turnos</h2>

        {isLoading && <p className="text-neutral-300">Cargando…</p>}

        {/* Próximo turno: caja destacada, distinta a los items de lista */}
        {!isLoading && (
          <section className={`border-2 bg-neutral-950 p-6 ${proximo ? "border-emerald-400" : "border-white"}`}>
            <h3 className={`mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider ${proximo ? "text-emerald-400" : "text-neutral-200"}`}>
              {proximo && <img src="/holds-png/green-round.png" alt="" className="inline-block h-4 w-4 object-contain" />}
              Turno reservado más cercano:
            </h3>
            {proximo ? (
              <div>
                <p className="text-2xl font-bold leading-tight tracking-tight text-white">{nombreLargo(proximo.evento.nombre)}</p>
                <p className="mt-1 text-sm capitalize text-neutral-300">{fechaLarga(proximo.fecha!)}</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-neutral-300">No tenés turnos reservados.</p>
                <Link to="/turnos" className="mt-3 inline-block text-sm font-semibold text-emerald-400 hover:text-emerald-300">
                  Reservar un turno →
                </Link>
              </div>
            )}
          </section>
        )}

        {/* Siguientes turnos */}
        {!isLoading && siguientes.length > 0 && (
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-200">Próximos turnos reservados</h3>
            <div className="bg-black/40 p-4 backdrop-blur-md">
              {siguientes.map((t, i) => (
                <MiTurnoRow key={t.registrationId} t={t} index={i} total={siguientes.length} onRepetir={() => repetirProximaSemana(t)} />
              ))}
            </div>
          </section>
        )}

        {/* Historial */}
        {!isLoading && historial.length > 0 && (
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-200">Historial</h3>
            <div className="bg-black/40 p-4 backdrop-blur-md">
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
  done: "text-neutral-300",
  cancel: "text-red-400",
};

const estadoHold: Record<string, string> = {
  open: "/holds-png/green-round.png",
  done: "/holds-png/hold-14.png",
  cancel: "/holds-png/red-round.png",
};

const estadoLabel: Record<string, string> = {
  open: "Reservado",
  done: "Realizado",
  cancel: "Cancelado",
};

function MiTurnoRow({ t, index, total, onRepetir }: { t: MiTurno & { fecha: Date }; index: number; total: number; onRepetir?: () => void }) {
  const indexLabel = String(index + 1).padStart(2, "0");
  const totalLabel = String(total).padStart(2, "0");

  return (
    <div className="group grid grid-cols-[auto_1fr_auto] items-center gap-x-3 border-t border-white px-3 py-4 transition-colors first:border-t-0 sm:gap-x-4">
      <span className="min-w-[3.5ch] self-start text-xs font-bold tracking-wide text-neutral-400">
        {indexLabel}
        <span className="opacity-60">/{totalLabel}</span>
      </span>

      <div className="min-w-0">
        <p className="break-words text-lg font-bold leading-tight tracking-tight text-white sm:text-xl">
          {nombreLargo(t.evento.nombre)}
        </p>
        <p className="mt-1 text-xs capitalize text-neutral-300">{fechaLarga(t.fecha)}</p>
        {onRepetir && (
          <button
            onClick={onRepetir}
            className="mt-2 text-xs font-semibold text-emerald-400 transition-colors hover:text-emerald-300"
          >
            Repetir próxima semana →
          </button>
        )}
      </div>

      <span className={`flex items-center gap-1.5 self-start text-xs font-semibold uppercase tracking-wider ${estadoColor[t.estado] ?? "text-neutral-300"}`}>
        <img src={estadoHold[t.estado] ?? "/holds-png/hold-14.png"} alt="" className="h-3.5 w-3.5 object-contain" />
        {estadoLabel[t.estado] ?? t.estado}
      </span>
    </div>
  );
}
