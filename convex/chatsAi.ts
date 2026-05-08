"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { getGeminiModel } from "./shared/aiClient";
import type { Id } from "./_generated/dataModel";

type ContextNote = { id: Id<"notes">; title: string; content: string };
type RecentMessage = { role: "user" | "assistant"; content: string };
type ChatMode =
  | "explain"
  | "synthesize"
  | "compare"
  | "apply"
  | "quiz"
  | "fill_gaps";

type GenerateAssistantReplyResult = {
  messageId: Id<"chatMessages">;
  content: string;
};

function formatContextNotesForPrompt(notes: ContextNote[]) {
  if (notes.length === 0) return "No notes were provided.";
  return notes
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

export const generateAssistantReply: ReturnType<typeof action> = action({
  args: {
    sessionId: v.id("chatSessions"),
    question: v.string(),
    contextNoteIds: v.optional(v.array(v.id("notes"))),
  },
  handler: async (ctx, args): Promise<GenerateAssistantReplyResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const session = await ctx.runQuery(api.chats.getSession, {
      sessionId: args.sessionId,
    });
    if (!session) throw new Error("Chat session not found");

    const mode = (session.mode ?? "explain") as ChatMode;
    const pinned = Array.isArray(session.pinnedNoteIds)
      ? (session.pinnedNoteIds as Id<"notes">[])
      : [];
    const ephemeral = (args.contextNoteIds ?? []) as Id<"notes">[];
    const noteIds = Array.from(new Set([...pinned, ...ephemeral]));

    const recent = (await ctx.runQuery(api.chats.getRecentMessages, {
      sessionId: args.sessionId,
      limit: 20,
    })) as RecentMessage[];

    const contextNotes = await ctx.runQuery(api.chats.getContextNotes, {
      noteIds,
    });

    const notesWordCount = contextNotes.reduce(
      (sum: number, n: ContextNote) => sum + wordCount(n.content || ""),
      0,
    );

    // Grounded-first fallback: if notes are thin, ask for missing info instead of guessing.
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

      const messageId: Id<"chatMessages"> = await ctx.runMutation(
        api.chats.sendMessage,
        {
          sessionId: args.sessionId,
          role: "assistant",
          content: reply,
        },
      );
      return { messageId, content: reply };
    }

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
${recent
  .map((m) => `- ${m.role.toUpperCase()}: ${m.content}`)
  .join("\n")}

Notes:
${formatContextNotesForPrompt(contextNotes)}
`;

    const model = getGeminiModel();
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const messageId: Id<"chatMessages"> = await ctx.runMutation(
      api.chats.sendMessage,
      {
      sessionId: args.sessionId,
      role: "assistant",
      content: text,
      },
    );

    return { messageId, content: text };
  },
});

