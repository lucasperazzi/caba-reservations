import { Link } from "react-router-dom";
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
    <div className="min-h-screen bg-slate-50">
      <Header user={user?.name ?? ""} onLogout={logout} />
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Hola, {user?.name}</h2>
          <p className="text-sm text-slate-500">{user?.email}</p>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="mb-2 text-sm font-medium text-slate-500">Tu próximo turno</h3>
          {proximo ? (
            <div>
              <p className="text-lg font-semibold text-slate-900">{proximo.evento.nombre.split(" (")[0]}</p>
              <p className="text-sm text-slate-500">
                {proximo.fecha?.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No tenés turnos reservados.</p>
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
    <Link to={to} className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-400">
      <p className="font-medium text-slate-900">{title}</p>
      <p className="text-xs text-slate-500">{desc}</p>
    </Link>
  );
}

export function Header({ user, onLogout }: { user: string; onLogout: () => void }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <Link to="/" className="text-lg font-bold">CABA · Turnos</Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">{user}</span>
          <button onClick={onLogout} className="text-sm text-slate-500 hover:text-slate-900">Salir</button>
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
