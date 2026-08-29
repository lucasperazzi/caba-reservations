import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DayPicker } from "react-day-picker";
import { es } from "date-fns/locale";
import { apiClient } from "../api";
import { Header } from "./HomePage";
import { useAuth } from "../auth";
import type { Turno, Sede } from "../types";

export function TurnosPage() {
  const { logout } = useAuth();
  const qc = useQueryClient();
  const [sede, setSede] = useState<"todas" | Sede>("todas");
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | undefined>(new Date());
  const [turnoAReservar, setTurnoAReservar] = useState<Turno | null>(null);
  const [reservando, setReservando] = useState(false);
  const [reservaError, setReservaError] = useState("");
  const [reservaOk, setReservaOk] = useState(false);

  const hoy = new Date();
  const desde = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-01`;
  const hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 2, 0);
  const hastaStr = `${hasta.getFullYear()}-${String(hasta.getMonth() + 1).padStart(2, "0")}-${String(hasta.getDate()).padStart(2, "0")}`;

  const { data, isLoading } = useQuery({
    queryKey: ["turnos", desde, hastaStr, sede],
    queryFn: () => apiClient.turnos(desde, hastaStr, sede === "todas" ? undefined : sede),
  });

  const turnos = data?.data ?? [];

  // Agrupar por día
  const turnosPorDia = useMemo(() => {
    const map = new Map<string, Turno[]>();
    for (const t of turnos) {
      const dia = t.inicio.slice(0, 10);
      if (!map.has(dia)) map.set(dia, []);
      map.get(dia)!.push(t);
    }
    return map;
  }, [turnos]);

  const diaKey = diaSeleccionado
    ? `${diaSeleccionado.getFullYear()}-${String(diaSeleccionado.getMonth() + 1).padStart(2, "0")}-${String(diaSeleccionado.getDate()).padStart(2, "0")}`
    : "";
  const turnosDelDia = turnosPorDia.get(diaKey) ?? [];

  const confirmarReserva = async () => {
    if (!turnoAReservar) return;
    setReservando(true);
    setReservaError("");
    setReservaOk(false);
    try {
      await apiClient.reservar(turnoAReservar.id);
      setReservaOk(true);
      qc.invalidateQueries({ queryKey: ["turnos"] });
      qc.invalidateQueries({ queryKey: ["mis-turnos"] });
      setTimeout(() => setTurnoAReservar(null), 1500);
    } catch (err) {
      setReservaError(err instanceof Error ? err.message : "Error al reservar");
    } finally {
      setReservando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header user="" onLogout={logout} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Turnos disponibles</h2>
          <select
            value={sede}
            onChange={(e) => setSede(e.target.value as "todas" | Sede)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="todas">Todas las sedes</option>
            <option value="bucarelli">Bucarelli</option>
            <option value="centro">Centro</option>
          </select>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Calendario */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <DayPicker
              mode="single"
              selected={diaSeleccionado}
              onSelect={setDiaSeleccionado}
              locale={es}
              disabled={[{ before: hoy }, { after: hasta }]}
              weekStartsOn={1}
            />
          </div>

          {/* Lista de turnos del día */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-medium text-slate-700">
              {diaSeleccionado
                ? diaSeleccionado.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })
                : "Seleccioná un día"}
            </h3>
            {isLoading && <p className="text-sm text-slate-400">Cargando…</p>}
            {!isLoading && turnosDelDia.length === 0 && (
              <p className="text-sm text-slate-400">No hay turnos para este día.</p>
            )}
            <div className="space-y-2">
              {turnosDelDia.map((t) => (
                <TurnoBox key={t.id} turno={t} onReservar={() => { setReservaOk(false); setReservaError(""); setTurnoAReservar(t); }} />
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Modal de confirmación */}
      {turnoAReservar && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6">
            {reservaOk ? (
              <p className="text-center text-lg font-medium text-emerald-600">¡Reserva confirmada!</p>
            ) : (
              <>
                <h3 className="mb-2 text-lg font-semibold">Confirmar reserva</h3>
                <p className="mb-1 text-sm text-slate-700">{turnoAReservar.nombre}</p>
                <p className="mb-4 text-xs text-slate-500">
                  {turnoAReservar.inicio.slice(11, 16)} hs · {turnoAReservar.cuposLibres} cupos libres
                </p>
                {reservaError && <p className="mb-3 text-sm text-red-600">{reservaError}</p>}
                <div className="flex gap-3">
                  <button
                    onClick={() => setTurnoAReservar(null)}
                    className="flex-1 rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
                  >Cancelar</button>
                  <button
                    onClick={confirmarReserva}
                    disabled={reservando}
                    className="flex-1 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  >{reservando ? "Reservando…" : "Confirmar"}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const nivelColor: Record<string, string> = {
  green: "border-l-emerald-500",
  orange: "border-l-amber-500",
  red: "border-l-red-500",
};

function TurnoBox({ turno, onReservar }: { turno: Turno; onReservar: () => void }) {
  return (
    <button
      onClick={onReservar}
      disabled={turno.cuposLibres <= 0}
      className={`w-full rounded-md border border-slate-200 border-l-4 ${nivelColor[turno.nivel]} p-3 text-left hover:bg-slate-50 disabled:opacity-50`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{turno.nombre}</span>
        <span className="text-xs text-slate-500">{turno.inicio.slice(11, 16)} hs</span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {turno.cuposLibres}/{turno.cuposMax} libres · {turno.sede}
      </p>
    </button>
  );
}
