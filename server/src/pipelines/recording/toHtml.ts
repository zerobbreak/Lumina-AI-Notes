import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import type { StructuredNotes } from "./notes.js";

/**
 * Tags the note editor (TipTap) understands. Model output is untrusted, and
 * this HTML is saved straight to the note without passing through the
 * editor, so anything else (scripts, iframes, event handlers, javascript:
 * links) is stripped.
 */
const SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: [
    "h1", "h2", "h3", "h4", "p", "br", "hr", "ul", "ol", "li", "blockquote",
    "strong", "b", "em", "i", "u", "s", "code", "pre", "a", "table", "thead",
    "tbody", "tr", "th", "td",
  ],
  allowedAttributes: { a: ["href"] },
  allowedSchemes: ["http", "https", "mailto"],
};

/** Mirrors the editor's attribute encoding for diagram JSON (NoteView's toHtmlAttrJson). */
function htmlAttrJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/&/g, "&amp;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const block = (md: string) => marked.parse(md.trim(), { async: false });
const inline = (md: string) => marked.parseInline(md.trim(), { async: false });

/**
 * Structured notes -> note HTML. Same layout the editor used to build when
 * the pill inserted notes client-side (NoteView), so generated notes look
 * the same as before.
 */
export function structuredNotesToHtml(notes: StructuredNotes): string {
  let html = "";

  if (notes.summary.trim()) {
    html += `<h2>Summary</h2>${block(notes.summary)}`;
  }

  for (const section of notes.sections) {
    switch (section.type) {
      case "heading": {
        const level = Math.min(Math.max(section.level ?? 2, 1), 3);
        html += `<h${level}>${inline(section.content)}</h${level}>`;
        break;
      }
      case "bullets":
      case "numbered": {
        const tag = section.type === "bullets" ? "ul" : "ol";
        const marker = section.type === "bullets" ? /^[••\-–*]\s*/ : /^\d+[.)]\s*/;
        const items = section.content
          .split("\n")
          .map((item) => item.replace(marker, "").trim())
          .filter(Boolean);
        html += `<${tag}>${items.map((item) => `<li>${inline(item)}</li>`).join("")}</${tag}>`;
        break;
      }
      case "quote":
        html += `<blockquote>${block(section.content)}</blockquote>`;
        break;
      case "divider":
        html += "<hr/>";
        break;
      default:
        html += `<p>${inline(section.content)}</p>`;
    }
  }

  const list = (title: string, items: string[], strip?: RegExp) => {
    if (items.length === 0) return;
    const lis = items.map((item) => `<li>${inline(strip ? item.replace(strip, "") : item)}</li>`).join("");
    html += `<h2>${title}</h2><ul>${lis}</ul>`;
  };
  list("Action Items", notes.actionItems);
  list("Review Questions", notes.reviewQuestions, /^[••\-–]\s+/);

  html = sanitizeHtml(html, SANITIZE);

  // Built from parsed JSON and attribute-encoded here, after sanitizing,
  // because the sanitizer would drop the editor's data-* attributes.
  if (notes.diagramData?.nodes?.length) {
    html +=
      `<h2>Mind Map</h2><div data-type="diagram" data-nodes='${htmlAttrJson(notes.diagramData.nodes)}'` +
      ` data-edges='${htmlAttrJson(notes.diagramData.edges ?? [])}'></div>`;
  }
  return html;
}
