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
