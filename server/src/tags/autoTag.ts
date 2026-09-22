import { eq } from "drizzle-orm";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Db } from "../db/client.js";
import { noteTags, notes, tags } from "../db/schema/index.js";
const MAX_TAGS_PER_USER = 200;

const AUTO_TAG_COLORS = [
  "#6366f1",
  "#14b8a6",
  "#f59e0b",
  "#ec4899",
  "#22c55e",
  "#8b5cf6",
];

/** Port of convex/tags.ts applyAutoTags. */
export async function applyAutoTags(db: Db, noteId: string, userId: string, tagNames: string[]) {
  const [note] = await db.select().from(notes).where(eq(notes.id, noteId)).limit(1);
  if (!note) return;

  const existingTags = await db.select().from(tags).where(eq(tags.userId, userId));
  const tagIds: string[] = [];
  const known = [...existingTags];

  for (const rawName of tagNames) {
    const name = rawName.trim();
    if (!name) continue;

    const match = known.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (match) {
      tagIds.push(match.id);
      continue;
    }

    if (known.length >= MAX_TAGS_PER_USER) break;

    const color = AUTO_TAG_COLORS[known.length % AUTO_TAG_COLORS.length]!;
    const [created] = await db.insert(tags).values({ userId, name, color }).returning();
    known.push(created);
    tagIds.push(created.id);
  }

  const unique = [...new Set(tagIds)];
  if (unique.length > 0) {
    await db.insert(noteTags).values(unique.map((tagId) => ({ noteId, tagId })));
  }
  await db.update(notes).set({ autoTagAttempted: true }).where(eq(notes.id, noteId));
}

/** Port of convex/tags.ts autoTagNote (fire-and-forget from note saves). */
export async function autoTagNote(db: Db, noteId: string, apiKey: string) {
  const [note] = await db.select().from(notes).where(eq(notes.id, noteId)).limit(1);
  if (!note) return;

  const existing = await db.select({ tagId: noteTags.tagId }).from(noteTags).where(eq(noteTags.noteId, noteId));
  if (existing.length > 0) return;

  const plainText = (note.content ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (plainText.length < 50) return;

  const userTags = await db.select().from(tags).where(eq(tags.userId, note.userId));

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" },
    });

    const result = await model.generateContent(`You tag study notes for a student's note-taking app.

Note title: ${note.title}
Note content (excerpt): ${plainText.slice(0, 3000)}

The student's existing tags: ${
      userTags.length ? userTags.map((t) => t.name).join(", ") : "(none yet)"
    }

Pick up to 3 short tags (1-3 words each, no punctuation) that best describe this note. Reuse an existing tag verbatim whenever it genuinely fits instead of creating a near-duplicate. Only propose a new tag when nothing existing fits. If nothing fits well, return fewer tags rather than forcing one.

Respond with a JSON array of strings only, e.g. ["recursion", "midterm review"]. Return [] if no tag is a good fit.`);

    const text = result.response.text().trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return;

    const parsed: unknown = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return;

    const seen = new Set<string>();
    const tagNames = parsed
      .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
      .map((t) => t.trim())
      .filter((t) => {
        const key = t.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 3);

    if (tagNames.length > 0) {
      await applyAutoTags(db, noteId, note.userId, tagNames);
    }
  } catch (error) {
    console.error("autoTagNote error:", error);
  }
}

/** True when a content save should schedule auto-tagging (mirrors convex/notes.ts updateNote). */
export function shouldScheduleAutoTag(args: {
  content?: string;
  wordCount?: number;
  tagIds?: string[];
  existingTagCount: number;
  autoTagAttempted: boolean;
}) {
  const hasExistingTags = (args.tagIds?.length ?? args.existingTagCount) > 0;
  return (
    args.content !== undefined &&
    !hasExistingTags &&
    !args.autoTagAttempted &&
    (args.wordCount ?? 0) >= 25
  );
}
