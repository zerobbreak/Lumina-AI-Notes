import { and, desc, eq, ne } from "drizzle-orm";
import { Router } from "express";
import type { Db } from "../db/client.js";
import { notes } from "../db/schema/index.js";
import { buildKnowledgeGraph, MAX_NOTES } from "../knowledgeGraph/buildGraph.js";
import { currentUser } from "../middleware/user.js";

/** Port of convex/knowledgeGraph.ts */
export function createKnowledgeGraphRouter(db: Db) {
  const router = Router();

  router.get("/", async (_req, res) => {
    const user = currentUser(res);

    const rows = await db
      .select({
        id: notes.id,
        title: notes.title,
        content: notes.content,
        embedding: notes.embedding,
      })
      .from(notes)
      .where(and(eq(notes.userId, user.id), ne(notes.isArchived, true)))
      .orderBy(desc(notes.createdAt))
      .limit(MAX_NOTES);

    res.json(buildKnowledgeGraph(rows));
  });

  return router;
}
