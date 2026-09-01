import { config } from "./config.js";

/**
 * Cliente de Odoo. Maneja la comunicación con el sitio de CABA (Odoo 12)
 * usando la sesión web (cookies) y la API JSON-RPC.
 *
 * Cada instancia mantiene su propio cookie jar (el session_id de Odoo).
 */

export interface OdooSessionInfo {
  uid: number;
  name: string;
  username: string;
  email: string;
  db: string;
}

export interface OdooCallResult {
  result?: unknown;
  error?: { data: { message: string; name?: string }; message: string };
}

const ARG_TZ = "America/Argentina/Buenos_Aires";

export class OdooClient {
  private cookies: string[] = [];
  private baseUrl: string;
  private db: string;

  constructor(baseUrl: string = config.odoo.baseUrl, db: string = config.odoo.db) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.db = db;
  }

  /** Crea un cliente a partir de un session_id ya existente (de la cookie). */
  static fromSessionId(sessionId: string): OdooClient {
    const client = new OdooClient();
    client.cookies = [`session_id=${sessionId}`];
    return client;
  }

  /** Devuelve el session_id actual (para guardarlo en la cookie nuestra). */
  getSessionId(): string | null {
    for (const cookie of this.cookies) {
      const match = cookie.match(/session_id=([a-f0-9]+)/);
      if (match) return match[1];
    }
    return null;
  }

  // ── HTTP helpers ──────────────────────────────────────────────

  async rawFetch(
    path: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const headers = new Headers(options.headers);
    if (this.cookies.length > 0) {
      headers.set("Cookie", this.cookies.join("; "));
    }
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
      redirect: "manual", // manejamos redirects manualmente para capturar cookies
    });

    // Capturar Set-Cookie (getSetCookie puede no existir en todos los runtimes)
    let setCookies: string[] = [];
    if (typeof res.headers.getSetCookie === "function") {
      setCookies = res.headers.getSetCookie();
    } else {
      // Fallback: parsear manualmente del header Set-Cookie
      const raw = res.headers.get("set-cookie");
      if (raw) {
        // En algunos runtimes vienen todas en una sola línea separadas por coma
        // pero las cookies pueden tener comas en expires, así que split simple
        setCookies = [raw];
      }
    }
    for (const sc of setCookies) {
      const cookiePart = sc.split(";")[0];
      if (cookiePart) {
        const name = cookiePart.split("=")[0];
        this.cookies = this.cookies.filter((c) => !c.startsWith(`${name}=`));
        this.cookies.push(cookiePart);
      }
    }

    return res;
  }

  // ── Auth ──────────────────────────────────────────────────────

  /**
   * Loguea contra Odoo. Devuelve la info de sesión si tuvo éxito.
   * Lanza error si las credenciales son inválidas.
   */
  async login(user: string, password: string): Promise<OdooSessionInfo> {
    // 1. GET /web/login para obtener csrf_token y cookies iniciales
    const loginPageRes = await this.rawFetch("/web/login");
    const loginHtml = await loginPageRes.text();
    const csrfMatch = loginHtml.match(/name="csrf_token"\s+value="([^"]+)"/);
    if (!csrfMatch) throw new Error("No se pudo obtener CSRF token de Odoo");
    const csrfToken = csrfMatch[1];

    // 2. POST /web/login con credenciales
    const body = new URLSearchParams({
      csrf_token: csrfToken,
      login: user,
      password: password,
      db: this.db,
      redirect: "",
    });

    const loginRes = await this.rawFetch("/web/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    // Odoo responde 200 en login exitoso o fallido; hay que verificar la sesión
    // 3. Verificar con get_session_info
    const info = await this.getSessionInfo();
    if (!info) {
      throw new Error("Credenciales inválidas");
    }
    return info;
  }

  /**
   * Registra un nuevo usuario en Odoo vía /web/signup (form POST).
   * Odoo crea res.users + res.partner y loguea automáticamente.
   * Devuelve la info de sesión si tuvo éxito.
   *
   * Nota: el form de CABA usa `firstname` y `lastname` (módulo partner_firstname),
   * no un campo único `name`.
   */
  async signup(name: string, lastname: string, login: string, password: string): Promise<OdooSessionInfo> {
    // 1. GET /web/signup para obtener csrf_token y cookies iniciales
    const signupPageRes = await this.rawFetch("/web/signup");
    const signupHtml = await signupPageRes.text();
    const csrfMatch = signupHtml.match(/name="csrf_token"\s+value="([^"]+)"/);
    if (!csrfMatch) throw new Error("No se pudo obtener CSRF token de Odoo");
    const csrfToken = csrfMatch[1];

    // 2. POST /web/signup con los datos del formulario
    const body = new URLSearchParams({
      csrf_token: csrfToken,
      firstname: name,
      lastname: lastname,
      login: login,
      password: password,
      confirm_password: password,
      db: this.db,
      redirect: "",
    });

    await this.rawFetch("/web/signup", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    // 3. Verificar sesión (Odoo loguea automáticamente tras el signup)
    const info = await this.getSessionInfo();
    if (!info) {
      throw new Error("No se pudo completar el registro");
    }
    return info;
  }

  /**
   * Loguea contra Odoo usando un access_token de OAuth (Google), replicando el
   * flujo del módulo `auth_oauth` de Odoo 12: GET /auth_oauth/signin con el token
   * en la query. Odoo valida el token contra Google, resuelve el usuario por su
   * `oauth_uid` y establece la cookie de sesión.
   *
   * IMPORTANTE — creación de usuarios habilitada:
   * Pasamos `c: { no_user_creation: false }` en el `state`. Con esto Odoo
   * auto-crea una cuenta nueva si el email de Google no corresponde a un
   * miembro ya registrado (crea res.users + res.partner y loguea).
   *
   * Nota: Odoo 12 NO valida el `audience` del token (el chequeo está comentado en
   * su código fuente), por eso un token emitido por *nuestro* client_id de Google
   * es aceptado.
   */
  async loginWithOauthToken(accessToken: string, providerId: number): Promise<OdooSessionInfo> {
    const state = JSON.stringify({
      p: providerId,
      d: this.db,
      r: "",
      c: { no_user_creation: false },
    });
    const params = new URLSearchParams({ state, access_token: accessToken });

    const res = await this.rawFetch(`/auth_oauth/signin?${params.toString()}`, {
      method: "GET",
    });

    // En éxito Odoo responde 303 → "/" o "/web". En fallo → "/web/login?oauth_error=N".
    const location = res.headers.get("location") ?? "";
    if (location.includes("oauth_error")) {
      throw new OdooError("Tu cuenta de Google no está registrada en CABA", "oauth");
    }

    const info = await this.getSessionInfo();
    if (!info) {
      throw new OdooError("No se pudo iniciar sesión con Google", "oauth");
    }
    return info;
  }

  /** Obtiene la info de sesión actual (uid, name, etc.). */
  async getSessionInfo(): Promise<OdooSessionInfo | null> {
    const res = await this.rawFetch("/web/session/get_session_info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: {} }),
    });
    const data = await res.json() as { result?: { uid?: number | false; name?: string; username?: string; db?: string } };
    const r = data?.result;
    if (!r || r.uid === false || r.uid === null || r.uid === undefined) return null;
    return {
      uid: r.uid,
      name: r.name ?? "",
      username: r.username ?? "",
      email: r.username ?? "",
      db: r.db ?? this.db,
    };
  }

  // ── API JSON-RPC (call_kw) ────────────────────────────────────

  /**
   * Llama a un método del ORM de Odoo vía /web/dataset/call_kw.
   * Requiere sesión autenticada.
   */
  async callKw(
    model: string,
    method: string,
    args: unknown[] = [],
    kwargs: Record<string, unknown> = {},
  ): Promise<unknown> {
    const res = await this.rawFetch("/web/dataset/call_kw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params: { model, method, args, kwargs },
      }),
    });
    const data = await res.json() as { result?: unknown; error?: { data?: { message?: string; name?: string }; message?: string } };
    if (data?.error) {
      const msg = data.error?.data?.message ?? data.error?.message ?? "Error de Odoo";
      throw new OdooError(msg, data.error?.data?.name);
    }
    return data?.result;
  }

  // ── Operaciones de dominio ────────────────────────────────────

  /** Lee eventos (turnos) disponibles en un rango de fechas. */
  async searchEvents(
    dateFrom: string,
    dateTo: string,
    sedeFilter?: "bucarelli" | "centro",
  ): Promise<OdooEvent[]> {
    const domain: unknown[] = [
      ["date_begin", ">=", dateFrom],
      ["date_end", "<=", dateTo],
      ["website_published", "=", true],
    ];
    if (sedeFilter === "bucarelli") domain.push(["name", "ilike", "bucarelli"]);
    if (sedeFilter === "centro") domain.push(["name", "ilike", "centro"]);

    const fields = [
      "id",
      "name",
      "date_begin",
      "date_end",
      "seats_max",
      "seats_available",
      "seats_reserved",
      "organizer_id",
      "website_url",
    ];

    const result = await this.callKw("event.event", "search_read", [domain, fields], {
      order: "date_begin asc",
    });
    return result as OdooEvent[];
  }

  /** Lee las reservas (registrations) del usuario actual. */
  async searchMyRegistrations(): Promise<OdooRegistration[]> {
    const info = await this.getSessionInfo();
    if (!info) throw new OdooError("No autenticado", "session");

    const domain = [[["partner_id.email", "=", info.email]]];
    const fields = [
      "id",
      "event_id",
      "state",
      "create_date",
      "name",
    ];

    const result = await this.callKw(
      "event.registration",
      "search_read",
      [domain[0], fields],
      { order: "create_date desc", limit: 50 },
    );
    return result as OdooRegistration[];
  }

  /** Lee los paquetes de acceso del usuario actual (climbing_gym.member_access_package). */
  async searchMyAccessPackages(): Promise<OdooAccessPackage[]> {
    const info = await this.getSessionInfo();
    if (!info) throw new OdooError("No autenticado", "session");

    // Obtener el partner_id del usuario (search_read con partner_id.email falla en este modelo)
    const userData = await this.callKw("res.users", "read", [
      [info.uid],
      ["partner_id"],
    ]) as Array<{ partner_id: [number, string] }>;
    if (!userData?.[0]?.partner_id) return [];
    const partnerId = userData[0].partner_id[0];

    // Buscar IDs de paquetes del partner
    const ids = await this.callKw(
      "climbing_gym.member_access_package",
      "search",
      [[["partner_id", "=", partnerId]]],
    ) as number[];
    if (ids.length === 0) return [];

    // Leer los registros
    const fields = [
      "id",
      "name",
      "state",
      "access_credits",
      "remaining_credits",
      "date_start",
      "date_finish",
      "days_duration",
      "completed_date",
      "activated_date",
      "create_date",
      "access_package",
      "product",
      "event_registrations",
    ];

    const records = await this.callKw(
      "climbing_gym.member_access_package",
      "read",
      [ids, fields],
    ) as OdooAccessPackage[];

    // Ordenar por create_date desc
    records.sort((a, b) => (b.create_date > a.create_date ? 1 : -1));

    return records;
  }

  /** Verifica si el usuario ya está inscripto en un evento. */
  async isRegistered(eventId: number): Promise<boolean> {
    const info = await this.getSessionInfo();
    if (!info) return false;
    const result = await this.callKw(
      "event.registration",
      "search_read",
      [
        [["event_id", "=", eventId], ["partner_id.email", "=", info.email], ["state", "!=", "cancel"]],
        ["id"],
      ],
      { limit: 1 },
    );
    return Array.isArray(result) && result.length > 0;
  }

  // ── Reserva (flujo web: new → confirm) ────────────────────────

  /**
   * Reserva un turno (se registra a un evento).
   * Replica el flujo del navegador:
   * 1. registration/new (JSON-RPC) → obtiene form de asistente
   * 2. registration/confirm (form) → crea la reserva
   */
  async registerForEvent(eventId: number): Promise<void> {
    // 1. Obtener el website_url del evento (slug)
    const events = await this.callKw(
      "event.event",
      "read",
      [[eventId], ["website_url"]],
    ) as Array<{ website_url: string }>;
    if (!events?.[0]?.website_url) {
      throw new OdooError("No se pudo obtener la URL del evento");
    }
    const eventPath = events[0].website_url;

    // 2. registration/new como JSON-RPC
    const newRes = await this.rawFetch(`${eventPath}/registration/new`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params: { "nb_register-0": 1 },
      }),
    });
    const newData = await newRes.json() as { result?: string };
    const formHtml = newData?.result;
    if (!formHtml || typeof formHtml !== "string") {
      throw new OdooError("No se pudo obtener el formulario de registro");
    }

    // 3. Parsear campos del form de asistente
    const csrfMatch = formHtml.match(/name="csrf_token"\s+value="([^"]+)"/);
    const nameMatch = formHtml.match(/name="1-name"[^>]*value="([^"]*)"/);
    const emailMatch = formHtml.match(/name="1-email"[^>]*value="([^"]*)"/);
    const phoneMatch = formHtml.match(/name="1-phone"[^>]*value="([^"]*)"/);
    const ticketMatch = formHtml.match(/name="1-ticket_id"[^>]*value="([^"]*)"/);

    if (!csrfMatch) throw new OdooError("No se pudo extraer CSRF del formulario");

    // 4. registration/confirm como form-urlencoded
    const confirmBody = new URLSearchParams({
      csrf_token: csrfMatch[1],
      "1-name": nameMatch?.[1] ?? "",
      "1-email": emailMatch?.[1] ?? "",
      "1-phone": phoneMatch?.[1] ?? "",
      "1-ticket_id": ticketMatch?.[1] ?? "0",
    });

    const confirmRes = await this.rawFetch(`${eventPath}/registration/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: `${this.baseUrl}${eventPath}`,
      },
      body: confirmBody.toString(),
    });

    if (confirmRes.status >= 400) {
      const text = await confirmRes.text();
      throw new OdooError(`Error al confirmar reserva (HTTP ${confirmRes.status}): ${text.substring(0, 200)}`);
    }
  }
}

// ── Tipos de Odoo ──────────────────────────────────────────────

export interface OdooEvent {
  id: number;
  name: string;
  date_begin: string; // UTC
  date_end: string; // UTC
  seats_max: number;
  seats_available: number;
  seats_reserved: number;
  organizer_id: [number, string];
  website_url?: string;
}

export interface OdooRegistration {
  id: number;
  event_id: [number, string];
  state: "open" | "done" | "cancel";
  create_date: string;
  name: string;
}

export interface OdooAccessPackage {
  id: number;
  name: string; // "MAP-XXXXX"
  state: "active" | "completed" | "cancelled" | "draft" | "expired";
  access_credits: number; // créditos totales
  remaining_credits: number; // créditos disponibles
  date_start: string; // "YYYY-MM-DD"
  date_finish: string; // "YYYY-MM-DD"
  days_duration: number;
  completed_date: string | false;
  activated_date: string | false;
  create_date: string; // "YYYY-MM-DD HH:MM:SS"
  access_package: [number, string] | false; // tipo de paquete
  product: [number, string] | false; // producto comprado
  event_registrations: number[]; // IDs de reservas asociadas
}

// ── Error personalizado ────────────────────────────────────────

export class OdooError extends Error {
  odooName?: string;
  constructor(message: string, odooName?: string) {
    super(message);
    this.name = "OdooError";
    this.odooName = odooName;
  }
}

// ── Helpers de transformación ──────────────────────────────────

/** Convierte una fecha UTC de Odoo a ISO en hora de Buenos Aires. */
export function toArgentinaISO(utcDateStr: string): string {
  // Odoo devuelve "2026-09-30 18:00:00" (sin zona horaria, pero es UTC)
  const isoUtc = utcDateStr.replace(" ", "T") + "Z";
  const date = new Date(isoUtc);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ARG_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(/(\d{4})-(\d{2})-(\d{2}), (\d{2}):(\d{2}):(\d{2})/, "$1-$2-$3T$4:$5:$6");
}

/** Mapea organizer_id a sede. */
export function sedeFromOrganizer(organizerId: number): "bucarelli" | "centro" | "otro" {
  if (organizerId === 15968) return "bucarelli";
  if (organizerId === 16299) return "centro";
  return "otro";
}

/** Calcula el nivel de ocupación para el color del box. */
export function occupancyLevel(seatsReserved: number, seatsMax: number): "green" | "orange" | "red" {
  if (seatsMax === 0) return "red";
  const ratio = seatsReserved / seatsMax;
  if (ratio < 0.5) return "green";
  if (ratio < 0.85) return "orange";
  return "red";
}
