/**
 * Pure helpers for keyword search over note content.
 *
 * Note bodies are stored as editor HTML, so matching and previewing both need a
 * plain-text projection first. Kept framework-free so the Convex query and the
 * client renderer share exactly one definition of "what matched".
 */

/** Collapse note HTML down to readable plain text. */
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

/** Split a raw query into distinct, lowercased search terms. */
export function parseKeywords(query: string): string[] {
  const seen = new Set<string>();
  for (const raw of query.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (raw.length >= 2) seen.add(raw);
  }
  return [...seen];
}

/**
 * Number of distinct keywords present in `text`, used to rank results so a note
 * matching every term outranks one that happens to repeat a single term.
 */
export function countKeywordHits(text: string, keywords: string[]): number {
  const haystack = text.toLowerCase();
  return keywords.reduce(
    (total, keyword) => (haystack.includes(keyword) ? total + 1 : total),
    0,
  );
}

/**
 * Window of plain text centred on the first keyword occurrence, so the result
 * row shows the sentence the reader was actually looking for rather than the
 * note's opening line. Falls back to the head of the text when nothing matches.
 */
export function buildKeywordSnippet(
  text: string,
  keywords: string[],
  radius = 90,
): string {
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

export type SnippetSegment = { text: string; match: boolean };

/**
 * Break a snippet into alternating plain / matched runs so the renderer can
 * emphasise hits without dangerous HTML injection.
 */
export function splitHighlightSegments(
  snippet: string,
  keywords: string[],
): SnippetSegment[] {
  const usable = keywords.filter((k) => k.length >= 2);
  if (!snippet || usable.length === 0) {
    return snippet ? [{ text: snippet, match: false }] : [];
  }

  // Longest-first keeps "algorithm" from being shadowed by a shorter "algo".
  const ordered = [...usable].sort((a, b) => b.length - a.length);
  const haystack = snippet.toLowerCase();
  const matched = new Array<boolean>(snippet.length).fill(false);

  for (const keyword of ordered) {
    let from = 0;
    for (;;) {
      const at = haystack.indexOf(keyword, from);
      if (at === -1) break;
      for (let i = at; i < at + keyword.length; i++) matched[i] = true;
      from = at + keyword.length;
    }
  }

  const segments: SnippetSegment[] = [];
  let runStart = 0;
  for (let i = 1; i <= snippet.length; i++) {
    if (i === snippet.length || matched[i] !== matched[runStart]) {
      segments.push({
        text: snippet.slice(runStart, i),
        match: matched[runStart],
      });
      runStart = i;
    }
  }
  return segments;
}
