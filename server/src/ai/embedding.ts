import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";

export const GEMINI_EMBEDDING_MODEL = "gemini-embedding-001";
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

/** Port of convex/geminiEmbedding.ts */
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
  const result = await model.embedContent({
    content: { role: "user", parts: [{ text: plain }] },
    taskType,
    outputDimensionality: EMBEDDING_VECTOR_DIMENSIONS,
  } as Parameters<typeof model.embedContent>[0]);
  return l2Normalize(result.embedding.values);
}
