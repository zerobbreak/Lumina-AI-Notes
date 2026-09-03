import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const notesSource = readFileSync(
  resolve(process.cwd(), "convex/notes.ts"),
  "utf8",
);

describe("document access control", () => {
  it("keeps pinned file reads internal and ownership-scoped", () => {
    expect(notesSource).toMatch(
      /export const getPinnedFileContent = internalQuery\(\{/,
    );
    expect(notesSource).toMatch(
      /fileId:\s*v\.id\("files"\),\s*userId:\s*v\.string\(\),/,
    );
    expect(notesSource).toMatch(
      /file\.userId !== args\.userId/,
    );
    expect(notesSource).not.toMatch(
      /export const getDocumentsByIds = query\(\{/,
    );
  });

  it("loads the selected file row instead of an unrelated documents table", () => {
    expect(notesSource).toMatch(
      /ctx\.runQuery\(internal\.notes\.getPinnedFileContent,/,
    );
    expect(notesSource).not.toMatch(
      /ctx\.vectorSearch\("documents", "by_embedding"/,
    );
  });
});
