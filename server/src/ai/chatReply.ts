import { and, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { chatMessages, chatSessions, notes } from "../db/schema/index.js";
import { getGeminiModel } from "./gemini.js";

type ContextNote = { id: string; title: string; content: string };
type RecentMessage = { role: "user" | "assistant"; content: string };
type ChatMode = "explain" | "synthesize" | "compare" | "apply" | "quiz" | "fill_gaps";

function formatContextNotesForPrompt(notesForPrompt: ContextNote[]) {
  if (notesForPrompt.length === 0) return "No notes were provided.";
  return notesForPrompt
    .map((n, i) => {
      const content = n.content.trim();
      const clipped = content.length > 6000 ? `${content.slice(0, 6000)}\n…` : content;
      return `[#${i + 1}] ${n.title}\n${clipped}`;
    })
    .join("\n\n---\n\n");
}

function modeInstructions(mode: ChatMode) {
  switch (mode) {
    case "explain":
      return `Return markdown with exactly these sections:
## 1) One-sentence definition
## 2) Intuition (2–4 bullets)
## 3) Worked example (use the notes’ example, or say what's missing)
## 4) Common pitfalls (3 bullets)
## 5) Exam/assignment takeaway (2 bullets)`;
    case "synthesize":
      return `Return markdown with:
## Cheat sheet
- 6–10 bullets (definitions + key relationships)
## Key takeaways
- 4 bullets
## Exam cues
- 3 bullets (what lecturers like to test, based on the notes)`;
    case "compare":
      return `Return markdown with:
## Comparison table
Make a table with columns: Aspect | A | B (use the terms from the question).
## How to tell them apart
- 4 short heuristics
## Typical question types
- 3 bullets (what you'd be asked to do with A vs B)`;
    case "apply":
      return `Return markdown with:
## Method (step-by-step)
1. …
## Worked example
Use numbers/terms from the notes if present; otherwise state what is missing and provide a skeleton example.
## Check your answer
- 3 bullets (sanity checks, common mistakes)`;
    case "quiz":
      return `Return markdown with:
## Quiz (answer first)
1. …
2. …
3. …
4. …
5. …

Then end with:
**Reply with your answers (1–5). I’ll grade you and show model answers.**

Do NOT grade yet in this message.`;
    case "fill_gaps":
      return `Return markdown with:
## What the notes cover
- 3 bullets
## What’s missing to answer confidently
- 5 bullets (specific missing definitions, examples, steps, assumptions)
## What to add
- 3 bullets (which note/doc to pin or what excerpt to paste)`;
    default:
      return `Answer the question using the notes.`;
  }
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * True while a chat still has a placeholder name: "New Chat", or the start of
 * the question it was created with (older clients named chats that way).
 */
export function shouldAutoTitle(title: unknown, question: string) {
  if (typeof title !== "string") return true;
  const t = title.trim().toLowerCase();
  if (t === "" || t.startsWith("new chat")) return true;
  return question.trim().toLowerCase().startsWith(t);
}

/** A readable title from the question itself, cut at a word boundary. */
export function titleFromQuestion(question: string, max = 42) {
  const q = question.replace(/\s+/g, " ").trim();
  if (q.length <= max) return q;
  const cut = q.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:!?-]+$/, "")}…`;
}

async function maybeGenerateSessionTitle(
  apiKey: string,
  args: { mode: ChatMode; question: string; contextNotes: ContextNote[] },
) {
  const q = args.question.trim();
  if (q.length < 8) return null;
  const noteTitles = args.contextNotes
    .slice(0, 6)
    .map((n, i) => `[#${i + 1}] ${n.title}`)
    .join(" | ");

  const prompt = `Create a short chat title (3–7 words) based on the student's question and the note titles.
Rules:
- No quotes, no punctuation at the end.
- Prefer a topic phrase, not a full sentence.
- If the mode is QUIZ, include the word "Quiz".
- Max 42 characters.

Mode: ${args.mode.toUpperCase()}
Question: ${q}
Notes: ${noteTitles || "None"}

Return ONLY the title.`;

  const model = getGeminiModel(apiKey);
  const result = await model.generateContent(prompt);
  const title = result.response.text().trim().replace(/^["']|["']$/g, "");
  const cleaned = title.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  return cleaned.length > 42 ? cleaned.slice(0, 42).trim() : cleaned;
}

async function getRecentMessages(db: Db, sessionId: string, limit: number): Promise<RecentMessage[]> {
  const rows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);
  return rows.reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
}

async function getContextNotes(db: Db, userId: string, noteIds: string[]): Promise<ContextNote[]> {
  const uniqueIds = [...new Set(noteIds)];
  if (uniqueIds.length === 0) return [];
  const rows = await db
    .select()
    .from(notes)
    .where(and(eq(notes.userId, userId), inArray(notes.id, uniqueIds)));
  // In the order asked for (pins first), which is how [#N] numbers them.
  const byId = new Map(rows.map((d) => [d.id, d]));
  return uniqueIds
    .map((id) => byId.get(id))
    .filter((d) => d !== undefined)
    .map((d) => ({ id: d.id, title: d.title, content: d.content ?? "" }));
}

/**
 * Saves a reply. `contextNoteIds` are the notes it was grounded in, in [#N]
 * order, so the client can turn each citation back into its note.
 */
async function insertAssistantMessage(db: Db, sessionId: string, content: string, contextNoteIds: string[]) {
  const now = new Date();
  await db.update(chatSessions).set({ updatedAt: now }).where(eq(chatSessions.id, sessionId));
  const [message] = await db
    .insert(chatMessages)
    .values({ sessionId, role: "assistant", content: content.trim(), contextNoteIds })
    .returning({ id: chatMessages.id });
  return message!.id;
}

/** Port of convex/chatsAi.generateAssistantReply */
export async function generateAssistantReply(
  db: Db,
  apiKey: string | undefined,
  userId: string,
  args: { sessionId: string; question: string; contextNoteIds?: string[] },
) {
  const [session] = await db
    .select()
    .from(chatSessions)
    .where(and(eq(chatSessions.id, args.sessionId), eq(chatSessions.userId, userId)))
    .limit(1);
  if (!session) throw new Error("Chat session not found");

  const mode = (session.mode ?? "explain") as ChatMode;
  const pinned = session.pinnedNoteIds ?? [];
  const noteIds = [...new Set([...pinned, ...(args.contextNoteIds ?? [])])];

  const recent = await getRecentMessages(db, args.sessionId, 20);
  const contextNotes = await getContextNotes(db, userId, noteIds);

  if (shouldAutoTitle(session.title, args.question)) {
    let title: string | null = null;
    if (apiKey) {
      try {
        title = await maybeGenerateSessionTitle(apiKey, {
          mode,
          question: args.question,
          contextNotes,
        });
      } catch {
        // Non-critical: title generation shouldn't block answering.
      }
    }
    // Without a generated title, name it after the question rather than
    // leaving "New Chat" or a mid-word cut.
    title ??= args.question.trim() ? titleFromQuestion(args.question) : null;
    if (title && title !== session.title) {
      await db
        .update(chatSessions)
        .set({ title: title.slice(0, 80), updatedAt: new Date() })
        .where(eq(chatSessions.id, args.sessionId));
    }
  }

  const notesWordCount = contextNotes.reduce((sum, n) => sum + wordCount(n.content || ""), 0);

  if (contextNotes.length === 0 || notesWordCount < 60) {
    const missing =
      contextNotes.length === 0
        ? `I don’t have any referenced notes to ground the answer.`
        : `The referenced notes look quite thin (${notesWordCount} words total), so I can't answer confidently without guessing.`;
    const reply = `${missing}

**What I need from you**
- Pin or mention the note(s) that contain the relevant definitions/examples, or paste a short excerpt.

**Quick checks**
- What course/topic is this for?
- What type of task is it (exam question, assignment prompt, essay, problem set)?

If you want, switch the mode (Explain / Synthesize / Compare / Apply / Quiz / Fill gaps) and I’ll respond in that format once there’s enough note context.`;

    const messageId = await insertAssistantMessage(db, args.sessionId, reply, contextNotes.map((n) => n.id));
    return { messageId, content: reply };
  }

  if (!apiKey) throw new Error("GEMINI_API_KEY environment variable not set");

  const prompt = `You are Lumina, a helpful study assistant inside a note-taking app.
Your job is to answer the student's question using the provided notes as the primary source of truth.

Rules:
- Use only the information present in the notes when stating specific facts.
- If the notes do not contain enough info, say what is missing and ask 1-2 clarifying questions.
- Be concise but complete. Prefer structured markdown (bullets, short sections).
- When you use information from a note, cite it inline using [#N] where N is the note number shown below.
- Do NOT invent citations. If you cannot cite a claim to a note, phrase it as a question or a suggestion to add that note.
- IMPORTANT: You must follow the mode template exactly (headings/sections). If the notes do not support a required section, write "Missing in notes: <what’s needed>" for that section.

Mode:
${mode.toUpperCase()} — ${modeInstructions(mode)}

Student question:
"""
${args.question.trim()}
"""

Conversation (most recent last):
${recent.map((m) => `- ${m.role.toUpperCase()}: ${m.content}`).join("\n")}

Notes:
${formatContextNotesForPrompt(contextNotes)}
`;

  const model = getGeminiModel(apiKey);
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const messageId = await insertAssistantMessage(db, args.sessionId, text, contextNotes.map((n) => n.id));
  return { messageId, content: text };
}
