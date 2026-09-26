import { GoogleGenerativeAI, type GenerationConfig, type GenerativeModel } from "@google/generative-ai";
import { recordAiUsage } from "./usageContext.js";

/**
 * Tried in order. gemini-2.5-flash is legacy (access limited to prior users)
 * and returns 503 under load, so the chain starts on the current stable Flash.
 * Override with GEMINI_MODELS, a comma-separated list.
 */
export const DEFAULT_GEMINI_MODELS = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite"];

export function parseGeminiModels(value: string | undefined): string[] {
  const models = (value ?? "")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
  return models.length > 0 ? models : DEFAULT_GEMINI_MODELS;
}

/** The part of GenerativeModel the app uses; what getGeminiModel returns. */
export type GeminiModel = Pick<GenerativeModel, "generateContent" | "generateContentStream">;

// Overloaded (503), rate limited or out of quota for that model (429), or the
// model name is gone (404): another model in the chain may still answer.
const FALLBACK_STATUSES = new Set([404, 429, 500, 503]);

export function shouldFallBack(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" && FALLBACK_STATUSES.has(status);
}

/**
 * Ported from convex/ai.ts's `getGeminiModel`. Throws the same way Convex did
 * when the key is missing, since GEMINI_API_KEY is optional at boot (a route
 * that needs it fails loudly at call time instead of blocking the whole app).
 *
 * Each call walks the model chain, moving on only for errors another model
 * could avoid; anything else (bad request, safety block) throws immediately.
 * A stream falls back only if it fails to start, not partway through.
 *
 * Every answered call records its token usage against the current request or
 * job (see usageContext.ts).
 */
export const getGeminiModel = (
  apiKey: string | undefined,
  config?: GenerationConfig,
  models: string[] = parseGeminiModels(process.env.GEMINI_MODELS),
): GeminiModel => {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable not set");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const chain = models.map((model) => genAI.getGenerativeModel({ model, generationConfig: config }));

  async function withFallback<T>(call: (model: GenerativeModel) => Promise<T>, onAnswer: (result: T, model: string) => void): Promise<T> {
    for (let i = 0; ; i++) {
      try {
        const result = await call(chain[i]);
        try {
          onAnswer(result, models[i]);
        } catch {
          // Usage tracking must never fail a call that already succeeded.
        }
        return result;
      } catch (error) {
        if (i === chain.length - 1 || !shouldFallBack(error)) throw error;
        console.warn(`[gemini] ${models[i]} unavailable, falling back to ${models[i + 1]}:`, (error as Error).message);
      }
    }
  }

  return {
    generateContent: (...args) =>
      withFallback(
        (model) => model.generateContent(...args),
        (result, model) => recordAiUsage(model, result.response?.usageMetadata),
      ),
    generateContentStream: (...args) =>
      withFallback(
        (model) => model.generateContentStream(...args),
        // Usage arrives with the last chunk; a stream that dies midway records nothing.
        (result, model) => {
          Promise.resolve(result.response)
            .then((response) => recordAiUsage(model, response?.usageMetadata))
            .catch(() => {});
        },
      ),
  };
};
