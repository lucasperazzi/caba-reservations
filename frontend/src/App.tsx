import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { HomePage } from "./pages/HomePage";
import { MisTurnosPage } from "./pages/MisTurnosPage";
import { TurnosPage } from "./pages/TurnosPage";
import { PaquetesPage } from "./pages/PaquetesPage";
import { MiCuentaPage } from "./pages/MiCuentaPage";
import { EditarPerfilPage } from "./pages/EditarPerfilPage";

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-800 border-t-white" />
    </div>
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <Loading />;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/signup" element={user ? <Navigate to="/" replace /> : <SignupPage />} />
      <Route path="/" element={<Protected><HomePage /></Protected>} />
      <Route path="/mis-turnos" element={<Protected><MisTurnosPage /></Protected>} />
      <Route path="/turnos" element={<Protected><TurnosPage /></Protected>} />
      <Route path="/paquetes" element={<Protected><PaquetesPage /></Protected>} />
      <Route path="/mi-cuenta" element={<Protected><MiCuentaPage /></Protected>} />
      <Route path="/mi-cuenta/editar" element={<Protected><EditarPerfilPage /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
