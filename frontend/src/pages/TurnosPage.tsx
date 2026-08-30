import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DayPicker } from "react-day-picker";
import { es } from "date-fns/locale";
import { apiClient } from "../api";
import { Header } from "./HomePage";
import { useAuth } from "../auth";
import { useTheme } from "../theme";
import type { Turno, Sede } from "../types";

export function TurnosPage() {
  const { logout } = useAuth();
  const { theme, toggle } = useTheme();
  const qc = useQueryClient();
  const [sede, setSede] = useState<"todas" | Sede>("todas");
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | undefined>(new Date());
  const [turnoAReservar, setTurnoAReservar] = useState<Turno | null>(null);
  const [reservando, setReservando] = useState(false);
  const [reservaError, setReservaError] = useState("");
  const [reservaOk, setReservaOk] = useState(false);
  const { favs, toggle: toggleFavorito } = useFavoritos();
  const [soloFavoritos, setSoloFavoritos] = useState(false);

  const hoy = new Date();
  const desde = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-01`;
  const hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 2, 0);
  const hastaStr = `${hasta.getFullYear()}-${String(hasta.getMonth() + 1).padStart(2, "0")}-${String(hasta.getDate()).padStart(2, "0")}`;

  const { data, isLoading } = useQuery({
    queryKey: ["turnos", desde, hastaStr],
    queryFn: () => apiClient.turnos(desde, hastaStr),
  });

  const turnos = useMemo(() => {
    let all = data?.data ?? [];
    if (sede !== "todas") all = all.filter((t) => t.nombre.toLowerCase().includes(sede));
    if (soloFavoritos) all = all.filter((t) => favs.has(claveFavorito(t.nombre)));
    return all;
  }, [data, sede, soloFavoritos, favs]);

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header user="" onLogout={logout} theme={theme} onToggleTheme={toggle} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold dark:text-white">Turnos disponibles</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoloFavoritos((v) => !v)}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                soloFavoritos
                  ? "border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-300"
                  : "border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              {soloFavoritos ? "★ Favoritos" : "☆ Favoritos"}
            </button>
            <select
              value={sede}
              onChange={(e) => setSede(e.target.value as "todas" | Sede)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-base sm:text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="todas">Todas las sedes</option>
              <option value="bucarelli">Bucarelli</option>
              <option value="centro">Centro</option>
            </select>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Calendario */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 dark:text-white">
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
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">
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
                <TurnoBox
                  key={t.id}
                  turno={t}
                  esFavorito={favs.has(claveFavorito(t.nombre))}
                  onToggleFavorito={() => toggleFavorito(t.nombre)}
                  onReservar={() => { setReservaOk(false); setReservaError(""); setTurnoAReservar(t); }}
                />
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Modal de confirmación */}
      {turnoAReservar && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 dark:bg-slate-900 dark:text-white">
            {reservaOk ? (
              <p className="text-center text-lg font-medium text-emerald-600">¡Reserva confirmada!</p>
            ) : (
              <>
                <h3 className="mb-2 text-lg font-semibold">¿Reservar?</h3>
                <p className="mb-1 text-sm text-slate-700 dark:text-slate-300">{turnoAReservar.nombre}</p>
                <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
                  {turnoAReservar.inicio.slice(11, 16)} hs · {turnoAReservar.cuposLibres} cupos libres
                </p>
                {reservaError && <p className="mb-3 text-sm text-red-600">{reservaError}</p>}
                <div className="flex gap-3">
                  <button
                    onClick={() => setTurnoAReservar(null)}
                    className="flex-1 rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                  >Cancelar</button>
                  <button
                    onClick={confirmarReserva}
                    disabled={reservando}
                    className="flex-1 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
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
  green: "border-l-emerald-500 dark:border-l-emerald-400",
  orange: "border-l-amber-500 dark:border-l-amber-400",
  red: "border-l-red-500 dark:border-l-red-400",
};

// ── Favoritos (localStorage, identificados por nombre sin fecha) ──

function claveFavorito(nombre: string): string {
  return nombre.split(" (")[0];
}

function useFavoritos() {
  const [favs, setFavs] = useState<Set<string>>(() => {
    const raw = localStorage.getItem("favoritos");
    return new Set(raw ? JSON.parse(raw) : []);
  });

  const toggle = (nombre: string) => {
    const clave = claveFavorito(nombre);
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(clave)) next.delete(clave);
      else next.add(clave);
      localStorage.setItem("favoritos", JSON.stringify([...next]));
      return next;
    });
  };

  return { favs, toggle };
}

function TurnoBox({ turno, onReservar, esFavorito, onToggleFavorito }: { turno: Turno; onReservar: () => void; esFavorito: boolean; onToggleFavorito: () => void }) {
  return (
    <div
      className={`w-full rounded-md border border-l-4 p-3 ${nivelColor[turno.nivel]} ${
        esFavorito
          ? "border-amber-400 ring-1 ring-amber-400 dark:border-amber-500 dark:ring-amber-500 bg-amber-50 dark:bg-amber-950/30"
          : "border-slate-200 dark:border-slate-700"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium dark:text-white">{turno.nombre}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">{turno.inicio.slice(11, 16)} hs</span>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorito(); }}
            className="text-base leading-none transition-transform hover:scale-125"
            title={esFavorito ? "Quitar de favoritos" : "Marcar como favorito"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={esFavorito ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className={esFavorito ? "text-amber-500" : "text-slate-400 dark:text-slate-500"}>
              <path d="M12 21s-7-4.5-9.5-9C1 9 2.5 5 6.5 5c2 0 3.5 1 5.5 3 2-2 3.5-3 5.5-3 4 0 5.5 4 4 7-2.5 4.5-9.5 9-9.5 9z" />
            </svg>
          </button>
        </div>
      </div>
      <button
        onClick={onReservar}
        disabled={turno.cuposLibres <= 0}
        className="mt-1 w-full text-left disabled:opacity-50"
      >
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {turno.cuposLibres}/{turno.cuposMax} libres · {turno.sede}
        </p>
      </button>
    </div>
  );
}
