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

  /**
   * Cuenta de servicio (opcional) para leer disponibilidad sin login del usuario.
   * Se completa vía variables de entorno cuando se implemente la lectura pública.
   */
  serviceAccount: {
    user: process.env.ODOO_SERVICE_USER ?? "",
    password: process.env.ODOO_SERVICE_PASSWORD ?? "",
  },
} as const;
