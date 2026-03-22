"use node";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { ENRICHMENT_WORD_THRESHOLD } from "./transcript";

// Types for subscription tier checking
export type SubscriptionTier = "free" | "scholar" | "institution";

// Section type for flexible note structure
export type NoteSectionDraft = {
  id?: string;
  type?: "heading" | "paragraph" | "bullets" | "numbered" | "quote" | "divider";
  content?: string;
  level?: number;
};

export type StructuredNotesDraft = {
  summary?: string;
  sections?: NoteSectionDraft[];
  actionItems?: unknown[];
  reviewQuestions?: unknown[];
  diagramNodes?: unknown[];
  diagramEdges?: unknown[];
};

// TEMPORARY: All features are free - payment gateway disabled due to Paystack bug
export async function checkTierAccess(): Promise<{
  allowed: boolean;
  tier: SubscriptionTier;
  error?: string;
}> {
  return { allowed: true, tier: "scholar" as SubscriptionTier };
}

// Initialize Gemini client
export const getGeminiModel = (config?: { responseMimeType: string }) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable not set");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: config,
  });
};

/**
 * Enrich a sparse or fragmented transcript by using AI to reconstruct
 * a coherent, comprehensive narrative from the raw content.
 * This dramatically improves downstream note generation quality.
 */
export const enrichTranscript = async (
  model: any,
  normalizedTranscript: string,
  title?: string,
): Promise<string> => {
  const wordCount = normalizedTranscript.split(/\s+/).length;
  if (wordCount > ENRICHMENT_WORD_THRESHOLD) return normalizedTranscript;

  const enrichPrompt = `You are an expert lecture reconstruction assistant. The following transcript was captured from a live lecture recording using browser speech recognition, which often produces fragmented, incomplete sentences and misses context.

Your job is to reconstruct this into a coherent, comprehensive lecture narrative. You must:
1. Fix any fragmented or incomplete sentences into proper, full sentences
2. Infer and fill in likely context that speech recognition may have missed (transitions, linking phrases, elaborations)
3. Expand abbreviated or unclear references into full explanations
4. Maintain ALL original facts, concepts, examples, and terminology — do NOT remove or alter any factual content
5. Add logical connectors and transitions between ideas
6. If technical terms are mentioned, ensure they are properly contextualized

${title ? `Lecture Title/Topic: "${title}"` : ""}

Original fragmented transcript:
"""
${normalizedTranscript}
"""

Return ONLY the reconstructed, enriched transcript as plain text. Do not add any headers, labels, or meta-commentary. The output should read like a well-captured lecture transcript that a student could study from directly.`;

  try {
    const result = await model.generateContent(enrichPrompt);
    const enrichedText = result.response.text().trim();
    if (enrichedText.length > normalizedTranscript.length * 1.3) {
      return enrichedText;
    }
    return normalizedTranscript;
  } catch {
    return normalizedTranscript;
  }
};
