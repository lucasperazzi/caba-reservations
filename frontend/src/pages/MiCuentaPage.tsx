import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api";
import { Header } from "./HomePage";
import { useAuth } from "../auth";
import type { UserInfo } from "../types";

export function MiCuentaPage() {
  const { user, logout } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: apiClient.me,
  });

  const cuenta = data as UserInfo | undefined;

  return (
    <div className="min-h-screen">
      <Header user={user?.name ?? ""} userEmail={user?.email} onLogout={logout} />
      <main className="mx-auto max-w-3xl px-4 pt-16 pb-10 sm:pt-20 sm:pb-16">
        {isLoading && <p className="text-neutral-400">Cargando…</p>}

        {!isLoading && cuenta && (
          <>
            {/* Header del perfil: avatar + nombre + email */}
            <div className="flex items-center gap-5">
              <Avatar name={cuenta.name} image={cuenta.image} />
              <div className="min-w-0">
                <h2 className="truncate text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  {cuenta.name}
                </h2>
                <p className="mt-1 truncate text-sm text-neutral-400 sm:text-base">{cuenta.email}</p>
              </div>
            </div>

            {/* Datos personales */}
            <section className="mt-12">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-400">
                Datos personales
              </h3>
              <dl className="divide-y divide-white/10 border-y border-white/10">
                <Row label="Nombre" value={cuenta.name} />
                <Row label="Email" value={cuenta.email} />
                <Row label="Usuario" value={cuenta.username} />
                <Row label="DNI / CUIT" value={cuenta.vat} />
              </dl>
            </section>

            {/* Contacto */}
            <section className="mt-10">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-400">
                Contacto
              </h3>
              <dl className="divide-y divide-white/10 border-y border-white/10">
                <Row label="Teléfono" value={cuenta.phone} />
                <Row label="Móvil" value={cuenta.mobile} />
              </dl>
            </section>

            {/* Dirección */}
            <section className="mt-10">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-400">
                Dirección
              </h3>
              <dl className="divide-y divide-white/10 border-y border-white/10">
                <Row label="Calle" value={cuenta.street} />
                <Row label="Ciudad" value={cuenta.city} />
                <Row label="Código postal" value={cuenta.zip} />
                <Row label="País" value={cuenta.country} />
              </dl>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <dt className="text-sm text-neutral-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-white">
        {value || <span className="text-neutral-600">—</span>}
      </dd>
    </div>
  );
}

function Avatar({ name, image }: { name: string; image?: string }) {
  const initials = name
    .split(/[\s,]+/)
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  if (image) {
    return (
      <img
        src={`data:image/png;base64,${image}`}
        alt={name}
        className="h-16 w-16 flex-shrink-0 rounded-full object-cover sm:h-20 sm:w-20"
      />
    );
  }

  return (
    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border-2 border-white/20 bg-black/40 text-xl font-bold text-white backdrop-blur-sm sm:h-20 sm:w-20 sm:text-2xl">
      {initials || "?"}
    </div>
  );
}
