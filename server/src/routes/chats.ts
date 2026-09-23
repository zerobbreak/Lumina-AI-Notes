import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { generateAssistantReply } from "../ai/chatReply.js";
import { requireSessionOwner, toSessionResponse } from "../chats/helpers.js";
import type { Db } from "../db/client.js";
import { chatMessages, chatSessions, notes } from "../db/schema/index.js";
import { consumeAiQuota } from "../middleware/ai-rate-limit.js";
import { HttpError } from "../middleware/errors.js";
import { currentUser } from "../middleware/user.js";
import { parse } from "./validation.js";

const rowId = z.string().min(1).max(200);
const title = z.string().trim().min(1).max(500);
const chatMode = z.enum(["explain", "synthesize", "compare", "apply", "quiz", "fill_gaps"]);
// Assistant messages are only written by the server (see generateAssistantReply),
// so a client can't plant fake replies that get fed back into later prompts.
const chatRole = z.literal("user");

const createSessionBody = z.object({ title });
const setModeBody = z.object({ mode: chatMode });
const updateTitleBody = z.object({ title });
const pinBody = z.object({ noteIds: z.array(rowId).max(50) });
const sendMessageBody = z.object({
  role: chatRole,
  content: z.string().max(100_000),
  contextNoteIds: z.array(rowId).max(50).optional(),
});
const contextNotesBody = z.object({ noteIds: z.array(rowId).max(50) });
const replyBody = z.object({
  question: z.string().trim().min(1).max(10_000),
  contextNoteIds: z.array(rowId).max(50).optional(),
});

/** Port of convex/chats.ts + chatsAi.generateAssistantReply */
export function createChatsRouter(db: Db, geminiApiKey?: string) {
  const router = Router();

  router.get("/sessions", async (_req, res) => {
    const user = currentUser(res);
    const rows = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.userId, user.id))
      .orderBy(desc(chatSessions.updatedAt));
    res.json(rows.map(toSessionResponse));
  });

  router.post("/sessions", async (req, res) => {
    const user = currentUser(res);
    const { title: rawTitle } = parse(createSessionBody, req.body);
    const now = new Date();
    const [session] = await db
      .insert(chatSessions)
      .values({
        userId: user.id,
        title: rawTitle.trim().slice(0, 80) || "New Chat",
        pinnedNoteIds: [],
        mode: "explain",
        updatedAt: now,
      })
      .returning();
    res.status(201).json({ id: session!.id });
  });

  router.get("/sessions/:id", async (req, res) => {
    const user = currentUser(res);
    try {
      const session = await requireSessionOwner(db, req.params.id, user.id);
      res.json(toSessionResponse(session));
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) {
        res.json(null);
        return;
      }
      throw error;
    }
  });

  router.patch("/sessions/:id/mode", async (req, res) => {
    const user = currentUser(res);
    const { mode } = parse(setModeBody, req.body);
    await requireSessionOwner(db, req.params.id, user.id);
    await db
      .update(chatSessions)
      .set({ mode, updatedAt: new Date() })
      .where(eq(chatSessions.id, req.params.id));
    res.json({ updated: true });
  });

  router.patch("/sessions/:id/title", async (req, res) => {
    const user = currentUser(res);
    const { title: rawTitle } = parse(updateTitleBody, req.body);
    await requireSessionOwner(db, req.params.id, user.id);
    const nextTitle = rawTitle.trim().slice(0, 80) || "New Chat";
    await db
      .update(chatSessions)
      .set({ title: nextTitle, updatedAt: new Date() })
      .where(eq(chatSessions.id, req.params.id));
    res.json({ updated: true });
  });

  router.post("/sessions/:id/pin", async (req, res) => {
    const user = currentUser(res);
    const { noteIds } = parse(pinBody, req.body);
    const session = await requireSessionOwner(db, req.params.id, user.id);
    const existing = session.pinnedNoteIds ?? [];
    const nextSet = new Set(existing);

    const uniqueIds = [...new Set(noteIds)];
    if (uniqueIds.length > 0) {
      const owned = await db
        .select({ id: notes.id })
        .from(notes)
        .where(and(eq(notes.userId, user.id), inArray(notes.id, uniqueIds)));
      for (const n of owned) nextSet.add(n.id);
    }

    await db
      .update(chatSessions)
      .set({ pinnedNoteIds: [...nextSet], updatedAt: new Date() })
      .where(eq(chatSessions.id, req.params.id));
    res.json({ pinned: true });
  });

  router.delete("/sessions/:id/pin/:noteId", async (req, res) => {
    const user = currentUser(res);
    const session = await requireSessionOwner(db, req.params.id, user.id);
    const existing = session.pinnedNoteIds ?? [];
    await db
      .update(chatSessions)
      .set({
        pinnedNoteIds: existing.filter((id) => id !== req.params.noteId),
        updatedAt: new Date(),
      })
      .where(eq(chatSessions.id, req.params.id));
    res.json({ unpinned: true });
  });

  router.get("/sessions/:id/messages", async (req, res) => {
    const user = currentUser(res);
    try {
      await requireSessionOwner(db, req.params.id, user.id);
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) {
        res.json([]);
        return;
      }
      throw error;
    }

    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, req.params.id))
      .orderBy(asc(chatMessages.createdAt))
      .limit(300);

    const noteIds = new Set<string>();
    for (const msg of messages) {
      for (const id of msg.contextNoteIds ?? []) noteIds.add(id);
    }

    const noteDocs =
      noteIds.size > 0
        ? await db
            .select({ id: notes.id, title: notes.title, userId: notes.userId })
            .from(notes)
            .where(inArray(notes.id, [...noteIds]))
        : [];

    const notesById = new Map<string, { id: string; title: string }>();
    for (const n of noteDocs) {
      if (n.userId !== user.id) continue;
      notesById.set(n.id, { id: n.id, title: n.title });
    }

    res.json(
      messages.map((msg) => ({
        id: msg.id,
        sessionId: msg.sessionId,
        role: msg.role,
        content: msg.content,
        contextNoteIds: msg.contextNoteIds ?? [],
        createdAt: msg.createdAt.getTime(),
        notes: (msg.contextNoteIds ?? [])
          .map((id) => notesById.get(id))
          .filter((n): n is { id: string; title: string } => n !== undefined),
      })),
    );
  });

  router.post("/sessions/:id/messages", async (req, res) => {
    const user = currentUser(res);
    const body = parse(sendMessageBody, req.body);
    await requireSessionOwner(db, req.params.id, user.id);
    const now = new Date();
    await db.update(chatSessions).set({ updatedAt: now }).where(eq(chatSessions.id, req.params.id));
    const [message] = await db
      .insert(chatMessages)
      .values({
        sessionId: req.params.id,
        role: body.role,
        content: body.content.trim(),
        contextNoteIds: body.contextNoteIds,
      })
      .returning({ id: chatMessages.id });
    res.status(201).json({ id: message!.id });
  });

  router.post("/context-notes", async (req, res) => {
    const user = currentUser(res);
    const { noteIds } = parse(contextNotesBody, req.body);
    const uniqueIds = [...new Set(noteIds)];
    if (uniqueIds.length === 0) {
      res.json([]);
      return;
    }
    const rows = await db
      .select()
      .from(notes)
      .where(and(eq(notes.userId, user.id), inArray(notes.id, uniqueIds)));
    res.json(rows.map((d) => ({ id: d.id, title: d.title, content: d.content ?? "" })));
  });

  router.post("/sessions/:id/reply", async (req, res) => {
    const user = currentUser(res);
    const body = parse(replyBody, req.body);
    // 404 for someone else's session before it can cost anyone quota.
    await requireSessionOwner(db, req.params.id, user.id);
    await consumeAiQuota(db, user.id);
    try {
      const result = await generateAssistantReply(db, geminiApiKey, user.id, {
        sessionId: req.params.id,
        question: body.question,
        contextNoteIds: body.contextNoteIds,
      });
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate reply";
      if (message === "Chat session not found") {
        throw new HttpError(404, message, "not_found");
      }
      throw error;
    }
  });

  router.delete("/sessions/:id", async (req, res) => {
    const user = currentUser(res);
    await requireSessionOwner(db, req.params.id, user.id);
    await db.delete(chatMessages).where(eq(chatMessages.sessionId, req.params.id));
    await db.delete(chatSessions).where(eq(chatSessions.id, req.params.id));
    res.json({ deleted: true });
  });

  return router;
}
