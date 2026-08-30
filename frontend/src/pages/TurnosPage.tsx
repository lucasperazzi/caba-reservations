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
    <div className="min-h-screen">
      <Header user="" onLogout={logout} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Turnos disponibles</h2>
            <p className="mt-1 text-sm text-neutral-500">Clickeá sobre un evento para reservarlo.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto">
            <button
              onClick={() => setSoloFavoritos((v) => !v)}
              className={`h-10 border px-3 text-sm ${
                soloFavoritos
                  ? "border-white bg-white text-black"
                  : "border-white/20 text-neutral-400 hover:border-white hover:text-white"
              }`}
            >
              {soloFavoritos ? "★ Favoritos" : "☆ Favoritos"}
            </button>
            <select
              value={sede}
              onChange={(e) => setSede(e.target.value as "todas" | Sede)}
              className="h-10 border border-white/20 bg-black px-3 text-base text-white sm:text-sm"
            >
              <option value="todas">Todas las sedes</option>
              <option value="bucarelli">Bucarelli</option>
              <option value="centro">Centro</option>
            </select>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Calendario */}
          <div className="flex justify-center overflow-x-auto border border-white/20 bg-neutral-950 p-4 text-white">
            <DayPicker
              mode="single"
              selected={diaSeleccionado}
              onSelect={setDiaSeleccionado}
              locale={es}
              disabled={[{ before: hoy }, { after: hasta }]}
              weekStartsOn={1}
              style={{
                "--rdp-accent-color": "#fff",
                "--rdp-accent-background-color": "#262626",
                "--rdp-today-color": "#fff",
                "--rdp-day_button-border-radius": "0px",
                "--rdp-day-width": "2.25rem",
                "--rdp-day-height": "2.25rem",
                "--rdp-day_button-width": "2rem",
                "--rdp-day_button-height": "2rem",
                "--rdp-selected-border": "none",
              } as React.CSSProperties}
            />
          </div>

          {/* Lista de turnos del día */}
          <div className="border border-white/20 bg-neutral-950 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
              {diaSeleccionado
                ? diaSeleccionado.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })
                : "Seleccioná un día"}
            </h3>
            {isLoading && <p className="text-sm text-neutral-500">Cargando…</p>}
            {!isLoading && turnosDelDia.length === 0 && (
              <p className="text-sm text-neutral-500">No hay turnos para este día.</p>
            )}
            {turnosDelDia.length > 0 && (
              <div className="border-y border-white/25">
                {turnosDelDia.map((t, i) => (
                  <TurnoRow
                    key={t.id}
                    turno={t}
                    index={i}
                    total={turnosDelDia.length}
                    esFavorito={favs.has(claveFavorito(t.nombre))}
                    onToggleFavorito={() => toggleFavorito(t.nombre)}
                    onReservar={() => { setReservaOk(false); setReservaError(""); setTurnoAReservar(t); }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal de confirmación */}
      {turnoAReservar && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm border border-white/20 bg-neutral-950 p-6 text-white">
            {reservaOk ? (
              <p className="text-center text-lg font-bold text-white">¡Reserva confirmada!</p>
            ) : (
              <>
                <h3 className="mb-2 text-lg font-bold tracking-tight">¿Reservar?</h3>
                <p className="mb-1 text-sm text-neutral-300">{turnoAReservar.nombre}</p>
                <p className="mb-4 text-xs text-neutral-500">
                  {turnoAReservar.inicio.slice(11, 16)}–{turnoAReservar.fin.slice(11, 16)} hs · {turnoAReservar.cuposLibres} cupos libres
                </p>
                {reservaError && <p className="mb-3 text-sm text-red-400">{reservaError}</p>}
                <div className="flex gap-3">
                  <button
                    onClick={() => setTurnoAReservar(null)}
                    className="flex-1 border border-white/20 px-4 py-2 text-sm hover:border-white"
                  >Cancelar</button>
                  <button
                    onClick={confirmarReserva}
                    disabled={reservando}
                    className="flex-1 bg-white px-4 py-2 text-sm font-bold uppercase tracking-wider text-black hover:bg-neutral-300 disabled:opacity-50"
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

/**
 * Color progresivo según cupos libres: arranca verde con cupos llenos y va
 * virando (verde → amarillo → naranja → rojo) a medida que se ocupan,
 * de forma continua en vez de saltar entre 2-3 colores fijos.
 */
function cupoColor(libres: number, max: number): string {
  const ratio = max > 0 ? Math.max(0, Math.min(1, libres / max)) : 0;
  const hue = ratio * 130; // 130 = verde, 0 = rojo
  return `hsl(${hue}, 80%, 55%)`;
}

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

function TurnoRow({
  turno,
  index,
  total,
  onReservar,
  esFavorito,
  onToggleFavorito,
}: {
  turno: Turno;
  index: number;
  total: number;
  onReservar: () => void;
  esFavorito: boolean;
  onToggleFavorito: () => void;
}) {
  const disabled = turno.cuposLibres <= 0;
  const indexLabel = String(index + 1).padStart(2, "0");
  const totalLabel = String(total).padStart(2, "0");

  const stateClasses = disabled
    ? "cursor-not-allowed opacity-40"
    : esFavorito
      ? "cursor-pointer ring-1 ring-inset ring-amber-400/70 bg-amber-400/5 hover:bg-amber-400 hover:ring-amber-400"
      : "cursor-pointer hover:bg-white";

  return (
    <div
      onClick={disabled ? undefined : onReservar}
      className={`group grid grid-cols-[auto_1fr_auto] items-center gap-x-3 border-t border-white/15 px-3 py-4 transition-colors first:border-t-0 sm:gap-x-4 ${stateClasses}`}
    >
      <span className="min-w-[3.5ch] self-start text-xs font-bold tracking-wide text-neutral-500 group-hover:text-black/60">
        {indexLabel}
        <span className="opacity-60">/{totalLabel}</span>
      </span>

      <div className="min-w-0">
        <p className="break-words text-lg font-bold leading-tight tracking-tight text-white group-hover:text-black sm:text-xl">
          {turno.nombre}
        </p>
        <p className="mt-1 text-xs text-neutral-500 group-hover:text-black/70">
          {turno.inicio.slice(11, 16)}–{turno.fin.slice(11, 16)} hs ·{" "}
          <span style={{ color: cupoColor(turno.cuposLibres, turno.cuposMax) }} className="font-semibold">
            {turno.cuposLibres}/{turno.cuposMax} libres
          </span>{" "}
          · {turno.sede}
        </p>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onToggleFavorito(); }}
        className="self-start p-1 leading-none transition-transform hover:scale-125"
        title={esFavorito ? "Quitar de favoritos" : "Marcar como favorito"}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill={esFavorito ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className={esFavorito ? "text-amber-400 group-hover:text-black" : "text-neutral-500 group-hover:text-black/60"}>
          <path d="M12 21s-7-4.5-9.5-9C1 9 2.5 5 6.5 5c2 0 3.5 1 5.5 3 2-2 3.5-3 5.5-3 4 0 5.5 4 4 7-2.5 4.5-9.5 9-9.5 9z" />
        </svg>
      </button>
    </div>
  );
}
