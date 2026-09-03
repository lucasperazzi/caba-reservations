import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api";
import { Header } from "./HomePage";
import { useAuth } from "../auth";
import { usePageBg } from "../hooks/usePageBg";
import type { UserInfo } from "../types";

export function MiCuentaPage() {
  usePageBg("home");
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: apiClient.me,
  });

  const cuenta = data as UserInfo | undefined;

  return (
    <div className="min-h-screen">
      <Header user={user?.name ?? ""} userEmail={user?.email} onLogout={logout} />
      <main className="mx-auto max-w-5xl px-4 pt-16 pb-10 sm:pt-20 sm:pb-16">
        {isLoading && (
          <div className="flex justify-center py-20">
            <img src="/holds-png/hold-14.png" alt="" className="hold-spin h-8 w-8 object-contain" />
          </div>
        )}

        {!isLoading && cuenta && (
          <>
            {/* Header del perfil: avatar + nombre + email + botón editar */}
            <div className="flex items-center gap-4">
              <Avatar name={cuenta.name} image={cuenta.image} />
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-extrabold leading-tight tracking-tight text-white sm:text-2xl">
                  {cuenta.name}
                </h2>
                <p className="mt-0.5 break-words text-sm text-neutral-300">{cuenta.email}</p>
                <button
                  onClick={() => nav("/mi-cuenta/editar")}
                  className="mt-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-400 transition-colors hover:text-white"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Editar perfil
                </button>
              </div>
            </div>

            {/* Datos personales */}
            <section className="mt-12">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-200">
                Datos personales
              </h3>
              <dl className="divide-y divide-white/20 bg-black/40 p-4 backdrop-blur-md">
                <Row label="Nombre/s" value={cuenta.firstname} />
                <Row label="Apellido/s" value={cuenta.lastname} />
                <Row label="Email" value={cuenta.email} />
                <Row label="Teléfono" value={cuenta.phone} />
              </dl>
            </section>

            {/* Documento */}
            <section className="mt-10">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-200">
                Documento
              </h3>
              <dl className="divide-y divide-white/20 bg-black/40 p-4 backdrop-blur-md">
                <Row label="Tipo" value={cuenta.idCategory} />
                <Row label="Número" value={cuenta.idNumber} />
              </dl>
            </section>

            {/* Dirección */}
            <section className="mt-10">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-200">
                Dirección
              </h3>
              <dl className="divide-y divide-white/20 bg-black/40 p-4 backdrop-blur-md">
                <Row label="Calle" value={cuenta.street} />
                <Row label="Ciudad" value={cuenta.city} />
                <Row label="Código postal" value={cuenta.zip} />
                <Row label="País" value={cuenta.country} />
                <Row label="Provincia" value={cuenta.state} />
              </dl>
            </section>

            {/* Salud y emergencia */}
            <section className="mt-10">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-200">
                Salud y contacto de emergencia
              </h3>
              <dl className="divide-y divide-white/20 bg-black/40 p-4 backdrop-blur-md">
                <Row label="Seguro médico" value={cuenta.healthInsurance} />
                <Row label="Número de afiliado" value={cuenta.healthInsuranceNumber} />
                <Row label="Teléfono de emergencia" value={cuenta.healthInsuranceEmergencyPhone} />
                <Row label="Fecha de nacimiento" value={cuenta.birthdate} />
                <Row label="Contacto de emergencia" value={cuenta.emergencyContactName} />
                <Row label="Vínculo" value={cuenta.emergencyContactRelationship} />
                <Row label="Teléfono del contacto" value={cuenta.emergencyContactPhone} />
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
      <dt className="text-sm text-neutral-400">{label}</dt>
      <dd className="text-right text-sm font-medium text-white">
        {value || <span className="text-neutral-500">—</span>}
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
        className="h-12 w-12 flex-shrink-0 rounded-full object-cover sm:h-14 sm:w-14"
      />
    );
  }

  return (
    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/40 text-base font-bold text-white backdrop-blur-sm sm:h-14 sm:w-14 sm:text-lg">
      {initials || "?"}
    </div>
  );
}
