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
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Mis turnos</h2>

        {isLoading && <p className="text-neutral-300">Cargando…</p>}

        {/* Próximo turno: barra lateral, igual que el resto de las cards */}
        {!isLoading && (
          <section className={`border-l-4 bg-black/40 p-4 backdrop-blur-md ${proximo ? "border-blue-600" : "border-neutral-700"}`}>
            <h3 className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider sm:text-sm ${proximo ? "text-blue-500" : "text-neutral-200"}`}>
              {proximo && <img src="/holds-png/hold-21.png" alt="" className="inline-block h-3.5 w-3.5 object-contain sm:h-4 sm:w-4" />}
              Turno reservado más cercano:
            </h3>
            {proximo ? (
              <div className="mt-3">
                <p className="text-xl font-bold leading-tight tracking-tight text-white sm:text-2xl">{nombreLargo(proximo.evento.nombre)}</p>
                <p className="mt-1 text-sm capitalize text-neutral-300">{fechaLarga(proximo.fecha!)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => repetirProximaSemana(proximo)}
                    className={BTN_CLASS}
                  >
                    Repetir próxima semana
                  </button>
                  <button
                    onClick={() => generarICS(proximo)}
                    className={BTN_CLASS}
                  >
                    Agregar al calendario
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3">
                <p className="text-sm text-neutral-300">No tenés turnos reservados.</p>
                <Link to="/turnos" className="mt-3 inline-block text-sm font-semibold text-blue-500 hover:text-blue-400">
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
              {siguientes.map((t) => (
                <MiTurnoRow key={t.registrationId} t={t} onRepetir={() => repetirProximaSemana(t)} onAgregarCalendario={() => generarICS(t)} />
              ))}
            </div>
          </section>
        )}

        {/* Historial */}
        {!isLoading && historial.length > 0 && (
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-200">Historial</h3>
            <div className="bg-black/40 p-4 backdrop-blur-md">
              {historial.map((t) => (
                <MiTurnoRow key={t.registrationId} t={t} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

// ── Estilos compartidos ────────────────────────────────────────

const BTN_CLASS =
  "whitespace-nowrap border border-white/40 px-2 py-1 text-[10px] font-semibold text-white transition-colors hover:border-white hover:bg-white/10 cursor-pointer";

// ── Generador de .ics ─────────────────────────────────────────

function generarICS(t: MiTurno & { fecha: Date }) {
  const nombre = nombreLargo(t.evento.nombre);
  const sede = nombre.toLowerCase().includes("bucarelli")
    ? "CABA Bucarelli"
    : nombre.toLowerCase().includes("centro")
    ? "CABA Centro"
    : "CABA";

  const uid = `${t.registrationId}-${t.evento.id}@caba-reservations`;
  const escape = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CABA Reservations//ES",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `SUMMARY:${escape(nombre)}`,
    `LOCATION:${escape(sede)}`,
  ];

  if (t.inicio && t.fin) {
    // Convertir hora argentina "YYYY-MM-DDTHH:mm:ss" → UTC "YYYYMMDDTHHmmssZ"
    // Argentina no tiene DST, siempre UTC-3.
    const toUTC = (argIso: string) =>
      new Date(argIso + "-03:00").toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    lines.push(`DTSTART:${toUTC(t.inicio)}`, `DTEND:${toUTC(t.fin)}`);
  } else {
    // Fallback: evento de día completo si no hay hora
    const p = (n: number) => String(n).padStart(2, "0");
    const d = t.fecha;
    const ds = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
    const nd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    const ns = `${nd.getFullYear()}${p(nd.getMonth() + 1)}${p(nd.getDate())}`;
    lines.push(`DTSTART;VALUE=DATE:${ds}`, `DTEND;VALUE=DATE:${ns}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  const blob = new Blob([lines.join("\r\n") + "\r\n"], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const p = (n: number) => String(n).padStart(2, "0");
  const d = t.fecha;
  a.download = `turno-caba-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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

function MiTurnoRow({ t, onRepetir, onAgregarCalendario }: {
  t: MiTurno & { fecha: Date };
  onRepetir?: () => void;
  onAgregarCalendario?: () => void;
}) {
  return (
    <div className="border-t border-white px-3 py-4 transition-colors first:border-t-0">
      <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 sm:gap-x-4">
        <div className="min-w-0">
          <p className="break-words text-base font-bold leading-tight tracking-tight text-white sm:text-xl">
            {nombreLargo(t.evento.nombre)}
          </p>
          <p className="mt-1 text-xs capitalize text-neutral-300">{fechaLarga(t.fecha)}</p>
        </div>

        <span className={`flex items-center gap-1.5 self-start text-[10px] font-semibold uppercase tracking-wider sm:text-xs ${estadoColor[t.estado] ?? "text-neutral-300"}`}>
          <img src={estadoHold[t.estado] ?? "/holds-png/hold-14.png"} alt="" className="h-3 w-3 object-contain sm:h-3.5 sm:w-3.5" />
          {estadoLabel[t.estado] ?? t.estado}
        </span>
      </div>

      {(onRepetir || onAgregarCalendario) && (
        <div className="mt-2 flex gap-2">
          {onRepetir && (
            <button onClick={onRepetir} className={BTN_CLASS}>
              Repetir próxima semana
            </button>
          )}
          {onAgregarCalendario && (
            <button onClick={onAgregarCalendario} className={BTN_CLASS}>
              Agregar al calendario
            </button>
          )}
        </div>
      )}
    </div>
  );
}
