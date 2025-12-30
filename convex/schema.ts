import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    // Onboarding Fields
    onboardingComplete: v.optional(v.boolean()),
    major: v.optional(v.string()),
    semester: v.optional(v.string()),
    courses: v.optional(
      v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          code: v.string(),
          defaultNoteStyle: v.optional(v.string()), // e.g. "cornell", "outline", "mindmap"
          modules: v.optional(
            v.array(
              v.object({
                id: v.string(),
                title: v.string(),
              })
            )
          ),
        })
      )
    ),
    noteStyle: v.optional(v.string()), // "cornell" | "outline" | "mindmap"
    enabledBlocks: v.optional(v.array(v.string())),
  }).index("by_tokenIdentifier", ["tokenIdentifier"]),

  notes: defineTable({
    userId: v.string(), // Storing tokenIdentifier for simplicity
    title: v.string(),
    content: v.optional(v.string()),
    major: v.optional(v.string()),
    courseId: v.optional(v.string()),
    moduleId: v.optional(v.string()),
    parentNoteId: v.optional(v.id("notes")), // For nesting pages
    style: v.optional(v.string()), // Specific style for this note
    isPinned: v.optional(v.boolean()),
    isArchived: v.optional(v.boolean()),
    isShared: v.optional(v.boolean()),
    createdAt: v.number(),
    // Vector embedding for semantic search (768 dimensions for text-embedding-004)
    embedding: v.optional(v.array(v.float64())),
    // Linked source documents for citations
    linkedDocumentIds: v.optional(v.array(v.id("files"))),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_pinned", ["userId", "isPinned"])
    .index("by_userId_and_archived", ["userId", "isArchived"])
    .index("by_courseId", ["courseId"])
    .index("by_moduleId", ["moduleId"])
    .index("by_parentNoteId", ["parentNoteId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 768, // text-embedding-004 uses 768 dimensions
      filterFields: ["userId"],
    })
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["userId"],
    }),

  files: defineTable({
    userId: v.string(),
    name: v.string(),
    type: v.string(), // "pdf", "img", "link"
    url: v.optional(v.string()),
    storageId: v.optional(v.string()),
    courseId: v.optional(v.string()),
    createdAt: v.number(),
    // Document processing fields
    extractedText: v.optional(v.string()),
    summary: v.optional(v.string()),
    keyTopics: v.optional(v.array(v.string())),
    embedding: v.optional(v.array(v.float64())),
    processingStatus: v.optional(v.string()), // "pending" | "processing" | "done" | "error"
    processedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_processingStatus", ["processingStatus"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["userId"],
    })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 768,
      filterFields: ["userId"],
    }),

  recordings: defineTable({
    userId: v.string(),
    sessionId: v.string(),
    title: v.string(),
    transcript: v.string(),
    audioUrl: v.optional(v.string()),
    duration: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

  flashcardDecks: defineTable({
    userId: v.string(),
    title: v.string(),
    sourceNoteId: v.optional(v.id("notes")),
    courseId: v.optional(v.string()),
    cardCount: v.number(),
    createdAt: v.number(),
    lastStudiedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["userId"],
    }),

  flashcards: defineTable({
    deckId: v.id("flashcardDecks"),
    front: v.string(),
    back: v.string(),
    difficulty: v.optional(v.number()),
    nextReviewAt: v.optional(v.number()),
    reviewCount: v.optional(v.number()),
  }).index("by_deckId", ["deckId"]),
});
