import { Context, Next } from "hono";
import { config } from "./config.js";
import { OdooClient, OdooSessionInfo } from "./odooClient.js";
import { openSessionId } from "./session.js";

/**
 * Middleware que requiere autenticación.
 * Lee la cookie nuestra, la desencripta para obtener el session_id de Odoo,
 * y pone un OdooClient en el contexto para que las rutas lo usen.
 *
 * Si no hay sesión o expiró, responde 401.
 */
export async function requireAuth(c: Context, next: Next) {
  const token = getCookie(c, config.cookieName);
  if (!token) {
    return c.json({ error: "No autenticado" }, 401);
  }

  const sessionId = openSessionId(token);
  if (!sessionId) {
    clearSessionCookie(c);
    return c.json({ error: "Sesión inválida" }, 401);
  }

  const client = OdooClient.fromSessionId(sessionId);

  // Verificar que la sesión de Odoo sigue activa
  const info = await client.getSessionInfo();
  if (!info) {
    clearSessionCookie(c);
    return c.json({ error: "Sesión expirada" }, 401);
  }

  c.set("odoo", client);
  c.set("user", info);
  await next();
}

/** Helper para setear la cookie de sesión. */
export function setSessionCookie(c: Context, token: string) {
  setCookie(c, config.cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    path: "/",
    maxAge: config.cookieMaxAgeDays * 24 * 60 * 60,
  });
}

/** Helper para borrar la cookie de sesión. */
export function clearSessionCookie(c: Context) {
  setCookie(c, config.cookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    path: "/",
    maxAge: 0,
  });
}

// ── Helpers mínimos de cookies (Hono tiene los suyos pero evitamos import issues) ──

function setCookie(
  c: Context,
  name: string,
  value: string,
  opts: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: string;
    path?: string;
    maxAge?: number;
  },
) {
  const parts = [`${name}=${value}`];
  if (opts.path) parts.push(`Path=${opts.path}`);
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.httpOnly) parts.push("HttpOnly");
  if (opts.secure) parts.push("Secure");
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
  c.header("Set-Cookie", parts.join("; "), { append: true });
}

function getCookie(c: Context, name: string): string | undefined {
  const cookieHeader = c.req.header("Cookie") ?? "";
  for (const cookie of cookieHeader.split(";")) {
    const [k, ...v] = cookie.trim().split("=");
    if (k === name) return v.join("=");
  }
  return undefined;
}

// ── Tipos del contexto ─────────────────────────────────────────

declare module "hono" {
  interface ContextVariableMap {
    odoo: OdooClient;
    user: OdooSessionInfo;
  }
}
