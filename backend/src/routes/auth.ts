import { Hono } from "hono";
import { z } from "zod";
import { OdooClient } from "../odooClient.js";
import { clearSessionCookie, setSessionCookie } from "../middleware.js";
import { sealSessionId, signOauthState, verifyOauthState } from "../session.js";
import { config, isGoogleEnabled } from "../config.js";

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
    console.log("Login OK:", { uid: info.uid, hasSession: !!sessionId });
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
    console.error("Login error:", msg, err instanceof Error ? err.stack : err);
    return c.json({ error: msg }, 401);
  }
});

// GET /api/auth/google — inicia el flujo de OAuth redirigiendo a Google.
auth.get("/google", (c) => {
  if (!isGoogleEnabled()) {
    return c.redirect("/login?error=google_disabled");
  }
  const params = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: config.google.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: signOauthState(),
    access_type: "online",
    prompt: "select_account",
  });
  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// GET /api/auth/google/callback — Google vuelve acá con el `code`.
auth.get("/google/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");

  if (!code || !state || !verifyOauthState(state)) {
    return c.redirect("/login?error=google");
  }

  try {
    // 1. Intercambiar el code por un access_token en Google.
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.google.clientId,
        client_secret: config.google.clientSecret,
        redirect_uri: config.google.redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });
    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenData.access_token) {
      throw new Error("No se obtuvo access_token de Google");
    }

    // 2. Usar el token para loguearse contra Odoo y obtener la sesión.
    const client = new OdooClient();
    const info = await client.loginWithOauthToken(tokenData.access_token, config.google.providerId);
    const sessionId = client.getSessionId();
    if (!sessionId) {
      throw new Error("No se pudo establecer la sesión");
    }

    setSessionCookie(c, sealSessionId(sessionId));
    console.log("Login Google OK:", { uid: info.uid, email: info.email });
    return c.redirect("/");
  } catch (err) {
    console.error("Google login error:", err instanceof Error ? err.message : err);
    return c.redirect("/login?error=google");
  }
});

// POST /api/auth/logout
auth.post("/logout", (c) => {
  clearSessionCookie(c);
  return c.json({ ok: true });
});
