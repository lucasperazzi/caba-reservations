import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth";
import { apiClient } from "../api";
import type { MiTurno, Paquete } from "../types";
import { fechaLarga, diasHastaVencimiento } from "../utils/fecha";

export function HomePage() {
  const { user, logout } = useAuth();

  const { data: misTurnos, isLoading: turnosLoading } = useQuery<{ data: MiTurno[] }>({
    queryKey: ["mis-turnos"],
    queryFn: apiClient.misTurnos,
  });

  const { data: paquetesData, isLoading: paquetesLoading } = useQuery({
    queryKey: ["paquetes"],
    queryFn: apiClient.paquetes,
  });

  // "Hoy" a medianoche (zona horaria local del navegador), para comparar por
  // día calendario y no descartar turnos de hoy cuya fecha se parsea a 00:00.
  const hoy = new Date();
  const hoyMedianoche = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const proximos = (misTurnos?.data ?? [])
    .filter((t) => t.estado === "open")
    .map((t) => ({ ...t, fecha: extraerFecha(t.evento.nombre) }))
    .filter((t) => t.fecha && t.fecha >= hoyMedianoche)
    .sort((a, b) => (a.fecha?.getTime() ?? 0) - (b.fecha?.getTime() ?? 0));

  const proximo = proximos[0];
  const paquetesActivos = paquetesData?.data.activos ?? [];

  return (
    <div className="min-h-screen">
      <Header user={user?.name ?? ""} userEmail={user?.email} onLogout={logout} />
      <main className="mx-auto max-w-3xl px-4 pt-16 pb-10 sm:pt-24 sm:pb-16">
        {/* Saludo directo sobre el fondo, sin caja */}
        <h2 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Hola, {primerNombre(user?.name)}
        </h2>

        {/* Próximo turno — llamativo, con acento emerald */}
        <section className={`mt-16 border-l-2 pl-5 sm:mt-20 sm:pl-6 ${proximo ? "border-emerald-400" : "border-neutral-700"}`}>
          <h3 className={`flex items-center gap-2 text-sm font-semibold uppercase tracking-wider ${proximo ? "text-emerald-400" : "text-neutral-200"}`}>
            {proximo && <img src="/holds-png/green-round.png" alt="" className="inline-block h-4 w-4 object-contain" />}
            Tu próximo turno
          </h3>
          {turnosLoading ? (
            <div className="mt-3 flex items-center gap-2">
              <img src="/holds-png/hold-14.png" alt="" className="hold-sway h-5 w-5 object-contain" />
              <span className="text-sm text-neutral-400">Cargando…</span>
            </div>
          ) : proximo ? (
            <div className="mt-3">
              <p className="text-lg font-bold leading-tight tracking-tight text-white sm:text-xl">
                {proximo.evento.nombre.split(" (")[0]}
              </p>
              <p className="mt-1.5 text-sm capitalize text-neutral-300">
                {proximo.fecha ? fechaLarga(proximo.fecha) : ""}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-lg text-neutral-400">No hay próximos turnos reservados.</p>
          )}
        </section>

        {/* Paquetes activos — resumido */}
        <section className={`mt-12 border-l-2 pl-5 sm:pl-6 ${paquetesActivos.length > 0 ? "border-emerald-400" : "border-neutral-700"}`}>
          <h3 className={`flex items-center gap-2 text-sm font-semibold uppercase tracking-wider ${paquetesActivos.length > 0 ? "text-emerald-400" : "text-neutral-200"}`}>
            {paquetesActivos.length > 0 && <img src="/holds-png/green-round.png" alt="" className="inline-block h-4 w-4 object-contain" />}
            Paquetes activos
          </h3>
          {paquetesLoading ? (
            <div className="mt-3 flex items-center gap-2">
              <img src="/holds-png/hold-14.png" alt="" className="hold-sway h-5 w-5 object-contain" />
              <span className="text-sm text-neutral-400">Cargando…</span>
            </div>
          ) : paquetesActivos.length > 0 ? (
            <div className="mt-4">
              {paquetesActivos.map((p) => (
                <PaqueteCompacto key={p.id} p={p} />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-lg text-neutral-400">No tenés paquetes de acceso activos.</p>
          )}
        </section>

        {/* Navegación — estilo role-selector del portfolio */}
        <nav className="mt-20 border-t border-white sm:mt-16">
          {NAV_CARDS.map((item) => (
            <NavRow key={item.to} to={item.to} title={item.title} desc={item.desc} hold={item.hold} />
          ))}
        </nav>
      </main>
    </div>
  );
}

function fechaCorta(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00-03:00" : "Z"));
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

function PaqueteCompacto({ p }: { p: Paquete }) {
  const pct = p.creditosTotales > 0 ? (p.creditosDisponibles / p.creditosTotales) * 100 : 0;

  // Alerta: solo cuando queda 1 crédito
  const alerta = p.creditosDisponibles === 1;
  const barraColor = alerta ? "bg-amber-400" : "bg-emerald-400";

  // Vencimiento cercano: quedan créditos y vence en 7 días o menos
  const diasVenc = p.creditosDisponibles > 0 ? diasHastaVencimiento(p.fechaFin) : null;
  const vencCercano = diasVenc !== null && diasVenc >= 0 && diasVenc <= 7;

  return (
    <div className="py-3.5 first:pt-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate text-lg font-bold tracking-tight text-white sm:text-xl">{p.descripcion}</p>
        <span className={`flex-shrink-0 text-sm font-semibold ${alerta ? "text-amber-400" : "text-neutral-300"}`}>
          {p.creditosDisponibles}/{p.creditosTotales}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <span className="text-sm text-neutral-400">{fechaCorta(p.fechaInicio)} → {fechaCorta(p.fechaFin)}</span>
        <div className="h-1 flex-1 bg-white/10">
          <div className={`h-full ${barraColor} transition-all`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      {alerta && (
        <p className="mt-1.5 text-xs font-semibold text-amber-400">
          Te queda 1 crédito
        </p>
      )}
      {vencCercano && (
        <p className="mt-1.5 text-xs font-semibold text-amber-400">
          Se te está por vencer{diasVenc === 0 ? " hoy" : `, te quedan ${diasVenc} día${diasVenc === 1 ? "" : "s"}`} para usar este paquete
        </p>
      )}
    </div>
  );
}

const NAV_CARDS = [
  { to: "/turnos", title: "Turnos CABA", desc: "Ver y reservar", hold: "/holds-png/hold-15.png" },
  { to: "/mis-turnos", title: "Mis turnos", desc: "Turnos reservados", hold: "/holds-png/hold-16.png" },
  { to: "/paquetes", title: "Mis paquetes", desc: "Paquetes e historial", hold: "/holds-png/hold-02.png" },
];

function NavRow({ to, title, desc, hold }: { to: string; title: string; desc: string; hold: string }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-6 border-b border-white px-6 py-5 transition-colors hover:bg-white/[0.03] sm:gap-8 sm:py-6"
    >
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-bold leading-tight tracking-tight text-white transition-colors group-hover:text-neutral-300 sm:text-3xl">
          {title}
        </p>
        <p className="mt-0.5 text-xs text-neutral-300 transition-colors group-hover:text-neutral-200">
          {desc}
        </p>
      </div>
      <img src={hold} alt="" className="h-8 w-8 flex-shrink-0 object-contain transition-transform group-hover:scale-110" />
    </Link>
  );
}

function primerNombre(nombre?: string): string {
  if (!nombre) return "";
  // "Perazzi, Lucas" → "Lucas", o "Lucas Perazzi" → "Lucas"
  if (nombre.includes(",")) {
    const after = nombre.split(",")[1]?.trim();
    return after?.split(" ")[0] ?? nombre;
  }
  return nombre.split(" ")[0];
}

const NAV_ITEMS = [
  { to: "/", label: "Inicio" },
  { to: "/turnos", label: "Turnos" },
  { to: "/mis-turnos", label: "Mis turnos" },
  { to: "/paquetes", label: "Paquetes" },
  { to: "/mi-cuenta", label: "Mi cuenta" },
];

export function Header({ user, userEmail, onLogout }: { user: string; userEmail?: string; onLogout: () => void }) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const isActive = isOpen || isClosing;

  const closeMenu = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 250);
  };

  useEffect(() => {
    if (!isActive) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const toggleMenu = () => {
    if (isOpen) closeMenu();
    else setIsOpen(true);
  };

  return (
    <>
      <header className="border-b border-black bg-black">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-bold tracking-tight text-white">
            CABA
          </Link>
          <div className="flex items-center gap-4">
            {user && <span className="hidden text-sm text-neutral-300 sm:inline">{user}</span>}
            <button
              onClick={toggleMenu}
              aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={isOpen}
              className="relative z-[60] flex items-center gap-2 text-white"
            >
              <span className="text-xs font-semibold uppercase tracking-wider">{isOpen ? "Close" : "Menu"}</span>
              <span className="relative flex h-4 w-6 items-center justify-center">
                <span
                  className={`absolute h-[2px] w-6 bg-white transition-transform duration-300 ${
                    isOpen ? "rotate-45" : "-translate-y-1.5"
                  }`}
                />
                <span
                  className={`absolute h-[2px] w-6 bg-white transition-transform duration-300 ${
                    isOpen ? "-rotate-45" : "translate-y-1.5"
                  }`}
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      {(isOpen || isClosing) && (
        <div
          className={`fixed inset-0 z-50 flex items-end justify-center bg-black md:items-center md:justify-end ${
            isClosing ? "menu-overlay-exit" : "menu-overlay-enter"
          }`}
          role="dialog"
          aria-modal="true"
          onClick={closeMenu}
        >
          <div
            className="flex w-full flex-col justify-end gap-6 p-8 pb-20 md:h-full md:w-[50vw] md:max-w-[640px] md:justify-center md:border-l md:border-white/20 md:bg-neutral-950 md:pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="flex flex-col items-start gap-1.5">
              {NAV_ITEMS.map((item, i) => {
                const active = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={closeMenu}
                    className={`menu-item-animated text-2xl font-semibold leading-tight tracking-tight transition-colors sm:text-3xl ${
                      active ? "text-white" : "text-neutral-400 hover:text-white"
                    }`}
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            {userEmail && (
              <p className="text-xs text-neutral-500">{userEmail}</p>
            )}
            <button
              onClick={() => {
                closeMenu();
                onLogout();
              }}
              className="self-start text-sm text-neutral-400 hover:text-white"
            >
              Salir
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Extrae la fecha del nombre del evento (formato: "...(2026-08-24)" o usa create_date)
function extraerFecha(nombre: string): Date | null {
  const match = nombre.match(/\((\d{4}-\d{2}-\d{2})/);
  if (match) return new Date(match[1] + "T00:00:00-03:00");
  return null;
}
