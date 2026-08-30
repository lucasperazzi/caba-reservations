import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth";
import { apiClient } from "../api";
import type { MiTurno } from "../types";

export function HomePage() {
  const { user, logout } = useAuth();

  const { data: misTurnos } = useQuery<{ data: MiTurno[] }>({
    queryKey: ["mis-turnos"],
    queryFn: apiClient.misTurnos,
  });

  const ahora = new Date();
  const proximos = (misTurnos?.data ?? [])
    .filter((t) => t.estado === "open")
    .map((t) => ({ ...t, fecha: extraerFecha(t.evento.nombre) }))
    .filter((t) => t.fecha && t.fecha >= ahora)
    .sort((a, b) => (a.fecha?.getTime() ?? 0) - (b.fecha?.getTime() ?? 0));

  const proximo = proximos[0];

  return (
    <div className="min-h-screen bg-black">
      <Header user={user?.name ?? ""} onLogout={logout} />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <section className="border border-white/20 bg-neutral-950 p-6">
          <h2 className="text-lg font-bold tracking-tight text-white">Hola, {user?.name}</h2>
          <p className="text-sm text-neutral-500">{user?.email}</p>
        </section>

        <section className="border border-white/20 bg-neutral-950 p-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Tu próximo turno</h3>
          {proximo ? (
            <div>
              <p className="text-lg font-bold text-white">{proximo.evento.nombre.split(" (")[0]}</p>
              <p className="text-sm text-neutral-400">
                {proximo.fecha?.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>
          ) : (
            <p className="text-sm text-neutral-500">No hay próximos turnos reservados.</p>
          )}
        </section>

        <div className="grid gap-3 sm:grid-cols-3">
          <NavCard to="/mis-turnos" title="Mis turnos" desc="Turnos reservados" />
          <NavCard to="/turnos" title="Turnos CABA" desc="Ver y reservar" />
          <NavCard to="/paquetes" title="Mis paquetes" desc="Historial" />
        </div>
      </main>
    </div>
  );
}

function NavCard({ to, title, desc }: { to: string; title: string; desc: string }) {
  return (
    <Link
      to={to}
      className="block border border-white/20 bg-neutral-950 p-4 transition-colors hover:border-white hover:bg-neutral-900"
    >
      <p className="font-bold text-white">{title}</p>
      <p className="text-xs text-neutral-500">{desc}</p>
    </Link>
  );
}

const NAV_ITEMS = [
  { to: "/", label: "Inicio" },
  { to: "/turnos", label: "Turnos" },
  { to: "/mis-turnos", label: "Mis turnos" },
  { to: "/paquetes", label: "Paquetes" },
];

export function Header({ user, onLogout }: { user: string; onLogout: () => void }) {
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
      <header className="border-b border-white/20 bg-black">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-bold tracking-tight text-white">
            CABA · TURNOS
          </Link>
          <div className="flex items-center gap-4">
            {user && <span className="hidden text-sm text-neutral-400 sm:inline">{user}</span>}
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
                      active ? "text-white" : "text-neutral-500 hover:text-white"
                    }`}
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <button
              onClick={() => {
                closeMenu();
                onLogout();
              }}
              className="self-start text-sm text-neutral-500 hover:text-white"
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
