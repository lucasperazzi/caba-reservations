import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { useTheme } from "../theme";

export function LoginPage() {
  const { login } = useAuth();
  const { theme, toggle } = useTheme();
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
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <button onClick={toggle} className="absolute right-4 top-4 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white" title="Cambiar tema">
        {theme === "dark" ? "☀️" : "🌙"}
      </button>
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold text-slate-900 dark:text-white">CABA · Turnos</h1>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">Iniciá sesión con tu cuenta del Centro Andino</p>

        <form onSubmit={submit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Usuario / Email</label>
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              required
              autoFocus
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            {loading ? "Ingresando…" : "Ingresar"}
          </button>
        </form>

        <div className="mt-4 rounded-md bg-blue-50 px-4 py-3 text-xs text-blue-800 dark:bg-blue-950 dark:text-blue-300">
          <p className="font-medium">🔒 Tus datos están seguros</p>
          <p className="mt-1">
            Tu contraseña se usa una sola vez para autenticarte contra el sitio oficial de CABA y
            nunca se guarda ni la ve nadie. Solo se conserva la sesión, igual que en el sitio real.
          </p>
        </div>
      </div>
    </div>
  );
}
