import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth";

export function SignupPage() {
  const { signup } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = "Ingresá tu nombre";
    if (!lastname.trim()) errors.lastname = "Ingresá tu apellido";
    if (!email.trim()) errors.email = "Ingresá tu email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "El email no es válido";
    if (!password) errors.password = "Ingresá una contraseña";
    else if (password.length < 6) errors.password = "Mínimo 6 caracteres";
    if (!confirm) errors.confirm = "Confirmá tu contraseña";
    else if (password !== confirm) errors.confirm = "Las contraseñas no coinciden";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setError("");
    setLoading(true);
    try {
      await signup(name, lastname, email, password);
      nav("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar");
    } finally {
      setLoading(false);
    }
  };

  const clearError = (field: string) => setFieldErrors((f) => ({ ...f, [field]: "" }));

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className={`w-full max-w-sm text-center transition ${loading ? "pointer-events-none blur-sm" : ""}`}>
        <h1 className="mb-1 text-3xl font-bold tracking-tight text-white">CABA</h1>
        <p className="mb-6 text-sm text-neutral-300">Creá tu cuenta del Centro Andino</p>

        <form onSubmit={submit} className="space-y-4 border border-white/20 p-6" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-300">Nombre/s</label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); clearError("name"); }}
                autoFocus
                className="w-full border-b border-white/20 bg-transparent px-1 py-2 text-base text-white placeholder-neutral-600 focus:border-white focus:outline-none sm:text-sm"
              />
              {fieldErrors.name && <p className="mt-1 text-left text-xs text-red-400">{fieldErrors.name}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-300">Apellido/s</label>
              <input
                type="text"
                value={lastname}
                onChange={(e) => { setLastname(e.target.value); clearError("lastname"); }}
                className="w-full border-b border-white/20 bg-transparent px-1 py-2 text-base text-white placeholder-neutral-600 focus:border-white focus:outline-none sm:text-sm"
              />
              {fieldErrors.lastname && <p className="mt-1 text-left text-xs text-red-400">{fieldErrors.lastname}</p>}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearError("email"); }}
              className="w-full border-b border-white/20 bg-transparent px-1 py-2 text-base text-white placeholder-neutral-600 focus:border-white focus:outline-none sm:text-sm"
            />
            {fieldErrors.email && <p className="mt-1 text-left text-xs text-red-400">{fieldErrors.email}</p>}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-300">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearError("password"); }}
              className="w-full border-b border-white/20 bg-transparent px-1 py-2 text-base text-white placeholder-neutral-600 focus:border-white focus:outline-none sm:text-sm"
            />
            {fieldErrors.password && <p className="mt-1 text-left text-xs text-red-400">{fieldErrors.password}</p>}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-300">Confirmar contraseña</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); clearError("confirm"); }}
              className="w-full border-b border-white/20 bg-transparent px-1 py-2 text-base text-white placeholder-neutral-600 focus:border-white focus:outline-none sm:text-sm"
            />
            {fieldErrors.confirm && <p className="mt-1 text-left text-xs text-red-400">{fieldErrors.confirm}</p>}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-black transition-colors hover:bg-neutral-300 disabled:opacity-50"
          >
            {loading ? "Registrando…" : "Registrarse"}
          </button>
        </form>

        <p className="mt-4 text-sm text-neutral-300">
          ¿Ya tenés cuenta?{" "}
          <Link to="/login" className="font-semibold text-white underline hover:text-neutral-300">
            Iniciar sesión
          </Link>
        </p>
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            role="status"
            aria-label="Registrando…"
            className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-700 border-t-white"
          />
        </div>
      )}
    </div>
  );
}
