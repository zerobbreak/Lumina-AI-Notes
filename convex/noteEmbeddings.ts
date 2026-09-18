"use node";

import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { embedTextForVectorSearch } from "./geminiEmbedding";
import { noteEmbeddingInput } from "./shared/noteEmbedding";

export const refresh = internalAction({
  args: {
    noteId: v.id("notes"),
    title: v.string(),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const isCurrent = await ctx.runQuery(
      internal.noteEmbeddingData.isCurrent,
      args,
    );
    if (!isCurrent) {
      return null;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Cannot refresh note embedding: GEMINI_API_KEY is not set");
      return null;
    }

    try {
      const embedding = await embedTextForVectorSearch(
        new GoogleGenerativeAI(apiKey),
        noteEmbeddingInput(args),
        TaskType.RETRIEVAL_DOCUMENT,
      );
      if (!embedding) {
        return null;
      }

      await ctx.runMutation(internal.noteEmbeddingData.storeIfCurrent, {
        ...args,
        embedding,
      });
    } catch (error) {
      console.error("Failed to refresh note embedding", error);
    }

    return null;
  },
});
