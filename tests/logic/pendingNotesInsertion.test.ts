import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const noteViewSource = readFileSync(
  resolve(process.cwd(), "components/dashboard/editor/NoteView.tsx"),
  "utf8",
);

describe("pending generated-note insertion", () => {
  it("only clears queued notes after the editor confirms insertion", () => {
    expect(noteViewSource).toMatch(
      /const inserted = editor\.chain\(\)\.focus\(\)\.insertContent\(html\)\.run\(\);[\s\S]*?if \(inserted\) \{\s*clearPendingNotes\(\);/,
    );

    const catchBlock = noteViewSource.match(
      /catch \(error\) \{\s*console\.error\("Failed to insert pending notes:"[\s\S]*?\n\s*\}/,
    )?.[0];
    expect(catchBlock).toBeDefined();
    expect(catchBlock).not.toContain("clearPendingNotes()");
  });

  it("escapes apostrophes before embedding diagram JSON in HTML attributes", () => {
    expect(noteViewSource).toContain('.replaceAll("\'", "&#39;")');
  });
});
