import { Link } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth";
import { useTheme } from "../theme";
import { apiClient } from "../api";
import type { MiTurno } from "../types";

export function HomePage() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header user={user?.name ?? ""} onLogout={logout} theme={theme} onToggleTheme={toggle} />
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold dark:text-white">Hola, {user?.name}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">Tu próximo turno</h3>
          {proximo ? (
            <div>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">{proximo.evento.nombre.split(" (")[0]}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {proximo.fecha?.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No hay próximos turnos reservados.</p>
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
    <Link to={to} className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-600">
      <p className="font-medium text-slate-900 dark:text-white">{title}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
    </Link>
  );
}

export function Header({ user, onLogout, theme, onToggleTheme }: { user: string; onLogout: () => void; theme?: string; onToggleTheme?: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const navItems = [
    { to: "/", label: "Inicio" },
    { to: "/turnos", label: "Turnos" },
    { to: "/mis-turnos", label: "Mis turnos" },
    { to: "/paquetes", label: "Paquetes" },
  ];

  return (
    <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              title="Menú"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                {navItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link to="/" className="text-lg font-bold dark:text-white">CABA · Turnos</Link>
        </div>
        <div className="flex items-center gap-4">
          {user && <span className="hidden text-sm text-slate-600 dark:text-slate-400 sm:inline">{user}</span>}
          {onToggleTheme && (
            <button onClick={onToggleTheme} className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white" title="Cambiar tema">
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          )}
          <button onClick={onLogout} className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">Salir</button>
        </div>
      </div>
    </header>
  );
}

// Extrae la fecha del nombre del evento (formato: "...(2026-08-24)" o usa create_date)
function extraerFecha(nombre: string): Date | null {
  const match = nombre.match(/\((\d{4}-\d{2}-\d{2})/);
  if (match) return new Date(match[1] + "T00:00:00-03:00");
  return null;
}
