import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";
import { config } from "./config.js";

/**
 * Firma y encripta el session_id de Odoo para guardarlo en nuestra cookie.
 * Usa AES-256-GCM con una clave derivada del SESSION_SECRET.
 *
 * Formato del token: base64(iv:ciphertext:authTag)
 */

const KEY_ALGO = "aes-256-gcm";
const KEY = deriveKey(config.sessionSecret);

function deriveKey(secret: string): Buffer {
  return createHmac("sha256", "caba-session-key").update(secret).digest();
}

export function sealSessionId(sessionId: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(KEY_ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(sessionId, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, authTag]).toString("base64url");
}

export function openSessionId(token: string): string | null {
  try {
    const buf = Buffer.from(token, "base64url");
    const iv = buf.subarray(0, 12);
    const authTag = buf.subarray(buf.length - 16);
    const encrypted = buf.subarray(12, buf.length - 16);
    const decipher = createDecipheriv(KEY_ALGO, KEY, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}

// ── OAuth state (protección CSRF del flujo de Google) ──────────
//
// El parámetro `state` viaja a Google y vuelve en el callback. Lo firmamos con
// HMAC + timestamp para verificar que el callback corresponde a un flujo que
// iniciamos nosotros y que no expiró.

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutos
const STATE_KEY = createHmac("sha256", "caba-oauth-state").update(config.sessionSecret).digest();

/** Genera un state firmado para iniciar el flujo de OAuth. */
export function signOauthState(): string {
  const payload = `${Date.now()}.${randomBytes(12).toString("hex")}`;
  const sig = createHmac("sha256", STATE_KEY).update(payload).digest("base64url");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

/** Verifica un state recibido en el callback (firma válida y no expirado). */
export function verifyOauthState(state: string): boolean {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const lastDot = decoded.lastIndexOf(".");
    if (lastDot === -1) return false;
    const payload = decoded.slice(0, lastDot);
    const sig = decoded.slice(lastDot + 1);
    const expected = createHmac("sha256", STATE_KEY).update(payload).digest("base64url");
    if (sig !== expected) return false;
    const ts = Number(payload.split(".")[0]);
    return Number.isFinite(ts) && Date.now() - ts < STATE_TTL_MS;
  } catch {
    return false;
  }
}
