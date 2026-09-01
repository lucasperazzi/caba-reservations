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
      <main className="mx-auto max-w-3xl px-4 pt-16 pb-10 sm:pt-20 sm:pb-16">
        {isLoading && (
          <div className="flex justify-center py-20">
            <img src="/holds-png/hold-14.png" alt="" className="hold-spin h-8 w-8 object-contain" />
          </div>
        )}

        {!isLoading && cuenta && (
          <>
            {/* Header del perfil: avatar + nombre + email + botón editar */}
            <div className="flex items-center gap-5">
              <Avatar name={cuenta.name} image={cuenta.image} />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  {cuenta.name}
                </h2>
                <p className="mt-1 truncate text-sm text-neutral-300 sm:text-base">{cuenta.email}</p>
              </div>
              <button
                onClick={() => nav("/mi-cuenta/editar")}
                className="flex-shrink-0 border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:border-white hover:bg-white/10"
              >
                Editar
              </button>
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
        className="h-16 w-16 flex-shrink-0 rounded-full object-cover sm:h-20 sm:w-20"
      />
    );
  }

  return (
    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/40 text-xl font-bold text-white backdrop-blur-sm sm:h-20 sm:w-20 sm:text-2xl">
      {initials || "?"}
    </div>
  );
}
