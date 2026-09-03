import { Hono } from "hono";
import { requireAuth } from "../middleware.js";
import { canReserve } from "../config.js";
import { OdooEvent, OdooRegistration, toArgentinaISO, sedeFromOrganizer, occupancyLevel } from "../odooClient.js";

export const turnos = new Hono();

turnos.use("*", requireAuth);

// GET /api/turnos?from=YYYY-MM-DD&to=YYYY-MM-DD&sede=bucarelli|centro
turnos.get("/", async (c) => {
  const odoo = c.get("odoo");
  const from = c.req.query("from") ?? new Date().toISOString().slice(0, 10);
  const to = c.req.query("to") ?? new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  const sede = c.req.query("sede") as "bucarelli" | "centro" | undefined;

  // Odoo espera UTC; le pasamos inicio del día from y fin del día to en UTC
  const dateFrom = `${from} 00:00:00`;
  const dateTo = `${to} 23:59:59`;

  const events = await odoo.searchEvents(dateFrom, dateTo, sede);
  return c.json({ data: events.map(normalizeTurno) });
});

// GET /api/mis-turnos
turnos.get("/mios", async (c) => {
  const odoo = c.get("odoo");
  const regs = await odoo.searchMyRegistrations();
  return c.json({ data: regs.map(normalizeMiTurno) });
});

// POST /api/turnos/:id/reservar
turnos.post("/:id/reservar", async (c) => {
  const odoo = c.get("odoo");
  const user = c.get("user");

  // Allowlist: solo los emails habilitados pueden reservar (ver RESERVAS_ALLOWLIST).
  if (!canReserve(user.email)) {
    return c.json({ error: "La reserva online no está habilitada para tu cuenta" }, 403);
  }

  const eventId = Number(c.req.param("id"));
  if (!eventId) return c.json({ error: "ID inválido" }, 400);

  // Chequear cupos
  const events = await odoo.callKw("event.event", "read", [[eventId], ["seats_available", "name"]]) as Array<{ seats_available: number; name: string }>;
  if (!events?.[0]) return c.json({ error: "Evento no encontrado" }, 404);
  if (events[0].seats_available <= 0) return c.json({ error: "No hay cupos disponibles" }, 409);

  // Chequear si ya está inscripto
  const yaInscripto = await odoo.isRegistered(eventId);
  if (yaInscripto) return c.json({ error: "Ya tenés una reserva para este turno" }, 409);

  try {
    await odoo.registerForEvent(eventId);
    return c.json({ ok: true });
  } catch (err) {
    // Logueamos el error real para diagnosticar en Vercel, pero al
    // cliente le devolvemos un mensaje genérico para no filtrar detalles.
    console.error("[reservar] Error inesperado:", {
      eventId,
      email: user.email,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return c.json({ error: "Error al reservar." }, 500);
  }
});

// ── Normalización ──────────────────────────────────────────────

function normalizeTurno(e: OdooEvent) {
  return {
    id: e.id,
    nombre: e.name,
    sede: sedeFromOrganizer(e.organizer_id[0]),
    inicio: toArgentinaISO(e.date_begin),
    fin: toArgentinaISO(e.date_end),
    cuposMax: e.seats_max,
    cuposLibres: e.seats_available,
    ocupados: e.seats_reserved,
    nivel: occupancyLevel(e.seats_reserved, e.seats_max),
  };
}

function normalizeMiTurno(r: OdooRegistration) {
  return {
    registrationId: r.id,
    estado: r.state,
    create_date: r.create_date,
    evento: { id: r.event_id[0], nombre: r.event_id[1] },
    // Fechas del evento en hora argentina (para generar .ics en el frontend).
    inicio: r.event_begin ? toArgentinaISO(r.event_begin) : undefined,
    fin: r.event_end ? toArgentinaISO(r.event_end) : undefined,
  };
}
