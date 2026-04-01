/**
 * Fetch public web page text for AI note-generation context.
 * Blocks obvious SSRF targets (localhost / private ranges).
 */

const MAX_REFERENCE_URLS = 5;
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

function isHostnameAllowed(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h === "0.0.0.0") return false;
  if (h.endsWith(".localhost")) return false;
  if (h === "::1") return false;

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (ipv4) {
    const a = Number(ipv4[1]);
    const b = Number(ipv4[2]);
    const c = Number(ipv4[3]);
    const d = Number(ipv4[4]);
    if ([a, b, c, d].some((x) => x > 255)) return false;
    if (a === 0 || a === 127) return false;
    if (a === 10) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 192 && b === 0 && c === 0) return false;
    if (a === 192 && b === 88 && c === 99) return false;
  }
  return true;
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "LuminaNotes/1.0",
        Accept:
          "text/html,application/xhtml+xml,text/plain,application/json;q=0.9,*/*;q=0.5",
      },
    });
  } finally {
    clearTimeout(id);
  }
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

export async function fetchUrlTextSnippet(url: string): Promise<FetchedUrlSnippet> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { url, text: "", error: "Invalid URL" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { url, text: "", error: "Only http(s) URLs are allowed" };
  }
  if (!isHostnameAllowed(parsed.hostname)) {
    return { url, text: "", error: "URL host is not allowed" };
  }

  try {
    const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
    if (!res.ok) {
      return {
        url,
        text: "",
        error: `HTTP ${res.status}`,
      };
    }

    const ctype = (res.headers.get("content-type") || "").toLowerCase();
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_RESPONSE_BYTES) {
      return { url, text: "", error: "Response too large" };
    }

    const decoder = new TextDecoder("utf-8", { fatal: false });
    const raw = decoder.decode(buf);

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
    const msg = e instanceof Error ? e.message : "Fetch failed";
    return { url, text: "", error: msg };
  }
}

/**
 * Fetches multiple URLs and returns a single prompt section (markdown-ish plain text).
 */
export async function fetchReferenceUrlsForPrompt(
  urls: string[],
): Promise<string> {
  const list = normalizeReferenceUrlList(urls);
  if (list.length === 0) return "";

  const results = await Promise.all(list.map((u) => fetchUrlTextSnippet(u)));

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
