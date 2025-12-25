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
        })
      )
    ),
    noteStyle: v.optional(v.string()), // "cornell" | "outline" | "mindmap"
    enabledBlocks: v.optional(v.array(v.string())),
  }).index("by_tokenIdentifier", ["tokenIdentifier"]),
});
