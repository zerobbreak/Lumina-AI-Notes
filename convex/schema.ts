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
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_pinned", ["userId", "isPinned"])
    .index("by_userId_and_archived", ["userId", "isArchived"])
    .index("by_courseId", ["courseId"])
    .index("by_moduleId", ["moduleId"])
    .index("by_parentNoteId", ["parentNoteId"]),

  files: defineTable({
    userId: v.string(),
    name: v.string(),
    type: v.string(), // "pdf", "img", "link"
    url: v.optional(v.string()),
    storageId: v.optional(v.string()),
    courseId: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),
});
