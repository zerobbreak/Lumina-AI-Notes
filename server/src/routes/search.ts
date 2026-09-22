import { and, desc, eq, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import type { Db } from "../db/client.js";
import {
  flashcardDecks,
  files,
  notes,
} from "../db/schema/index.js";
import { currentUser } from "../middleware/user.js";
import { noteIdsWithAllTags } from "../notes/tagFilters.js";
import { matchesSearch } from "../search/fullText.js";
import {
  buildKeywordSnippet,
  countKeywordHits,
  parseKeywords,
  stripHtmlToText,
} from "../search/keywordSearch.js";
import type { Storage } from "../storage/s3.js";
import { parse } from "./validation.js";

const DEFAULT_RESULT_LIMIT = 20;
const CONTENT_SCAN_LIMIT = 40;

const rowId = z.string().min(1).max(200);

const tagIdsQuery = z.preprocess((val) => {
  if (val === undefined || val === null || val === "") return undefined;
  if (Array.isArray(val)) return val;
  if (typeof val === "string") return val.split(",").map((s) => s.trim()).filter(Boolean);
  return val;
}, z.array(rowId).optional());

const searchQuery = z.object({
  query: z.string().trim().default(""),
  type: z.enum(["note", "file", "deck", "all"]).optional(),
  courseId: rowId.optional(),
  tagIds: tagIdsQuery,
});

const noteContentQuery = z.object({
  query: z.string().trim().default(""),
  limit: z.coerce.number().int().min(1).max(DEFAULT_RESULT_LIMIT).optional(),
});

const semanticQuery = z.object({
  query: z.string().trim().default(""),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export type SearchResult = {
  type: "note" | "file" | "deck";
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  icon?: string;
};

export type SearchResponse = {
  results: SearchResult[];
  limitReached: boolean;
  totalFound?: number;
};

export type KeywordMatch = {
  noteId: string;
  title: string;
  snippet: string;
  matchedKeywords: string[];
  url: string;
};

/** Port of convex/search.ts */
export function createSearchRouter(db: Db, storage: Storage) {
  const router = Router();

  async function fileUrl(file: { storageKey: string | null; name: string; url: string | null }) {
    if (file.storageKey) {
      return storage.createDownloadUrl(file.storageKey, file.name);
    }
    return file.url ?? "#";
  }

  // search
  router.get("/", async (req, res) => {
    const user = currentUser(res);
    const args = parse(searchQuery, req.query);

    if (!args.query) {
      res.json({ results: [], limitReached: false } satisfies SearchResponse);
      return;
    }

    const resultLimit = DEFAULT_RESULT_LIMIT;
    const searchType = args.type ?? "all";
    const results: SearchResult[] = [];
    let totalFound = 0;

    if (searchType === "all" || searchType === "note") {
      const fetchLimit = args.tagIds && args.tagIds.length > 0 ? 50 : resultLimit + 5;
      const noteRows = await db
        .select({
          id: notes.id,
          title: notes.title,
          isPinned: notes.isPinned,
        })
        .from(notes)
        .where(
          and(
            eq(notes.userId, user.id),
            eq(notes.isArchived, false),
            matchesSearch(notes.searchTitle, args.query),
          ),
        )
        .orderBy(desc(sql`ts_rank(${notes.searchTitle}, websearch_to_tsquery('english', ${args.query}))`))
        .limit(fetchLimit);

      let filteredNotes = noteRows;
      if (args.tagIds && args.tagIds.length > 0) {
        const allowed = await noteIdsWithAllTags(db, user.id, args.tagIds);
        filteredNotes = noteRows.filter((n) => allowed.has(n.id));
      }

      totalFound += filteredNotes.length;

      for (const note of filteredNotes.slice(0, resultLimit)) {
        results.push({
          type: "note",
          id: note.id,
          title: note.title,
          subtitle: note.isPinned ? "📌 Pinned Note" : "Note",
          url: `/dashboard?noteId=${note.id}`,
        });
      }
    }

    if (args.tagIds && args.tagIds.length > 0) {
      const limitReached = totalFound > results.length;
      res.json({
        results,
        limitReached,
        totalFound: limitReached ? totalFound : undefined,
      } satisfies SearchResponse);
      return;
    }

    if (searchType === "all" || searchType === "file") {
      const fileRows = await db
        .select({
          id: files.id,
          name: files.name,
          type: files.type,
          url: files.url,
          storageKey: files.storageKey,
        })
        .from(files)
        .where(and(eq(files.userId, user.id), matchesSearch(files.searchName, args.query)))
        .orderBy(desc(sql`ts_rank(${files.searchName}, websearch_to_tsquery('english', ${args.query}))`))
        .limit(resultLimit + 5);

      totalFound += fileRows.length;

      for (const file of fileRows.slice(0, resultLimit)) {
        results.push({
          type: "file",
          id: file.id,
          title: file.name,
          subtitle: file.type.toUpperCase(),
          url: await fileUrl(file),
        });
      }
    }

    if (searchType === "all" || searchType === "deck") {
      const deckRows = await db
        .select({
          id: flashcardDecks.id,
          title: flashcardDecks.title,
          cardCount: flashcardDecks.cardCount,
        })
        .from(flashcardDecks)
        .where(and(eq(flashcardDecks.userId, user.id), matchesSearch(flashcardDecks.searchTitle, args.query)))
        .orderBy(
          desc(sql`ts_rank(${flashcardDecks.searchTitle}, websearch_to_tsquery('english', ${args.query}))`),
        )
        .limit(resultLimit + 5);

      totalFound += deckRows.length;

      for (const deck of deckRows.slice(0, resultLimit)) {
        results.push({
          type: "deck",
          id: deck.id,
          title: deck.title,
          subtitle: `Flashcards • ${deck.cardCount} cards`,
          url: `/dashboard?view=flashcards&deckId=${deck.id}`,
        });
      }
    }

    const limitReached = totalFound > results.length;
    res.json({
      results,
      limitReached,
      totalFound: limitReached ? totalFound : undefined,
    } satisfies SearchResponse);
  });

  // searchNoteContent
  router.get("/note-content", async (req, res) => {
    const user = currentUser(res);
    const args = parse(noteContentQuery, req.query);
    const keywords = parseKeywords(args.query);
    if (keywords.length === 0) {
      res.json({ matches: [] });
      return;
    }

    const limit = Math.min(args.limit ?? 6, DEFAULT_RESULT_LIMIT);
    const candidates = await db
      .select({
        id: notes.id,
        title: notes.title,
        content: notes.content,
      })
      .from(notes)
      .where(
        and(
          eq(notes.userId, user.id),
          eq(notes.isArchived, false),
          matchesSearch(notes.searchContent, args.query),
        ),
      )
      .orderBy(desc(sql`ts_rank(${notes.searchContent}, websearch_to_tsquery('english', ${args.query}))`))
      .limit(CONTENT_SCAN_LIMIT);

    const scored: Array<{ hits: number; match: KeywordMatch }> = [];

    for (const note of candidates) {
      const text = stripHtmlToText(note.content ?? "");
      if (!text) continue;

      const hits = countKeywordHits(text, keywords);
      if (hits === 0) continue;

      scored.push({
        hits,
        match: {
          noteId: note.id,
          title: note.title,
          snippet: buildKeywordSnippet(text, keywords),
          matchedKeywords: keywords.filter((k) => text.toLowerCase().includes(k)),
          url: `/dashboard?noteId=${note.id}`,
        },
      });
    }

    scored.sort((a, b) => b.hits - a.hits);
    res.json({ matches: scored.slice(0, limit).map((s) => s.match) });
  });

  // semanticSearch — stub; real semantic search lives in ai.ts actions.
  router.get("/semantic", async (req, res) => {
    const args = parse(semanticQuery, req.query);
    if (!args.query) {
      res.json({ results: [], limited: false, maxResults: args.limit ?? 10 });
      return;
    }

    res.json({
      results: [],
      limited: false,
      maxResults: args.limit ?? 10,
    });
  });

  return router;
}
