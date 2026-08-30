import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { config } from "./config.js";
import { auth } from "./routes/auth.js";
import { me } from "./routes/me.js";
import { turnos } from "./routes/turnos.js";

const app = new Hono();

app.use("*", cors({ origin: "*", credentials: true }));

app.get("/", (c) => c.json({ name: "caba-reservations backend", status: "ok" }));
app.get("/health", (c) => c.json({ status: "ok", time: new Date().toISOString() }));

app.route("/api/auth", auth);
app.route("/api/me", me);
app.route("/api/turnos", turnos);

// En desarrollo, levantar el servidor. En Vercel (serverless), no.
if (process.env.NODE_ENV !== "production") {
  serve({ fetch: app.fetch, port: config.port }, (info) => {
    console.log(`Backend escuchando en http://localhost:${info.port}`);
  });
}

export default app;
