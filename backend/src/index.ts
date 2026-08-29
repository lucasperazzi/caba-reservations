import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { config } from "./config.js";
import { turnos } from "./routes/turnos.js";

const app = new Hono();

app.use("*", cors());

app.get("/", (c) => c.json({ name: "caba-reservations backend", status: "ok" }));
app.get("/health", (c) => c.json({ status: "ok", time: new Date().toISOString() }));

// Rutas de la API
app.route("/api/turnos", turnos);

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`Backend escuchando en http://localhost:${info.port}`);
});

export default app;
