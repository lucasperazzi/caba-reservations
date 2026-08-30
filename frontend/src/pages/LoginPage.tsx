import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

export function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="relative flex min-h-screen items-center justify-center bg-black px-4">
      <div className={`w-full max-w-sm transition ${loading ? "pointer-events-none blur-sm" : ""}`}>
        <h1 className="mb-1 text-3xl font-bold tracking-tight text-white">CABA · TURNOS</h1>
        <p className="mb-6 text-sm text-neutral-500">Iniciá sesión con tu cuenta del Centro Andino</p>

        <form onSubmit={submit} className="space-y-4 border border-white/20 bg-neutral-950 p-6">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-400">Usuario / Email</label>
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              required
              autoFocus
              className="w-full border border-white/20 bg-black px-3 py-2 text-base text-white focus:border-white focus:outline-none sm:text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-400">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-white/20 bg-black px-3 py-2 text-base text-white focus:border-white focus:outline-none sm:text-sm"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white px-4 py-2 text-sm font-bold uppercase tracking-wider text-black transition-colors hover:bg-neutral-300 disabled:opacity-50"
          >
            {loading ? "Ingresando…" : "Ingresar"}
          </button>
        </form>

        <div className="mt-4 border border-white/10 bg-neutral-950 px-4 py-3 text-xs text-neutral-400">
          <p className="font-semibold text-neutral-300">🔒 Tus datos están seguros</p>
          <p className="mt-1">
            Tu contraseña se usa una sola vez para autenticarte contra el sitio oficial de CABA y
            nunca se guarda ni la ve nadie. Solo se conserva la sesión, igual que en el sitio real.
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
