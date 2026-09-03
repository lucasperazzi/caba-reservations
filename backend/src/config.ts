import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/**
 * Configuración del backend. Los valores sensibles vienen de variables de entorno.
 * Nunca hardcodear credenciales acá.
 */

// Carga backend/.env en desarrollo (en producción las vars vienen del entorno).
// Parser mínimo sin dependencias; no pisa variables ya definidas.
loadDotEnv();

export const config = {
  /** Puerto del servidor de desarrollo. */
  port: Number(process.env.PORT ?? 3000),

  /** Instancia de Odoo (sitio actual de CABA). */
  odoo: {
    baseUrl: process.env.ODOO_BASE_URL ?? "https://shop.caba.org.ar",
    db: process.env.ODOO_DB ?? "odoocaba",
  },

  /** Login con Google (OAuth). Replica el flujo de auth_oauth de Odoo. */
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    redirectUri: process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:5173/api/auth/google/callback",
    /** ID del provider de Google en la config de Odoo de CABA (auth.oauth.provider). */
    providerId: Number(process.env.GOOGLE_ODOO_PROVIDER_ID ?? 3),
  },

  /**
   * Reservas: emails habilitados a reservar turnos online.
   * Coma-separado en RESERVAS_ALLOWLIST. Vacío = reservas abiertas a todos.
   * Ej: RESERVAS_ALLOWLIST=lucasperazzi98@gmail.com,otro@mail.com
   */
  reservas: {
    allowlist: (process.env.RESERVAS_ALLOWLIST ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  },

  /** Secreto para firmar la cookie de sesión. Obligatorio en producción. */
  sessionSecret: process.env.SESSION_SECRET ?? "dev-secret-change-me",

  /** Nombre de la cookie de sesión. */
  cookieName: "caba_session",

  /** Duración de la cookie en días (Odoo mantiene la sesión ~90 días). */
  cookieMaxAgeDays: 90,

  /**
   * Features habilitadas. En producción se pueden deshabilitar con
   * ENABLE_SIGNUP=false y ENABLE_GOOGLE=false (o simplemente no
   * configurar GOOGLE_CLIENT_ID).
   */
  features: {
    signup: process.env.ENABLE_SIGNUP !== "false",
    google: process.env.ENABLE_GOOGLE !== "false",
  },
} as const;

/** ¿Está configurado el login con Google? */
export function isGoogleEnabled(): boolean {
  return config.features.google && Boolean(config.google.clientId && config.google.clientSecret);
}

/** ¿Está habilitado el registro de nuevos usuarios? */
export function isSignupEnabled(): boolean {
  return config.features.signup;
}

/** ¿El email está habilitado a reservar turnos online?
 *  Allowlist vacía = reservas abiertas a todos. */
export function canReserve(email?: string): boolean {
  if (!email) return false;
  if (config.reservas.allowlist.length === 0) return true;
  return config.reservas.allowlist.includes(email.toLowerCase());
}

function loadDotEnv() {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    // src/config.ts (dev, tsx) o dist/config.js (build) → subir a backend/
    const envPath = join(here, "..", ".env");
    if (!existsSync(envPath)) return;
    const content = readFileSync(envPath, "utf8");
    for (const rawLine of content.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      if (process.env[key] !== undefined) continue;
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch {
    // Silencioso: si no se puede leer el .env seguimos con el entorno.
  }
}
