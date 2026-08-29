import { Hono } from "hono";
import { z } from "zod";
import { OdooClient } from "../odooClient.js";
import { clearSessionCookie, setSessionCookie } from "../middleware.js";
import { sealSessionId } from "../session.js";

export const auth = new Hono();

const loginSchema = z.object({
  user: z.string().min(1),
  password: z.string().min(1),
});

// POST /api/auth/login
auth.post("/login", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Usuario y contraseña son obligatorios" }, 400);
  }

  const { user, password } = parsed.data;
  const client = new OdooClient();

  try {
    const info = await client.login(user, password);
    const sessionId = client.getSessionId();
    if (!sessionId) {
      return c.json({ error: "No se pudo establecer la sesión" }, 500);
    }

    const token = sealSessionId(sessionId);
    setSessionCookie(c, token);

    return c.json({
      uid: info.uid,
      name: info.name,
      email: info.email,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error de autenticación";
    return c.json({ error: msg }, 401);
  }
});

// POST /api/auth/logout
auth.post("/logout", (c) => {
  clearSessionCookie(c);
  return c.json({ ok: true });
});
