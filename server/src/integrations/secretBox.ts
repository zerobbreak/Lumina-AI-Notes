import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Seals LMS credentials (feed URLs, OAuth tokens) before they reach Postgres,
 * so a leaked database dump or backup doesn't hand out students' LMS access.
 *
 * AES-256-GCM. A sealed value is "v1.<iv>.<tag>.<ciphertext>" in base64url;
 * the version lets a later key rotation tell old values from new ones.
 */
export type SecretBox = {
  seal(plaintext: string): string;
  open(sealed: string): string;
};

const VERSION = "v1";
const IV_BYTES = 12;
const KEY_BYTES = 32;

/** Decodes LMS_ENCRYPTION_KEY; null when it isn't 32 bytes of base64. */
export function parseKey(value: string): Buffer | null {
  const key = Buffer.from(value, "base64");
  return key.length === KEY_BYTES ? key : null;
}

/**
 * The key is optional at boot so the rest of the API runs without it; the
 * integration routes fail loudly at call time instead (like GEMINI_API_KEY).
 */
export function createSecretBox(keyBase64: string | undefined): SecretBox {
  const key = keyBase64 ? parseKey(keyBase64) : null;
  const requireKey = () => {
    if (!key) throw new Error("LMS_ENCRYPTION_KEY environment variable not set");
    return key;
  };

  return {
    seal(plaintext) {
      const iv = randomBytes(IV_BYTES);
      const cipher = createCipheriv("aes-256-gcm", requireKey(), iv);
      const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
      return [VERSION, iv, cipher.getAuthTag(), ciphertext]
        .map((part) => (typeof part === "string" ? part : part.toString("base64url")))
        .join(".");
    },

    open(sealed) {
      const [version, iv, tag, ciphertext] = sealed.split(".");
      if (version !== VERSION || !iv || !tag || ciphertext === undefined) {
        throw new Error("Not a sealed secret");
      }
      const decipher = createDecipheriv("aes-256-gcm", requireKey(), Buffer.from(iv, "base64url"));
      decipher.setAuthTag(Buffer.from(tag, "base64url"));
      // Throws if the value was tampered with or sealed under another key.
      return Buffer.concat([
        decipher.update(Buffer.from(ciphertext, "base64url")),
        decipher.final(),
      ]).toString("utf8");
    },
  };
}
