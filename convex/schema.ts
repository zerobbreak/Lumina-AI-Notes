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
              }),
            ),
          ),
        }),
      ),
    ),
    noteStyle: v.optional(v.string()), // "cornell" | "outline" | "mindmap"
    theme: v.optional(v.string()), // UI accent color preference (e.g., "indigo", "amber")
    enabledBlocks: v.optional(v.array(v.string())),
    // Subscription & Payment Fields
    subscriptionTier: v.optional(v.string()), // "free" | "scholar" | "institution"
    subscriptionStatus: v.optional(v.string()), // "active" | "cancelled" | "past_due" | "expired"
    paystackCustomerId: v.optional(v.string()),
    paystackSubscriptionCode: v.optional(v.string()),
    paystackAuthorizationCode: v.optional(v.string()), // For recurring charges
    subscriptionStartDate: v.optional(v.number()),
    subscriptionEndDate: v.optional(v.number()),
    // Usage Tracking Fields
    monthlyUsage: v.optional(
      v.object({
        audioMinutesUsed: v.number(),
        notesCreated: v.number(),
        lastResetDate: v.number(),
      }),
    ),
    // Study streaks & gamification
    currentStreak: v.optional(v.number()),
    longestStreak: v.optional(v.number()),
    lastStudiedDate: v.optional(v.number()), // local day start timestamp
    lastTimezoneOffsetMinutes: v.optional(v.number()),
    badges: v.optional(v.array(v.string())),
    dailyGoalMinutes: v.optional(v.number()),
    dailyGoalCards: v.optional(v.number()),
  })
    .index("by_tokenIdentifier", ["tokenIdentifier"])
    .index("by_email", ["email"])
    .index("by_paystackCustomerId", ["paystackCustomerId"]),

  notes: defineTable({
    userId: v.string(), // Storing tokenIdentifier for simplicity
    title: v.string(),
    content: v.optional(v.string()),
    noteType: v.optional(v.string()), // "quick" | "page" - Quick Notes vs Smart Folder Pages
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
    // Tags and Stats
    tagIds: v.optional(v.array(v.id("tags"))),
    wordCount: v.optional(v.number()),
    // Cornell Notes specific fields
    cornellCues: v.optional(v.string()),
    cornellNotes: v.optional(v.string()),
    cornellSummary: v.optional(v.string()),
    // Outline Mode specific fields
    outlineData: v.optional(v.string()), // JSON stringified tree structure
    outlineMetadata: v.optional(
      v.object({
        totalItems: v.number(),
        completedTasks: v.number(),
        collapsedNodes: v.array(v.string()), // IDs of collapsed nodes
      }),
    ),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_pinned", ["userId", "isPinned"])
    .index("by_userId_and_archived", ["userId", "isArchived"])
    .index("by_userId_and_noteType", ["userId", "noteType"])
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
    queuePosition: v.optional(v.number()),
    progressPercent: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
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
  })
    .index("by_userId", ["userId"])
    .index("by_userId_createdAt", ["userId", "createdAt"]),

  flashcardDecks: defineTable({
    userId: v.string(),
    title: v.string(),
    sourceNoteId: v.optional(v.id("notes")),
    courseId: v.optional(v.string()),
    cardCount: v.number(),
    createdAt: v.number(),
    lastStudiedAt: v.optional(v.number()),
    examDate: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["userId"],
    }),

  flashcards: defineTable({
    userId: v.optional(v.string()),
    deckId: v.id("flashcardDecks"),
    front: v.string(),
    back: v.string(),
    difficulty: v.optional(v.number()),
    nextReviewAt: v.optional(v.number()),
    reviewCount: v.optional(v.number()),
    lastReviewedAt: v.optional(v.number()),
    easeFactor: v.optional(v.number()),
    interval: v.optional(v.number()),
    repetitions: v.optional(v.number()),
    lastRating: v.optional(v.string()),
  })
    .index("by_deckId", ["deckId"])
    .index("by_userId", ["userId"])
    .index("by_userId_nextReviewAt", ["userId", "nextReviewAt"])
    .index("by_deckId_nextReviewAt", ["deckId", "nextReviewAt"]),

  flashcardReviewQueues: defineTable({
    userId: v.string(),
    date: v.number(),
    cardIds: v.array(v.id("flashcards")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_userId_date", ["userId", "date"]),

  flashcardReviewEvents: defineTable({
    userId: v.string(),
    deckId: v.id("flashcardDecks"),
    cardId: v.id("flashcards"),
    rating: v.string(), // "easy" | "medium" | "hard"
    reviewedAt: v.number(),
  })
    .index("by_userId_reviewedAt", ["userId", "reviewedAt"])
    .index("by_deckId_reviewedAt", ["deckId", "reviewedAt"]),

  quizDecks: defineTable({
    userId: v.string(),
    title: v.string(),
    sourceNoteId: v.optional(v.id("notes")),
    courseId: v.optional(v.string()),
    questionCount: v.number(),
    createdAt: v.number(),
    lastTakenAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["userId"],
    }),

  quizQuestions: defineTable({
    deckId: v.id("quizDecks"),
    question: v.string(),
    options: v.array(v.string()), // Array of 4 options
    correctAnswer: v.number(), // Index 0-3
    explanation: v.optional(v.string()),
    difficulty: v.optional(v.number()), // For future use
  }).index("by_deckId", ["deckId"]),

  quizResults: defineTable({
    deckId: v.id("quizDecks"),
    userId: v.string(),
    score: v.number(),
    totalQuestions: v.number(),
    answers: v.array(v.number()), // User's answers (indices)
    completedAt: v.number(),
    timeSpent: v.optional(v.number()), // For future use
  })
    .index("by_userId", ["userId"])
    .index("by_deckId", ["deckId"])
    .index("by_userId_and_deckId", ["userId", "deckId"])
    .index("by_userId_completedAt", ["userId", "completedAt"])
    .index("by_deckId_completedAt", ["deckId", "completedAt"]),

  documents: defineTable({
    storageId: v.string(),
    courseId: v.string(), // e.g., "REQ-001"
    text: v.string(),
    embedding: v.array(v.float64()),
  }).vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 768, // Match your Gemini embedding size
    filterFields: ["storageId", "courseId"], // <--- CRITICAL ADDITION
  }),

  // Real-time presence tracking for collaborative features
  presence: defineTable({
    noteId: v.id("notes"),
    userId: v.string(),
    userName: v.optional(v.string()),
    userImage: v.optional(v.string()),
    lastSeen: v.number(),
  })
    .index("by_noteId", ["noteId"])
    .index("by_userId_noteId", ["userId", "noteId"])
    .index("by_lastSeen", ["lastSeen"]),

  // Note collaboration: explicit collaborators + email-based invites
  noteCollaborators: defineTable({
    noteId: v.id("notes"),
    userId: v.string(), // tokenIdentifier of collaborator
    role: v.union(v.literal("viewer"), v.literal("editor")),
    addedAt: v.number(),
    addedBy: v.string(), // tokenIdentifier of inviter (usually owner)
  })
    .index("by_noteId", ["noteId"])
    .index("by_userId", ["userId"])
    .index("by_noteId_userId", ["noteId", "userId"])
    .index("by_userId_noteId", ["userId", "noteId"]),

  noteInvites: defineTable({
    noteId: v.id("notes"),
    email: v.string(), // normalized lowercase email
    role: v.union(v.literal("viewer"), v.literal("editor")),
    invitedBy: v.string(), // tokenIdentifier of inviter (usually owner)
    createdAt: v.number(),
    acceptedAt: v.optional(v.number()),
    acceptedBy: v.optional(v.string()), // tokenIdentifier of accepter
  })
    .index("by_noteId", ["noteId"])
    .index("by_email", ["email"])
    .index("by_noteId_email", ["noteId", "email"]),

  tags: defineTable({
    userId: v.string(),
    name: v.string(),
    color: v.string(), // Hex code or preset name
  })
    .index("by_userId", ["userId"])
    .index("by_userId_name", ["userId", "name"]),
});
