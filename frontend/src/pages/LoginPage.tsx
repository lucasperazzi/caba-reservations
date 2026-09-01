import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth";
import { apiClient } from "../api";

const OAUTH_ERRORS: Record<string, string> = {
  google: "No se pudo iniciar sesión con Google. Verificá que tu cuenta esté registrada en CABA.",
  google_disabled: "El login con Google no está disponible en este momento.",
};

export function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState(() => {
    const code = new URLSearchParams(window.location.search).get("error");
    return code ? OAUTH_ERRORS[code] ?? "" : "";
  });
  const [loading, setLoading] = useState(false);
  const [features, setFeatures] = useState<{ google: boolean; signup: boolean }>({ google: false, signup: false });

  useEffect(() => {
    apiClient.authFeatures().then(setFeatures).catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!user.trim()) errors.user = "Ingresá tu usuario o email";
    if (!password) errors.password = "Ingresá tu contraseña";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setError("");
    setLoading(true);
    try {
      await login(user, password);
      nav("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className={`w-full max-w-sm text-center transition ${loading ? "pointer-events-none blur-sm" : ""}`}>
        <h1 className="mb-1 text-3xl font-bold tracking-tight text-white">CABA</h1>
        <p className="mb-6 text-sm text-neutral-300">Iniciá sesión con tu cuenta del Centro Andino</p>

        <form onSubmit={submit} className="space-y-4 border border-white/20 p-6" noValidate>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-300">Usuario / Email</label>
            <input
              type="text"
              value={user}
              onChange={(e) => { setUser(e.target.value); setFieldErrors((f) => ({ ...f, user: "" })); }}
              autoFocus
              className="w-full border-b border-white/20 bg-transparent px-1 py-2 text-base text-white placeholder-neutral-600 focus:border-white focus:outline-none sm:text-sm"
            />
            {fieldErrors.user && <p className="mt-1 text-left text-xs text-red-400">{fieldErrors.user}</p>}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-300">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFieldErrors((f) => ({ ...f, password: "" })); }}
              className="w-full border-b border-white/20 bg-transparent px-1 py-2 text-base text-white placeholder-neutral-600 focus:border-white focus:outline-none sm:text-sm"
            />
            {fieldErrors.password && <p className="mt-1 text-left text-xs text-red-400">{fieldErrors.password}</p>}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-black transition-colors hover:bg-neutral-300 disabled:opacity-50"
          >
            {loading ? "Ingresando…" : "Ingresar"}
          </button>

          {features.google && (
            <>
              <div className="flex items-center gap-3 py-1 text-xs uppercase tracking-wider text-neutral-400">
                <span className="h-px flex-1 bg-white/20" />
                o
                <span className="h-px flex-1 bg-white/20" />
              </div>

              <a
                href="/api/auth/google"
                className="flex w-full items-center justify-center gap-2 border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
                  <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
                  <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 6.68 9.14 4.75 12 4.75Z" />
                </svg>
                Ingresar con Google
              </a>
            </>
          )}
        </form>

        {features.signup && (
          <p className="mt-4 text-sm text-neutral-300">
            ¿No tenés cuenta?{" "}
            <Link to="/signup" className="font-semibold text-white underline hover:text-neutral-300">
              Registrarse
            </Link>
          </p>
        )}

        <div className="mt-4 px-4 text-xs text-neutral-300">
          <p>
            Tu contraseña se usa una sola vez para autenticarte contra el sitio oficial de CABA y
            nunca se guarda. Solo se conserva la sesión, igual que en el sitio real.
          </p>
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            role="status"
            aria-label="Ingresando…"
            className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-700 border-t-white"
          />
        </div>
      )}
    </div>
  );
}
