/**
 * Fetch public web page text for AI note-generation context.
 * Only public internet addresses are ever connected to (see guardedLookup).
 */

import { isPublicAddress } from "../net/publicAddress.js";
import { isHostnameAllowed, safeGet, type FetchPolicy } from "../net/safeGet.js";
import { clientMessage } from "./errors.js";

export type { FetchPolicy };

export const MAX_REFERENCE_URLS = 5;
const MAX_URL_STRING_LEN = 2048;
const FETCH_TIMEOUT_MS = 18_000;
const MAX_RESPONSE_BYTES = 600_000;
const MAX_CHARS_PER_URL = 45_000;
const MAX_TOTAL_CHARS = 90_000;

function decodeBasicHtmlEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) && code > 0 ? String.fromCharCode(code) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      const code = parseInt(h, 16);
      return Number.isFinite(code) && code > 0 ? String.fromCharCode(code) : "";
    });
}

function htmlToPlainText(html: string): string {
  const noScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  const stripped = noScripts.replace(/<[^>]+>/g, " ");
  return decodeBasicHtmlEntities(stripped).replace(/\s+/g, " ").trim();
}

export function normalizeReferenceUrlList(
  raw: string[] | undefined,
): string[] {
  if (!raw || raw.length === 0) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (out.length >= MAX_REFERENCE_URLS) break;
    const t = String(item || "").trim();
    if (!t || t.length > MAX_URL_STRING_LEN) continue;
    // A token carrying any other scheme must be rejected outright. Prefixing
    // "https://" onto it would otherwise coin a bogus but well-formed URL —
    // "file:///etc/passwd" became "https://file///etc/passwd" — which then
    // reads back as an accepted link.
    //
    // Two shapes to catch, and neither may swallow a bare "host:port":
    //   hierarchical — anything "scheme://" that isn't http(s)
    //   opaque       — schemes with no "//" that are never fetchable
    const hasForeignHierarchicalScheme =
      /^[a-z][a-z0-9+.-]*:\/\//i.test(t) && !/^https?:\/\//i.test(t);
    const hasOpaqueScheme = /^(javascript|data|vbscript|file|mailto|blob):/i.test(t);
    if (hasForeignHierarchicalScheme || hasOpaqueScheme) continue;
    try {
      const withScheme = /^https?:\/\//i.test(t) ? t : `https://${t}`;
      const u = new URL(withScheme);
      if (u.protocol !== "http:" && u.protocol !== "https:") continue;
      if (!isHostnameAllowed(u.hostname)) continue;
      const href = u.href;
      if (seen.has(href)) continue;
      seen.add(href);
      out.push(href);
    } catch {
      continue;
    }
  }
  return out;
}

function truncateUtf8ish(s: string, maxChars: number): string {
  if (s.length <= maxChars) return s;
  return `${s.slice(0, maxChars)}\n… [truncated]`;
}

export type FetchedUrlSnippet = {
  url: string;
  title?: string;
  text: string;
  error?: string;
};

export async function fetchUrlTextSnippet(
  url: string,
  policy: FetchPolicy = {},
): Promise<FetchedUrlSnippet> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { url, text: "", error: "Invalid URL" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { url, text: "", error: "Only http(s) URLs are allowed" };
  }
  if (!isHostnameAllowed(parsed.hostname, policy.isAllowedAddress ?? isPublicAddress)) {
    return { url, text: "", error: "URL host is not allowed" };
  }

  try {
    const res = await safeGet(parsed, {
      ...policy,
      maxBytes: MAX_RESPONSE_BYTES,
      timeoutMs: FETCH_TIMEOUT_MS,
      accept: "text/html,application/xhtml+xml,text/plain,application/json;q=0.9,*/*;q=0.5",
    });
    if (res.status < 200 || res.status >= 300) {
      return {
        url,
        text: "",
        error: `HTTP ${res.status}`,
      };
    }

    const ctype = res.contentType.toLowerCase();
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const raw = decoder.decode(res.body);

    let title: string | undefined;
    let textBody = raw;

    if (ctype.includes("application/json")) {
      textBody = raw;
    } else if (ctype.includes("text/html") || raw.trimStart().startsWith("<")) {
      const titleMatch = raw.match(
        /<title[^>]*>([\s\S]*?)<\/title>/i,
      );
      if (titleMatch) {
        title = htmlToPlainText(titleMatch[1] || "").slice(0, 200);
      }
      textBody = htmlToPlainText(raw);
    } else {
      textBody = raw.replace(/\u0000/g, "");
    }

    const text = truncateUtf8ish(textBody, MAX_CHARS_PER_URL);
    if (!text || text.length < 20) {
      return {
        url,
        title,
        text: "",
        error: "Could not extract readable text",
      };
    }
    return { url, title, text };
  } catch (e) {
    // Goes into the prompt, and so possibly into the reply: keep network
    // details (resolved addresses, ports, TLS errors) out of it.
    return { url, text: "", error: clientMessage(e, "Could not load the page") };
  }
}

/**
 * Fetches multiple URLs and returns a single prompt section (markdown-ish plain text).
 */
export async function fetchReferenceUrlsForPrompt(
  urls: string[],
  policy: FetchPolicy = {},
): Promise<string> {
  const list = normalizeReferenceUrlList(urls);
  if (list.length === 0) return "";

  const results = await Promise.all(list.map((u) => fetchUrlTextSnippet(u, policy)));

  let total = 0;
  const parts: string[] = [];

  for (const r of results) {
    if (r.error || !r.text) {
      parts.push(
        `### ${r.url}\n_(Could not load: ${r.error || "empty"})_\n`,
      );
      continue;
    }
    const header = r.title ? `### ${r.title}\nSource: ${r.url}\n` : `### ${r.url}\n`;
    const chunk = `${header}\n${r.text}\n`;
    if (total + chunk.length > MAX_TOTAL_CHARS) {
      const remain = MAX_TOTAL_CHARS - total;
      if (remain > 200) {
        parts.push(chunk.slice(0, remain) + "\n… [truncated total reference size]\n");
      }
      break;
    }
    total += chunk.length;
    parts.push(chunk);
  }

  return parts.join("\n---\n\n");
}
