import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

/**
 * Ported from convex/ai.ts's `getGeminiModel`. Throws the same way Convex did
 * when the key is missing, since GEMINI_API_KEY is optional at boot (a route
 * that needs it fails loudly at call time instead of blocking the whole app).
 */
export const getGeminiModel = (
  apiKey: string | undefined,
  config?: { responseMimeType: string },
): GenerativeModel => {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable not set");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: config,
  });
};
