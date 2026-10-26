import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { DayPicker } from "react-day-picker";
import { es } from "date-fns/locale";
import { apiClient } from "../api";
import { Header } from "./HomePage";
import { useAuth } from "../auth";
import type { Turno, Sede } from "../types";
import { fechaLarga } from "../utils/fecha";

export function TurnosPage() {
  const { user, logout } = useAuth();
  // La reserva se habilita por usuario (allowlist en el backend, ver
  // RESERVAS_ALLOWLIST). El backend expone `puedeReservar` en /api/me.
  const reservaHabilitada = user?.puedeReservar ?? false;
  const qc = useQueryClient();
  const location = useLocation();
  const [sede, setSede] = useState<"todas" | Sede>("todas");
  const [tipoFiltro, setTipoFiltro] = useState<"todos" | "libre" | "clases">("todos");
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | undefined>(new Date());
  const [mesCalendario, setMesCalendario] = useState<Date>(new Date());
  const [fechaRepeat, setFechaRepeat] = useState<string | null>(null);
  const [highlightName, setHighlightName] = useState<string | null>(null);
  const [turnoAReservar, setTurnoAReservar] = useState<Turno | null>(null);
  const [turnoBloqueado, setTurnoBloqueado] = useState<{ nombre: string; mensaje: string } | null>(null);
  const [reservando, setReservando] = useState(false);
  const [reservaError, setReservaError] = useState("");
  const [reservaOk, setReservaOk] = useState(false);

  // Si venimos de "Repetir próxima semana", leer el state
  const repeatState = location.state as { searchName?: string; targetDate?: string } | null;
  const targetDateStr = repeatState?.targetDate ?? fechaRepeat;
  const targetDate = targetDateStr ? new Date(targetDateStr + "T00:00:00") : null;

  const hoy = new Date();
  const desde = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-01`;
  // Si venimos de "repetir", extender el rango para incluir la fecha target
  const hastaDefault = new Date(hoy.getFullYear(), hoy.getMonth() + 2, 0);
  const hasta = targetDate && targetDate > hastaDefault ? targetDate : hastaDefault;
  const hastaStr = `${hasta.getFullYear()}-${String(hasta.getMonth() + 1).padStart(2, "0")}-${String(hasta.getDate()).padStart(2, "0")}`;

  const { data, isLoading } = useQuery({
    queryKey: ["turnos", desde, hastaStr],
    queryFn: () => apiClient.turnos(desde, hastaStr),
  });

  // Traer los turnos reservados del usuario para marcarlos en la lista
  const { data: misTurnosData } = useQuery({
    queryKey: ["mis-turnos"],
    queryFn: apiClient.misTurnos,
  });
  const eventosReservados = useMemo(() => {
    const ids = new Set<number>();
    for (const mt of misTurnosData?.data ?? []) {
      if (mt.estado === "open") ids.add(mt.evento.id);
    }
    return ids;
  }, [misTurnosData]);

  const turnos = useMemo(() => {
    let all = data?.data ?? [];
    if (sede !== "todas") all = all.filter((t) => t.nombre.toLowerCase().includes(sede));
    if (tipoFiltro === "libre") all = all.filter((t) => t.nombre.toLowerCase().includes("boulder libre"));
    if (tipoFiltro === "clases") all = all.filter((t) => !t.nombre.toLowerCase().includes("boulder libre"));
    return all;
  }, [data, sede, tipoFiltro]);

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

  // Si venimos de "Repetir próxima semana", seleccionar el día en el calendario
  // y highlightear el evento matching para que el usuario lo vea y clickee.
  useEffect(() => {
    if (!targetDateStr || isLoading) return;
    const target = new Date(targetDateStr + "T00:00:00");
    setDiaSeleccionado(target);
    setMesCalendario(target);
    setFechaRepeat(targetDateStr);
    setHighlightName(repeatState?.searchName ?? null);
    // Limpiar el location state para que no se re-ejecute
    window.history.replaceState({}, document.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetDateStr, isLoading]);

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
    } catch (err) {
      setReservaError(err instanceof Error ? err.message : "Error al reservar");
    } finally {
      setReservando(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header userEmail={user?.email} onLogout={logout} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="brutal-title text-2xl text-white sm:text-3xl">Turnos disponibles</h2>
            <p className="brutal-sub mt-1 text-sm text-neutral-300">Clickeá sobre un evento para reservarlo.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto">
            <select
              value={sede}
              onChange={(e) => setSede(e.target.value as "todas" | Sede)}
              className="brutal-select brutal-sub text-xs"
            >
              <option value="todas">Todas las sedes</option>
              <option value="bucarelli">Bucarelli</option>
              <option value="centro">Centro</option>
            </select>
            <select
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value as "todos" | "libre" | "clases")}
              className="brutal-select brutal-sub text-xs"
            >
              <option value="todos">Todos los tipos</option>
              <option value="libre">Boulder libre</option>
              <option value="clases">Clases</option>
            </select>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Calendario */}
          <div className="brutal-card flex justify-center overflow-x-auto bg-black/50 p-4 text-white">
            <DayPicker
              mode="single"
              selected={diaSeleccionado}
              onSelect={setDiaSeleccionado}
              month={mesCalendario}
              onMonthChange={setMesCalendario}
              locale={es}
              disabled={[{ before: hoy }, { after: hasta }]}
              weekStartsOn={1}
              className="calendario-fluido"
              style={{
                "--rdp-accent-color": "var(--ink)",
                "--rdp-accent-background-color": "var(--hover-tint)",
                "--rdp-today-color": "var(--ink)",
                "--rdp-day_button-border-radius": "0px",
                "--rdp-selected-border": "none",
              } as React.CSSProperties}
            />
          </div>

          {/* Lista de turnos del día */}
          <div className="brutal-card bg-black/50 p-4">
            <h3 className="brutal-label mb-3 text-sm text-neutral-200">
              {diaSeleccionado
                ? diaSeleccionado.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })
                : "Seleccioná un día"}
            </h3>
            {isLoading && <p className="brutal-sub text-sm text-neutral-300">Cargando…</p>}
            {!isLoading && turnosDelDia.length === 0 && (
              <p className="brutal-sub text-sm text-neutral-300">No hay turnos para este día.</p>
            )}
            {turnosDelDia.length > 0 && (
              <div className="border-y border-white">
                {turnosDelDia.map((t, i) => (
                  <TurnoRow
                    key={t.id}
                    turno={t}
                    index={i}
                    total={turnosDelDia.length}
                    onReservar={() => {
                      if (eventosReservados.has(t.id)) {
                        setTurnoBloqueado({ nombre: t.nombre, mensaje: "Ya tenés una reserva activa para este evento." });
                        return;
                      }
                      if (t.cuposLibres <= 0) {
                        setTurnoBloqueado({ nombre: t.nombre, mensaje: "No hay más cupos disponibles para este evento." });
                        return;
                      }
                      setReservaOk(false);
                      setReservaError("");
                      setTurnoAReservar(t);
                    }}
                    highlight={highlightName ? t.nombre.startsWith(highlightName) : false}
                    yaReservado={eventosReservados.has(t.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal de confirmación */}
      {turnoAReservar && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md brutal-modal bg-black/80 p-8 text-white backdrop-blur-xl">
            {reservaOk ? (
              <div className="text-center">
                <img src="/holds-png/green-round.png" alt="" className="mx-auto h-12 w-12 object-contain" />
                <p className="brutal-title mt-3 text-lg text-white">¡Reserva confirmada!</p>
                <button
                  onClick={() => setTurnoAReservar(null)}
                  className="brutal-btn-secondary brutal-label mt-6 w-full px-4 py-2 text-sm"
                >Entendido</button>
              </div>
            ) : (
              <>
                <h3 className="brutal-title mb-6 text-2xl">¿Reservar?</h3>
                <p className="brutal-sub mb-2 text-sm font-semibold capitalize text-emerald-400">
                  {fechaLarga(new Date(turnoAReservar.inicio))}
                </p>
                <p className="brutal-title mb-2 text-lg text-white">{turnoAReservar.nombre}</p>
                <p className="brutal-sub mb-6 text-sm text-neutral-300">
                  {turnoAReservar.inicio.slice(11, 16)}–{turnoAReservar.fin.slice(11, 16)} hs · {turnoAReservar.cuposLibres} cupos libres
                </p>
                {reservaError && <p className="brutal-sub mb-3 text-sm text-red-400">{reservaError}</p>}
                {!reservaHabilitada && (
                  <p className="brutal-sub mb-3 text-xs text-amber-400">La reserva online estará habilitada pronto.</p>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => setTurnoAReservar(null)}
                    className="brutal-btn-secondary brutal-label flex-1 px-4 py-2 text-sm"
                  >Cancelar</button>
                  <button
                    onClick={confirmarReserva}
                    disabled={reservando || !reservaHabilitada}
                    className="brutal-btn brutal-label flex-1 px-4 py-2 text-sm"
                  >{reservando ? "Reservando…" : "Confirmar"}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de bloqueo — no se puede reservar */}
      {turnoBloqueado && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md brutal-modal bg-black/80 p-8 text-center text-white backdrop-blur-xl">
            <img src="/holds-png/red-round.png" alt="" className="mx-auto h-12 w-12 object-contain" />
            <p className="brutal-title mt-3 text-lg text-white">{turnoBloqueado.mensaje}</p>
            <button
              onClick={() => setTurnoBloqueado(null)}
              className="brutal-btn-secondary brutal-label mt-6 w-full px-4 py-2 text-sm"
            >Entendido</button>
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

function TurnoRow({
  turno,
  index,
  total,
  onReservar,
  highlight,
  yaReservado,
}: {
  turno: Turno;
  index: number;
  total: number;
  onReservar: () => void;
  highlight?: boolean;
  yaReservado?: boolean;
}) {
  const sinCupos = turno.cuposLibres <= 0;
  const indexLabel = String(index + 1).padStart(2, "0");
  const totalLabel = String(total).padStart(2, "0");
  const ref = useRef<HTMLDivElement>(null);

  // Scroll al elemento highlighteado cuando aparece
  useEffect(() => {
    if (highlight && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlight]);

  // El ring va en el contenedor; el opacity va en el contenido.
  const dimmed = sinCupos && yaReservado;
  const ringClass = highlight
    ? "ring-2 ring-inset ring-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20"
    : yaReservado
      ? "ring-1 ring-inset ring-amber-400 bg-amber-400/10 hover:bg-amber-400/20"
      : "hover:bg-white/[0.06]";

  return (
    <div
      ref={ref}
      onClick={onReservar}
      className={`group grid cursor-pointer grid-cols-[auto_1fr] items-center gap-x-3 border-t border-white px-3 py-4 transition-colors first:border-t-0 sm:gap-x-4 ${ringClass}`}
    >
      <span className={`brutal-number min-w-[3.5ch] self-start text-xs tracking-wide text-neutral-400 transition-colors group-hover:text-neutral-300 ${dimmed ? "opacity-40" : ""}`}>
        {indexLabel}
        <span className="opacity-60">/{totalLabel}</span>
      </span>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className={`brutal-title break-words text-lg leading-tight text-white sm:text-xl ${dimmed ? "opacity-40" : ""}`}>
            {turno.nombre}
          </p>
          {yaReservado && (
            <span className="brutal-label flex-shrink-0 rounded-sm bg-amber-400/20 px-1.5 py-0.5 text-[10px] text-amber-400">
              Reservado
            </span>
          )}
        </div>
        <p className={`brutal-sub mt-1 text-xs text-neutral-300 ${dimmed ? "opacity-40" : ""}`}>
          {turno.inicio.slice(11, 16)}–{turno.fin.slice(11, 16)} hs ·{" "}
          <span style={{ color: cupoColor(turno.cuposLibres, turno.cuposMax) }} className="font-semibold">
            {turno.cuposLibres}/{turno.cuposMax} libres
          </span>{" "}
          · {turno.sede}
        </p>
      </div>
    </div>
  );
}
