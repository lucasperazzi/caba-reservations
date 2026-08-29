/**
 * Configuración del backend. Los valores sensibles vienen de variables de entorno.
 * Nunca hardcodear credenciales acá.
 */
export const config = {
  /** Puerto del servidor de desarrollo. */
  port: Number(process.env.PORT ?? 3000),

  /** Instancia de Odoo (sitio actual de CABA). */
  odoo: {
    baseUrl: process.env.ODOO_BASE_URL ?? "https://shop.caba.org.ar",
    db: process.env.ODOO_DB ?? "odoocaba",
  },

  /** Secreto para firmar la cookie de sesión. Obligatorio en producción. */
  sessionSecret: process.env.SESSION_SECRET ?? "dev-secret-change-me",

  /** Nombre de la cookie de sesión. */
  cookieName: "caba_session",

  /** Duración de la cookie en días (Odoo mantiene la sesión ~90 días). */
  cookieMaxAgeDays: 90,
} as const;
