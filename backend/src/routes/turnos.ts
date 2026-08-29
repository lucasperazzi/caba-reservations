import { Hono } from "hono";

/**
 * Rutas de turnos. Por ahora es un esqueleto: la lógica que habla con Odoo
 * (leer disponibilidad y reservar) se implementa en el siguiente paso.
 */
export const turnos = new Hono();

// GET /api/turnos  -> lista de turnos disponibles (a implementar)
turnos.get("/", (c) => {
  return c.json({ message: "TODO: listar turnos desde Odoo", data: [] });
});

// POST /api/turnos/reservar -> reservar un turno (a implementar)
turnos.post("/reservar", (c) => {
  return c.json({ message: "TODO: reservar turno vía Odoo" }, 501);
});
