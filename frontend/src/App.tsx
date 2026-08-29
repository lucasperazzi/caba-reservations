import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";
import { MisTurnosPage } from "./pages/MisTurnosPage";
import { TurnosPage } from "./pages/TurnosPage";

function Protected({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex min-h-screen items-center justify-center text-slate-400">Cargando…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="flex min-h-screen items-center justify-center text-slate-400">Cargando…</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<Protected><HomePage /></Protected>} />
      <Route path="/mis-turnos" element={<Protected><MisTurnosPage /></Protected>} />
      <Route path="/turnos" element={<Protected><TurnosPage /></Protected>} />
      <Route path="/paquetes" element={<Protected><div className="p-8 text-slate-400">Próximamente</div></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
