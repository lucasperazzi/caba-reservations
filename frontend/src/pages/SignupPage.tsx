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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

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

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className={`w-full max-w-sm text-center transition ${loading ? "pointer-events-none blur-sm" : ""}`}>
        <h1 className="mb-1 text-3xl font-bold tracking-tight text-white">CABA</h1>
        <p className="mb-6 text-sm text-neutral-300">Creá tu cuenta del Centro Andino</p>

        <form onSubmit={submit} className="space-y-4 border border-white/20 p-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-300">Nombre/s</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                className="w-full border-b border-white/20 bg-transparent px-1 py-2 text-base text-white placeholder-neutral-600 focus:border-white focus:outline-none sm:text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-300">Apellido/s</label>
              <input
                type="text"
                value={lastname}
                onChange={(e) => setLastname(e.target.value)}
                required
                className="w-full border-b border-white/20 bg-transparent px-1 py-2 text-base text-white placeholder-neutral-600 focus:border-white focus:outline-none sm:text-sm"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border-b border-white/20 bg-transparent px-1 py-2 text-base text-white placeholder-neutral-600 focus:border-white focus:outline-none sm:text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-300">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full border-b border-white/20 bg-transparent px-1 py-2 text-base text-white placeholder-neutral-600 focus:border-white focus:outline-none sm:text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-300">Confirmar contraseña</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full border-b border-white/20 bg-transparent px-1 py-2 text-base text-white placeholder-neutral-600 focus:border-white focus:outline-none sm:text-sm"
            />
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
