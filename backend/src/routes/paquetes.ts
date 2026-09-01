import { Hono } from "hono";
import { requireAuth } from "../middleware.js";
import { OdooAccessPackage } from "../odooClient.js";

export const paquetes = new Hono();

paquetes.use("*", requireAuth);

// GET /api/paquetes
paquetes.get("/", async (c) => {
  const odoo = c.get("odoo");
  try {
    const packages = await odoo.searchMyAccessPackages();
    const normalized = packages.map(normalizePaquete);

    const activos = normalized.filter((p) => p.estado === "active");
    const pendientes = normalized.filter((p) => p.estado === "pending");
    const historial = normalized
      .filter((p) => p.estado !== "active" && p.estado !== "pending")
      .slice(0, 10);

    return c.json({ data: { activos, pendientes, historial } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al obtener paquetes";
    return c.json({ error: msg }, 500);
  }
});

// ── Normalización ──────────────────────────────────────────────

const estadoLabel: Record<string, string> = {
  active: "Activo",
  completed: "Completado",
  cancelled: "Cancelado",
  draft: "Borrador",
  expired: "Expirado",
  pending: "Pendiente",
};

function normalizePaquete(p: OdooAccessPackage) {
  return {
    id: p.id,
    nombre: p.name,
    descripcion: p.access_package ? p.access_package[1] : "—",
    producto: p.product ? p.product[1] : null,
    estado: p.state,
    estadoLabel: estadoLabel[p.state] ?? p.state,
    creditosTotales: p.access_credits,
    creditosDisponibles: p.remaining_credits,
    fechaInicio: p.date_start,
    fechaFin: p.date_finish,
    duracionDias: p.days_duration,
    fechaCreacion: p.create_date,
    reservas: p.event_registrations?.length ?? 0,
  };
}
