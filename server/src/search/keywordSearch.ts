/** Port of convex/shared/keywordSearch.ts */

export function stripHtmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseKeywords(query: string): string[] {
  const seen = new Set<string>();
  for (const raw of query.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (raw.length >= 2) seen.add(raw);
  }
  return [...seen];
}

export function countKeywordHits(text: string, keywords: string[]): number {
  const haystack = text.toLowerCase();
  return keywords.reduce(
    (total, keyword) => (haystack.includes(keyword) ? total + 1 : total),
    0,
  );
}

export function buildKeywordSnippet(text: string, keywords: string[], radius = 90): string {
  if (!text) return "";

  const haystack = text.toLowerCase();
  let matchIndex = -1;
  for (const keyword of keywords) {
    const found = haystack.indexOf(keyword);
    if (found !== -1 && (matchIndex === -1 || found < matchIndex)) {
      matchIndex = found;
    }
  }

  if (matchIndex === -1) {
    const head = text.slice(0, radius * 2);
    return head.length < text.length ? `${head.trimEnd()}…` : head;
  }

  const start = Math.max(0, matchIndex - radius);
  const end = Math.min(text.length, matchIndex + radius);
  const slice = text.slice(start, end).trim();

  return `${start > 0 ? "…" : ""}${slice}${end < text.length ? "…" : ""}`;
}
