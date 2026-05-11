/**
 * Split markdown into alternating prose segments and fenced code blocks.
 * Handles incomplete trailing fences (streaming) by treating remainder as code.
 */

export type MarkdownFenceSegment =
  | { type: "markdown"; content: string }
  | { type: "code"; language: string; content: string };

export function splitMarkdownByFences(text: string): MarkdownFenceSegment[] {
  const segments: MarkdownFenceSegment[] = [];
  let pos = 0;
  const len = text.length;

  while (pos < len) {
    const fenceStart = text.indexOf("```", pos);
    if (fenceStart === -1) {
      const rest = text.slice(pos);
      if (rest.length > 0) {
        segments.push({ type: "markdown", content: rest });
      }
      break;
    }
    if (fenceStart > pos) {
      segments.push({
        type: "markdown",
        content: text.slice(pos, fenceStart),
      });
    }
    pos = fenceStart + 3;
    const lineEnd = text.indexOf("\n", pos);
    if (lineEnd === -1) {
      const lang = text.slice(pos).trim() || "text";
      segments.push({ type: "code", language: lang, content: "" });
      break;
    }
    const langLine = text.slice(pos, lineEnd).trim();
    const language = (langLine.split(/\s+/)[0] || "text").trim();
    pos = lineEnd + 1;
    const closeIdx = text.indexOf("```", pos);
    if (closeIdx === -1) {
      segments.push({
        type: "code",
        language,
        content: text.slice(pos),
      });
      break;
    }
    segments.push({
      type: "code",
      language,
      content: text.slice(pos, closeIdx),
    });
    pos = closeIdx + 3;
    if (text[pos] === "\n") {
      pos += 1;
    } else if (text[pos] === "\r") {
      pos += 1;
      if (text[pos] === "\n") pos += 1;
    }
  }

  return segments;
}
