"use node";

/** Base64-encode binary data for Gemini `inlineData` using Node Buffer (fast; avoids btoa/byte loops). */
export function arrayBufferToBase64(arrayBuffer: ArrayBuffer): string {
  return Buffer.from(arrayBuffer).toString("base64");
}
