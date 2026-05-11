import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";

/** Gemini API text embedding model (see https://ai.google.dev/gemini-api/docs/embeddings) */
export const GEMINI_EMBEDDING_MODEL = "gemini-embedding-001";

/** Must match Convex vector indexes in schema.ts */
export const EMBEDDING_VECTOR_DIMENSIONS = 768;

function l2Normalize(values: number[]): number[] {
  let sumSq = 0;
  for (const v of values) sumSq += v * v;
  const mag = Math.sqrt(sumSq);
  if (mag === 0) return values;
  return values.map((v) => v / mag);
}

export function getGeminiEmbeddingModel(genAI: GoogleGenerativeAI) {
  return genAI.getGenerativeModel({ model: GEMINI_EMBEDDING_MODEL });
}

/**
 * Embeddings for vector search. Use RETRIEVAL_DOCUMENT when indexing content;
 * RETRIEVAL_QUERY when embedding a search query (per Gemini task types).
 * Applies L2 normalization for 768-dim output as recommended in the embeddings docs.
 */
export async function embedTextForVectorSearch(
  genAI: GoogleGenerativeAI,
  text: string,
  taskType: TaskType,
): Promise<number[] | null> {
  const plain = text
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 8000);
  if (!plain) return null;

  const model = getGeminiEmbeddingModel(genAI);
  const request = {
    content: { role: "user" as const, parts: [{ text: plain }] },
    taskType,
    outputDimensionality: EMBEDDING_VECTOR_DIMENSIONS,
  };
  const result = await model.embedContent(request);
  const values = result.embedding.values;
  return l2Normalize(values);
}
