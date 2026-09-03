import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./routes/auth.js";
import { me } from "./routes/me.js";
import { turnos } from "./routes/turnos.js";
import { paquetes } from "./routes/paquetes.js";
import { shop } from "./routes/shop.js";

const app = new Hono();

app.use("*", cors({ origin: "*", credentials: true }));

app.get("/", (c) => c.json({ name: "caba-reservations backend", status: "ok" }));
app.get("/health", (c) => c.json({ status: "ok", time: new Date().toISOString() }));

app.route("/api/auth", auth);
app.route("/api/me", me);
app.route("/api/turnos", turnos);
app.route("/api/paquetes", paquetes);
app.route("/api/shop", shop);

export default app;
