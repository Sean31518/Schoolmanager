import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import { env } from "../config/env.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  if (!env.CREDENTIALS_ENCRYPTION_KEY) {
    throw new Error(
      "CREDENTIALS_ENCRYPTION_KEY ist nicht konfiguriert - Feature, das Drittanbieter-Zugangsdaten speichert (z.B. IServ), ist deaktiviert.",
    );
  }
  const key = Buffer.from(env.CREDENTIALS_ENCRYPTION_KEY, "hex");
  if (key.length !== 32) {
    throw new Error("CREDENTIALS_ENCRYPTION_KEY muss ein 32-Byte-Hex-String sein (64 Zeichen).");
  }
  return key;
}

export function isCredentialsEncryptionConfigured(): boolean {
  return Boolean(env.CREDENTIALS_ENCRYPTION_KEY);
}

/** Encrypts a plaintext secret (e.g. a third-party password) for storage.
 * Format: iv(hex):authTag(hex):ciphertext(hex) - one string, easy to store
 * in a single DB column. */
export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

export function decryptSecret(stored: string): string {
  const key = getKey();
  const [ivHex, authTagHex, ciphertextHex] = stored.split(":");
  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error("Gespeicherter Wert hat nicht das erwartete verschlüsselte Format.");
  }
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, "hex")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
