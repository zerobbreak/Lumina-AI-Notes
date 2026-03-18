"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { getGeminiModel } from "./shared/aiClient";

/**
 * Simplify text - make it easier to understand
 */
export const simplifyText = action({
  args: {
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const model = getGeminiModel();

    const prompt = `Simplify the following text to make it easier to understand.
Keep the core meaning but use simpler vocabulary and shorter sentences.
Target a high school reading level.

Text to simplify:
"""
${args.text}
"""

Return ONLY the simplified text, no explanations.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  },
});

/**
 * Expand text - add more detail and explanation
 */
export const expandText = action({
  args: {
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const model = getGeminiModel();

    const prompt = `Expand the following text with more detail and explanation.
Add examples, context, and clarification where helpful.
Keep the same topic but make it more comprehensive.

Text to expand:
"""
${args.text}
"""

Return ONLY the expanded text, no explanations or headers.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  },
});

/**
 * Continue text - autocomplete from context
 */
export const continueText = action({
  args: {
    text: v.string(),
    fullContext: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const model = getGeminiModel();

    const contextNote = args.fullContext
      ? `\n\nFull note context for reference:\n"""\n${args.fullContext.substring(0, 2000)}\n"""`
      : "";

    const prompt = `Continue writing from where this text ends. Write 1-3 more sentences that naturally follow.
Match the style and topic of the existing text.${contextNote}

Text to continue from:
"""
${args.text}
"""

Return ONLY the continuation text (do not repeat the original), no explanations.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  },
});

/**
 * Generate flashcards from selected text
 */
export const generateFlashcards = action({
  args: {
    text: v.string(),
    count: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const model = getGeminiModel();
    const count = args.count || 5;

    const prompt = `Generate ${count} flashcards from the following study content.

Content:
"""
${args.text}
"""

Return a JSON array with this exact structure:
[
  {"front": "Question or term", "back": "Answer or definition"},
  {"front": "Question or term", "back": "Answer or definition"}
]

Rules:
- Create clear, concise questions
- Answers should be direct and memorable
- Mix different question types (definitions, concepts, applications)
- Return ONLY valid JSON, no markdown or explanation`;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();

      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return [];
    } catch (error) {
      console.error("generateFlashcards error:", error);
      return [];
    }
  },
});
