import type { OutlineNode } from "@/lib/outlineUtils";

export type NoteStyle = "standard" | "outline" | "cornell" | "mindmap";

export interface NoteContentSnapshot {
  style: NoteStyle;
  content?: string;
  cornellCues?: string;
  cornellNotes?: string;
  cornellSummary?: string;
  outlineData?: string;
}

export interface ConversionResult {
  style: NoteStyle;
  content?: string;
  cornellCues?: string;
  cornellNotes?: string;
  cornellSummary?: string;
  outlineData?: string;
}

const toPlainText = (html?: string) => {
  if (!html) return "";
  if (typeof window === "undefined") return html;
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || div.innerText || "").trim();
};

const extractMindmapNodes = (html?: string) => {
  if (!html) return [];
  const nodesMatch = html.match(/data-nodes='([^']+)'/);
  if (!nodesMatch) return [];
  try {
    const parsed = JSON.parse(nodesMatch[1]);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const outlineFromLines = (lines: string[]) => {
  return lines
    .filter(Boolean)
    .map((line) => `<li>${line}</li>`)
    .join("");
};

const outlineDataFromLines = (lines: string[]): OutlineNode[] => {
  return lines.map((line) => ({
    id: `node-${Math.random().toString(36).slice(2)}`,
    type: "bullet" as const,
    content: line,
    level: 0,
  }));
};

export function convertTemplate(
  from: NoteContentSnapshot,
  to: NoteStyle,
): ConversionResult {
  if (from.style === to) {
    return { ...from };
  }

  if (to === "outline") {
    if (from.style === "cornell") {
      const cues = (from.cornellCues || "").split("\n").filter(Boolean);
      const notes = (from.cornellNotes || "")
        .replace(/<[^>]*>/g, "\n")
        .split("\n")
        .filter(Boolean);
      const merged = [...cues, ...notes];
      const outlineData = JSON.stringify(outlineDataFromLines(merged));
      return {
        style: "outline",
        content: `<ul>${outlineFromLines(merged)}</ul>`,
        outlineData,
      };
    }

    if (from.style === "mindmap") {
      const nodes = extractMindmapNodes(from.content);
      const labels = nodes.map((n: any) => n?.data?.label || n?.label || "");
      const outlineData = JSON.stringify(outlineDataFromLines(labels));
      return {
        style: "outline",
        content: `<ul>${outlineFromLines(labels)}</ul>`,
        outlineData,
      };
    }

    const plain = toPlainText(from.content);
    const lines = plain.split("\n").map((l) => l.trim()).filter(Boolean);
    const outlineData = JSON.stringify(outlineDataFromLines(lines));
    return {
      style: "outline",
      content: `<ul>${outlineFromLines(lines)}</ul>`,
      outlineData,
    };
  }

  if (to === "cornell") {
    if (from.style === "outline") {
      const plain = toPlainText(from.content);
      const lines = plain.split("\n").map((l) => l.trim()).filter(Boolean);
      const cues = lines.slice(0, Math.max(1, Math.floor(lines.length / 3)));
      const notes = lines.slice(cues.length);
      return {
        style: "cornell",
        cornellCues: cues.join("\n"),
        cornellNotes: notes.map((n) => `<p>${n}</p>`).join(""),
        cornellSummary: "",
      };
    }

    const plain = toPlainText(from.content);
    const cues = plain.split(".").map((l) => l.trim()).filter(Boolean);
    return {
      style: "cornell",
      cornellCues: cues.slice(0, 3).join("\n"),
      cornellNotes: cues.slice(3).map((n) => `<p>${n}</p>`).join(""),
      cornellSummary: "",
    };
  }

  if (to === "mindmap") {
    const plain = toPlainText(from.content);
    const lines = plain.split("\n").map((l) => l.trim()).filter(Boolean);
    const nodes = lines.slice(0, 8).map((label, i) => ({
      id: String(i),
      type: i === 0 ? "concept" : "topic",
      data: { label, color: i === 0 ? "bg-gradient-to-br from-purple-500 to-pink-500" : "bg-gradient-to-br from-blue-500 to-cyan-500" },
      position: { x: 200 + (i % 3) * 200, y: 80 + Math.floor(i / 3) * 140 },
    }));
    const edges = nodes.slice(1).map((n: any, i: number) => ({
      id: `e${i}`,
      source: "0",
      target: n.id,
      animated: true,
    }));
    const content = `<div data-type="diagram" data-nodes='${JSON.stringify(nodes)}' data-edges='${JSON.stringify(edges)}'></div>`;
    return {
      style: "mindmap",
      content,
    };
  }

  return {
    style: to,
    content: from.content,
  };
}
