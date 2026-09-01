import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api";
import { Header } from "./HomePage";
import { useAuth } from "../auth";
import { usePageBg } from "../hooks/usePageBg";
import type { Profile, Country, State } from "../types";

export function EditarPerfilPage() {
  usePageBg("home");
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: apiClient.profile,
  });

  const { data: countriesData } = useQuery({
    queryKey: ["countries"],
    queryFn: apiClient.countries,
    staleTime: Infinity,
  });

  const [form, setForm] = useState<Profile | null>(null);
  const [states, setStates] = useState<State[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof Profile, string>>>({});

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  useEffect(() => {
    if (form?.countryId) {
      apiClient.states(form.countryId).then((r) => setStates(r.data)).catch(() => setStates([]));
    } else {
      setStates([]);
    }
  }, [form?.countryId]);

  const update = (field: keyof Profile, value: string | number | null) => {
    setForm((f) => {
      if (!f) return f;
      const next = { ...f, [field]: value };
      // Si cambia el país a uno que no es Argentina, limpiar provincia
      if (field === "countryId" && value !== 10) {
        next.stateId = null;
      }
      return next;
    });
    setFieldErrors((f) => ({ ...f, [field]: undefined }));
    setSaved(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    // Validar campos requeridos en primera edición
    const isFirstEdit = !profile?.idNumber;
    const errors: Partial<Record<keyof Profile, string>> = {};

    if (isFirstEdit) {
      if (!form.firstname?.trim()) errors.firstname = "Requerido";
      if (!form.lastname?.trim()) errors.lastname = "Requerido";
      if (!form.email?.trim()) errors.email = "Requerido";
      if (!form.phone?.trim()) errors.phone = "Requerido";
      if (!form.idCategoryId) errors.idCategoryId = "Requerido";
      if (!form.idNumber?.trim()) errors.idNumber = "Requerido";
      if (!form.street?.trim()) errors.street = "Requerido";
      if (!form.city?.trim()) errors.city = "Requerido";
      if (!form.zip?.trim()) errors.zip = "Requerido";
      if (!form.countryId) errors.countryId = "Requerido";
      if (form.countryId === 10 && !form.stateId) errors.stateId = "Requerido";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await apiClient.updateProfile(form);
      setSaved(true);
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
      // El modal se cierra solo después de 1.5s y vuelve a Mi Cuenta
      setTimeout(() => nav("/mi-cuenta"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const countries = countriesData?.data ?? [];
  const dniEditable = !profile?.idNumber;
  const isFirstEdit = !profile?.idNumber;

  return (
    <div className="min-h-screen">
      <Header user={user?.name ?? ""} userEmail={user?.email} onLogout={logout} />
      <main className="mx-auto max-w-3xl px-4 pt-16 pb-10 sm:pt-20 sm:pb-16">
        {isLoading && (
          <div className="flex justify-center py-20">
            <img src="/holds-png/hold-14.png" alt="" className="hold-spin h-8 w-8 object-contain" />
          </div>
        )}

        {!isLoading && form && (
          <>
            {/* Header con título y botón volver */}
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Editar perfil
              </h2>
              <Link
                to="/mi-cuenta"
                className="text-sm font-semibold text-neutral-300 transition-colors hover:text-white"
              >
                ← Volver
              </Link>
            </div>

            <form onSubmit={submit} className="mt-12 space-y-10" noValidate>
              {/* Datos personales */}
              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-200">
                  Datos personales
                </h3>
                <div className="grid gap-4 bg-black/40 p-4 backdrop-blur-md sm:grid-cols-2">
                  <Field label="Nombre/s" required={isFirstEdit} error={fieldErrors.firstname}>
                    <input type="text" value={form.firstname} onChange={(e) => update("firstname", e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Apellido/s" required={isFirstEdit} error={fieldErrors.lastname}>
                    <input type="text" value={form.lastname} onChange={(e) => update("lastname", e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Email" required={isFirstEdit} error={fieldErrors.email}>
                    <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Teléfono" required={isFirstEdit} error={fieldErrors.phone}>
                    <input type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} className={inputClass} />
                  </Field>
                </div>
              </section>

              {/* Documento */}
              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-200">
                  Documento
                </h3>
                <div className="grid gap-4 bg-black/40 p-4 backdrop-blur-md sm:grid-cols-2">
                  <Field label="Tipo de documento" required={isFirstEdit} error={fieldErrors.idCategoryId}>
                    <select
                      value={form.idCategoryId ?? ""}
                      onChange={(e) => update("idCategoryId", e.target.value ? Number(e.target.value) : null)}
                      disabled={!dniEditable}
                      className={selectClass}
                    >
                      <option value="">Seleccionar…</option>
                      <option value="35">DNI</option>
                      <option value="25">CUIT</option>
                      <option value="63">CUIL</option>
                      <option value="70">PAS</option>
                    </select>
                  </Field>
                  <Field label="Número de documento" required={isFirstEdit} error={fieldErrors.idNumber}>
                    <input
                      type="text"
                      value={form.idNumber}
                      onChange={(e) => update("idNumber", e.target.value)}
                      disabled={!dniEditable}
                      className={inputClass}
                      placeholder={dniEditable ? "Ingresá tu DNI" : "—"}
                    />
                  </Field>
                  {!dniEditable && (
                    <p className="text-xs text-neutral-500 sm:col-span-2">
                      El documento no se puede modificar una vez cargado.
                    </p>
                  )}
                </div>
              </section>

              {/* Dirección */}
              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-200">
                  Dirección
                </h3>
                <div className="grid gap-4 bg-black/40 p-4 backdrop-blur-md sm:grid-cols-2">
                  <Field label="Calle" full required={isFirstEdit} error={fieldErrors.street}>
                    <input type="text" value={form.street} onChange={(e) => update("street", e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Ciudad" required={isFirstEdit} error={fieldErrors.city}>
                    <input type="text" value={form.city} onChange={(e) => update("city", e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Código postal" required={isFirstEdit} error={fieldErrors.zip}>
                    <input type="text" value={form.zip} onChange={(e) => update("zip", e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="País" required={isFirstEdit} error={fieldErrors.countryId}>
                    <select
                      value={form.countryId ?? ""}
                      onChange={(e) => update("countryId", e.target.value ? Number(e.target.value) : null)}
                      className={selectClass}
                    >
                      <option value="">Seleccionar…</option>
                      {countries.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </Field>
                  {form.countryId === 10 && (
                    <Field label="Provincia" required={isFirstEdit} error={fieldErrors.stateId}>
                      <select
                        value={form.stateId ?? ""}
                        onChange={(e) => update("stateId", e.target.value ? Number(e.target.value) : null)}
                        className={selectClass}
                      >
                        <option value="">Seleccionar…</option>
                        {states.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </Field>
                  )}
                </div>
              </section>

              {/* Salud y emergencia */}
              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-200">
                  Salud y contacto de emergencia
                </h3>
                <div className="grid gap-4 bg-black/40 p-4 backdrop-blur-md sm:grid-cols-2">
                  <Field label="Seguro médico">
                    <input type="text" value={form.healthInsurance} onChange={(e) => update("healthInsurance", e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Número de afiliado">
                    <input type="text" value={form.healthInsuranceNumber} onChange={(e) => update("healthInsuranceNumber", e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Teléfono de emergencia">
                    <input type="tel" value={form.healthInsuranceEmergencyPhone} onChange={(e) => update("healthInsuranceEmergencyPhone", e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Fecha de nacimiento">
                    <input type="date" value={form.birthdate} onChange={(e) => update("birthdate", e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Contacto de emergencia">
                    <input type="text" value={form.emergencyContactName} onChange={(e) => update("emergencyContactName", e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Vínculo">
                    <input type="text" value={form.emergencyContactRelationship} onChange={(e) => update("emergencyContactRelationship", e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Teléfono del contacto">
                    <input type="tel" value={form.emergencyContactPhone} onChange={(e) => update("emergencyContactPhone", e.target.value)} className={inputClass} />
                  </Field>
                </div>
              </section>

              {/* Botones */}
              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-white px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-black transition-colors hover:bg-neutral-300 disabled:opacity-50"
                >
                  {saving ? "Guardando…" : "Guardar cambios"}
                </button>
                <Link to="/mi-cuenta" className="text-sm font-semibold text-neutral-300 transition-colors hover:text-white">
                  Cancelar
                </Link>
                {error && <p className="text-sm text-red-400">{error}</p>}
              </div>
            </form>
          </>
        )}
      </main>

      {/* Modal de confirmación */}
      {saved && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md border border-white/20 bg-black/80 p-8 text-center text-white backdrop-blur-xl">
            <img src="/holds-png/green-round.png" alt="" className="mx-auto h-12 w-12 object-contain" />
            <p className="mt-3 text-lg font-bold text-white">¡Cambios guardados!</p>
          </div>
        </div>
      )}
    </div>
  );
}

const inputClass =
  "w-full border-b border-white/20 bg-transparent px-1 py-2 text-base text-white placeholder-neutral-600 focus:border-white focus:outline-none sm:text-sm disabled:cursor-not-allowed disabled:opacity-50";

const selectClass =
  "w-full border-b border-white/20 bg-neutral-900 px-1 py-2 text-base text-white focus:border-white focus:outline-none sm:text-sm disabled:cursor-not-allowed disabled:opacity-50 [&>option]:bg-neutral-900 [&>option]:text-white";

function Field({ label, children, full, required, error }: { label: string; children: React.ReactNode; full?: boolean; required?: boolean; error?: string }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
