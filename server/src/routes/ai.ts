import type { GenerativeModel } from "@google/generative-ai";
import { Router } from "express";
import { z } from "zod";
import { buildDiagramData, type DiagramNodeInput } from "../ai/diagram.js";
import { enrichTranscript } from "../ai/enrichTranscript.js";
import { clientMessage } from "../ai/errors.js";
import { getGeminiModel } from "../ai/gemini.js";
import { needsDepthRepair, tryParseJson, wordCountFn } from "../ai/noteQuality.js";
import { CLARITY_RULES, getDepthRequirements, GROUNDING_RULES } from "../ai/notePrompts.js";
import { normalizeTranscriptForPrompt } from "../ai/transcript.js";
import { fetchReferenceUrlsForPrompt, normalizeReferenceUrlList } from "../ai/urlContent.js";
import type { Env } from "../env.js";
import { aiRateLimit } from "../middleware/ai-rate-limit.js";
import { currentUser } from "../middleware/user.js";
import type { Db } from "../db/client.js";
import { audioQuotaExhausted, MAX_TRANSCRIBE_BYTES } from "../recordings/usage.js";
import { isOwnedKey, type Storage } from "../storage/s3.js";
import { registerBit2Routes } from "../ai/registerBit2Routes.js";
import { parse } from "./validation.js";

/** Cap inline "previous notes" passed to Gemini (per request). Matches convex/ai.ts. */
const MAX_PREVIOUS_NOTES_CHARS = 100_000;

/**
 * Input caps for /api/v1/ai/*. Convex had no per-field cap (Convex's own
 * request size limit was the only ceiling); these mirror that same headroom
 * while keeping runaway Gemini spend bounded. Short text-op routes get the
 * tight cap; the transcript/generation routes need room for a full lecture
 * transcript, so they get the same 1 MB ceiling as a note body.
 */
const TEXT_OP_CHARS = 100_000;
const GENERATION_CHARS = 1_000_000;
/** Base64 image for formula extraction; body-level 10 MB cap is the real ceiling (app.ts). */
const IMAGE_BASE64_CHARS = 14_000_000;

type NoteSectionDraft = {
  id?: string;
  type?: "heading" | "paragraph" | "bullets" | "numbered" | "quote" | "divider";
  content?: string;
  level?: number;
};

type StructuredNotesDraft = {
  summary?: string;
  sections?: NoteSectionDraft[];
  actionItems?: unknown[];
  reviewQuestions?: unknown[];
  diagramNodes?: unknown[];
  diagramEdges?: unknown[];
};

/** Bit 3 (transcription/audio): types, prompts and parsing ported from convex/ai.ts. */
type CleanupMetadata = {
  fillerWordsRemoved: number;
  repetitionsMarked: number;
  emphasizedConcepts: string[];
  tangentsDetected: string[];
  mathExpressionsConverted: number;
  confidence: number;
};

type LectureSegment = {
  title: string;
  startCharIndex: number;
  endCharIndex: number;
  topics?: string[];
  importance?: "low" | "medium" | "high";
};

type LectureStructureResult = {
  segments: LectureSegment[];
  lectureFormat?: string;
  estimatedDuration?: string;
  hasQAndA?: boolean;
  keyTermsPerSegment?: Record<string, string[]>;
};

const defaultCleanupMetadata = (): CleanupMetadata => ({
  fillerWordsRemoved: 0,
  repetitionsMarked: 0,
  emphasizedConcepts: [],
  tangentsDetected: [],
  mathExpressionsConverted: 0,
  confidence: 0,
});

const extractJsonObject = (text: string): string | null => {
  const stripped = text
    .replace(/^```json?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const match = stripped.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
};

/**
 * Payment gateway is disabled product-wide — "TEMPORARY: All features are
 * free" in convex/ai.ts. Kept as a no-op stub for parity, not real tier logic.
 */
async function checkTierAccess(): Promise<{ allowed: true }> {
  return { allowed: true };
}

const cleanLectureTranscriptBody = z.object({
  transcript: z.string().max(GENERATION_CHARS),
  context: z.string().max(TEXT_OP_CHARS).optional(),
});

const detectLectureSegmentsBody = z.object({
  transcript: z.string().max(GENERATION_CHARS),
});

const extractFormulaBody = z.object({
  imageBase64: z.string().max(IMAGE_BASE64_CHARS),
  mimeType: z.string(),
  courseContext: z.string().max(TEXT_OP_CHARS).optional(),
});

const transcribeAudioBody = z.object({
  storageKey: z.string().min(1).max(1024),
  mimeType: z.string(),
  courseContext: z.string().max(TEXT_OP_CHARS).optional(),
});

/** Shared by /clean-lecture-transcript and transcribeAudio's internal cleanup pipeline. */
async function runCleanLectureTranscript(
  gemini: GenerativeModel,
  transcript: string,
  context: string | undefined,
): Promise<{ cleanedTranscript: string; metadata: CleanupMetadata }> {
  const prompt = `You are a lecture transcription cleaning specialist. Your job is to make raw lecture transcripts clean and ready for study materials.

TASK: Clean this lecture transcript intelligently while preserving ALL important meaning.

Raw transcript:
"""
${transcript}
"""

${context ? `Course/Topic: ${context}` : ""}

CLEANING INSTRUCTIONS:

1. **Filler Word Removal** - Remove filler words that add no value:
   - Remove: "um", "uh", "like", "you know", "basically", "sort of", "kind of", "right?", "okay?", "so like", "actually"
   - KEEP if it conveys meaning: "It's like a pump" (simile), "kind of similar to" (comparison)
   - KEEP emphatic uses: "Like, THIS is important"

2. **Mark Repetitions** - Professors repeat key concepts for emphasis:
   - First mention: Keep as is
   - Second mention: Append [REPEAT]
   - Third+ mention: Append [REPEAT X\${count}]
   - Example: "Mitochondria is the powerhouse. The mitochondria generates ATP [REPEAT]. Mitochondria, remember, is where energy is made [REPEAT X3]"

3. **Mark Emphasis** - When professor clearly emphasizes:
   - "This is IMPORTANT", "Pay attention", "Will be on exam", "Don't forget"
   - Mark the emphasized part with ⭐
   - Example: "⭐ The Krebs cycle is where most ATP is generated"

4. **Convert Spoken Math**:
   - "x squared" → $$x^2$$
   - "pi r squared" → $$\\pi r^2$$
   - "3 point 14159" → $$3.14159$$
   - "equals, approximately" → $$\\approx$$
   - Keep full expression together: "the equation is x squared plus 3x plus 2 equals 0" → "the equation is $$x^2 + 3x + 2 = 0$$"

5. **Fix Transcription Errors**:
   - Common mishears in lectures: "episilon" → "epsilon", "iterated" → "iterated", "sub optimal" → "suboptimal"
   - Context matters: In a math class, "pi" not "pie"
   - KEEP technical terms even if unusual: "leucine" not "lucene"

6. **Mark Tangents** - Professors often go off-topic:
   - Short aside (< 1 minute): Keep inline
   - Long tangent (> 1 minute): Wrap with [TANGENT START] ... [TANGENT END]
   - Common tangents: personal stories, historical context, related but not essential material

7. **Preserve Rhetorical Devices**:
   - Keep rhetorical questions: "How does ATP work? It's the energy currency..."
   - Keep examples and analogies
   - Keep transitions: "So what we see here is...", "Before we move on..."

8. **Clean Up Sentence Structure**:
   - Fix obvious false starts: "The cell is-actually, let me explain the mitochondria first" → "Let me explain the mitochondria first"
   - Keep interrupted thoughts if they're intentional: "Some students think-and I used to think-that mitochondria only make ATP"

RETURN EXACTLY THIS JSON (no markdown, no extras):

{
  "cleanedTranscript": "The cleaned transcript with all fixes applied",
  "metadata": {
    "fillerWordsRemoved": NUMBER,
    "repetitionsMarked": NUMBER,
    "emphasizedConcepts": ["concept1", "concept2"],
    "tangentsDetected": ["tangent1", "tangent2"],
    "mathExpressionsConverted": NUMBER,
    "confidence": 0.85
  },
  "summaryOfChanges": "Removed 12 filler words, marked 3 key concept repetitions, converted 5 equations, detected 1 tangent"
}

IMPORTANT:
- Only remove words that truly add no value
- When in doubt, KEEP the word
- Preserve the professor's voice and style
- Return ONLY the JSON, no explanation`;

  try {
    const result = await gemini.generateContent(prompt);
    const responseText = result.response.text().trim();
    const jsonText = extractJsonObject(responseText);
    if (!jsonText) {
      throw new Error("Failed to parse cleaning response");
    }
    const parsed = JSON.parse(jsonText);
    return {
      cleanedTranscript: parsed.cleanedTranscript || transcript,
      metadata: parsed.metadata || defaultCleanupMetadata(),
    };
  } catch (error) {
    console.error("[cleanLectureTranscript] error:", error);
    return { cleanedTranscript: transcript, metadata: defaultCleanupMetadata() };
  }
}

/** Shared by /detect-lecture-segments and transcribeAudio's internal cleanup pipeline. */
async function runDetectLectureSegments(gemini: GenerativeModel, transcript: string): Promise<LectureStructureResult> {
  const prompt = `Analyze this lecture transcript and identify its structure and segments.

Transcript (first 15,000 chars):
"""
${transcript.substring(0, 15000)}
"""

Identify major segments where the professor changes topics. Mark transitions like:
- "Alright, so let's move on to..."
- "Now we're going to discuss..."
- "Let me recap and then move on..."
- "Next topic..."
- "Before we finish, let me mention..."

Return JSON with segments:

{
  "segments": [
    {
      "title": "Introduction to Mitochondria",
      "startCharIndex": 0,
      "endCharIndex": 1200,
      "topics": ["definition", "location", "structure"],
      "importance": "high"
    }
  ],
  "lectureFormat": "traditional_lecture",
  "estimatedDuration": "50 minutes",
  "hasQAndA": false,
  "keyTermsPerSegment": {
    "Introduction to Mitochondria": ["mitochondrion", "organelle", "eukaryote"]
  }
}

Return ONLY valid JSON.`;

  try {
    const result = await gemini.generateContent(prompt);
    const responseText = result.response.text().trim();
    const jsonText = extractJsonObject(responseText);
    if (!jsonText) return { segments: [] };
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("[detectLectureSegments] error:", error);
    return { segments: [] };
  }
}

const refineTextBody = z.object({
  text: z.string().max(TEXT_OP_CHARS),
  style: z.string().optional(),
});

const simpleTextBody = z.object({
  text: z.string().max(TEXT_OP_CHARS),
});

const continueTextBody = z.object({
  text: z.string().max(TEXT_OP_CHARS),
  fullContext: z.string().max(TEXT_OP_CHARS).optional(),
});

const generateFlashcardsBody = z.object({
  text: z.string().max(TEXT_OP_CHARS),
  count: z.number().int().positive().optional(),
});

const askAboutContextBody = z.object({
  question: z.string().max(TEXT_OP_CHARS),
  context: z.string().max(TEXT_OP_CHARS),
  contextType: z.string().optional(),
});

const referenceUrls = z.array(z.string().max(2048)).max(20).optional();

const generateNotesFromTranscriptBody = z.object({
  transcript: z.string().max(GENERATION_CHARS),
  title: z.string().optional(),
});

const generateNotesStreamingTextBody = z.object({
  transcript: z.string().max(GENERATION_CHARS),
  title: z.string().optional(),
  codeBlocks: z.string().max(GENERATION_CHARS).optional(),
  previousNotesContent: z.string().max(GENERATION_CHARS).optional(),
  referenceUrls,
});

const generateStructuredNotesBody = z.object({
  transcript: z.string().max(GENERATION_CHARS),
  title: z.string().optional(),
  style: z.string().optional(),
  previousNotesContent: z.string().max(GENERATION_CHARS).optional(),
  referenceUrls,
});

/**
 * "Bit 1" of the AI port: text-editor ops and transcript-to-notes generation
 * from convex/ai.ts, ported behavior-for-behavior (same prompts, same model
 * config, same response shapes). generateNotesStreamingText never streamed
 * to the client on Convex either — it awaits the full Gemini stream
 * server-side and returns one JSON blob, same as here.
 */
export function createAiRouter(db: Db, env: Env, storage: Storage) {
  const router = Router();
  router.use(aiRateLimit(db));

  const model = (config?: { responseMimeType: string }) => getGeminiModel(env.GEMINI_API_KEY, config);

  router.post("/refine-text", async (req, res) => {
    const { text, style: styleArg } = parse(refineTextBody, req.body);
    const gemini = model();

    const styleInstructions: Record<string, string> = {
      academic: "Use formal academic language with proper citations format.",
      casual: "Keep it conversational and easy to read.",
      "bullet-points": "Structure the content as organized bullet points.",
      concise: "Make it as brief as possible while keeping key information.",
    };

    const style = styleArg || "academic";
    const styleGuide = styleInstructions[style] || "";

    const prompt = `You are an expert editor. Refine and improve the following text.
${styleGuide}

Rules:
- Fix grammar and spelling errors
- Improve clarity and flow
- Keep the original meaning intact
- Format appropriately for study notes

Text to refine:
"""
${text}
"""

Return ONLY the refined text, no explanations.`;

    const result = await gemini.generateContent(prompt);
    res.json({ text: result.response.text() });
  });

  router.post("/simplify-text", async (req, res) => {
    const { text } = parse(simpleTextBody, req.body);
    const gemini = model();

    const prompt = `Simplify the following text to make it easier to understand.
Keep the core meaning but use simpler vocabulary and shorter sentences.
Target a high school reading level.

Text to simplify:
"""
${text}
"""

Return ONLY the simplified text, no explanations.`;

    const result = await gemini.generateContent(prompt);
    res.json({ text: result.response.text() });
  });

  router.post("/expand-text", async (req, res) => {
    const { text } = parse(simpleTextBody, req.body);
    const gemini = model();

    const prompt = `Expand the following text with more detail and explanation.
Add examples, context, and clarification where helpful.
Keep the same topic but make it more comprehensive.

Text to expand:
"""
${text}
"""

Return ONLY the expanded text, no explanations or headers.`;

    const result = await gemini.generateContent(prompt);
    res.json({ text: result.response.text() });
  });

  router.post("/continue-text", async (req, res) => {
    const { text, fullContext } = parse(continueTextBody, req.body);
    const gemini = model();

    const contextNote = fullContext
      ? `\n\nFull note context for reference:\n"""\n${fullContext.substring(0, 2000)}\n"""`
      : "";

    const prompt = `Continue writing from where this text ends. Write 1-3 more sentences that naturally follow.
Match the style and topic of the existing text.${contextNote}

Text to continue from:
"""
${text}
"""

Return ONLY the continuation text (do not repeat the original), no explanations.`;

    const result = await gemini.generateContent(prompt);
    res.json({ text: result.response.text() });
  });

  router.post("/generate-flashcards", async (req, res) => {
    const { text, count: countArg } = parse(generateFlashcardsBody, req.body);
    const gemini = model();
    const count = countArg || 5;

    const prompt = `Generate ${count} flashcards from the following study content.

Content:
"""
${text}
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
      const result = await gemini.generateContent(prompt);
      const responseText = result.response.text().trim();
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      res.json(jsonMatch ? JSON.parse(jsonMatch[0]) : []);
    } catch (error) {
      console.error("generateFlashcards error:", error);
      res.json([]);
    }
  });

  router.post("/ask-about-context", async (req, res) => {
    const { question, context, contextType } = parse(askAboutContextBody, req.body);
    const gemini = model();

    const contextTypeLabel =
      contextType === "transcript" ? "lecture transcript" : contextType === "note" ? "study notes" : "content";

    const prompt = `You are Lumina AI, a helpful academic assistant for students.
Answer the following question based on the provided ${contextTypeLabel}.

Context:
"""
${context}
"""

Question: ${question}

Instructions:
- Answer based primarily on the provided context
- If the context doesn't contain enough information, say so
- Be concise but thorough
- Use examples from the context when helpful
- Format your response clearly with markdown if needed`;

    const result = await gemini.generateContent(prompt);
    res.json({ text: result.response.text() });
  });

  router.post("/analyze-chunk", async (req, res) => {
    const { text } = parse(simpleTextBody, req.body);
    const gemini = model();

    const prompt = `You are a real-time lecture assistant. Analyze the following spoken text chunk from a lecture.

Input:
"""
${text}
"""

Your task:
1. Identify 1-3 KEY TERMS or concepts and wrap them in **bold**.
2. Detect if the professor mentions anything important for exams (e.g., "this will be on the exam", "remember this", "important", "key point", "in conclusion"). Set "isImportant" to true if so.
3. Convert any spoken math expressions into proper LaTeX notation (e.g., "E equals m c squared" → "$$E = mc^2$$").
4. Return ONLY valid JSON in this exact format:

{
  "enhancedText": "The processed text with **bold concepts** and $$LaTeX$$ math",
  "isImportant": false,
  "concepts": ["concept1", "concept2"]
}

Rules:
- Keep the text natural and readable
- Don't over-bold - maximum 3 terms per chunk
- Only set isImportant if there's a clear exam/importance signal
- Return ONLY the JSON, no markdown code fences or explanation`;

    try {
      const result = await gemini.generateContent(prompt);
      const responseText = result.response.text().trim();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        res.json({
          enhancedText: parsed.enhancedText || text,
          isImportant: parsed.isImportant || false,
          concepts: parsed.concepts || [],
        });
        return;
      }
      res.json({ enhancedText: text, isImportant: false, concepts: [] });
    } catch (error) {
      console.error("analyzeChunk error:", error);
      res.json({ enhancedText: text, isImportant: false, concepts: [] });
    }
  });

  router.post("/generate-notes-from-transcript", async (req, res) => {
    const { transcript } = parse(generateNotesFromTranscriptBody, req.body);
    const gemini = model();
    const normalizedTranscript = normalizeTranscriptForPrompt(transcript);

    const prompt = `You are an expert academic note-taker. Convert the following lecture/recording transcript into well-structured study notes.

Transcript:
"""
${normalizedTranscript}
"""

Create comprehensive study notes with:
1. **Summary** - A brief overview (2-3 sentences)
2. **Key Concepts** - Main ideas and definitions
3. **Important Details** - Supporting information and examples
4. **Action Items** - Any tasks, assignments, or things to remember
5. **Questions to Review** - Key questions for self-testing

Format the output as clean markdown suitable for studying.`;

    const result = await gemini.generateContent(prompt);
    res.json({ text: result.response.text() });
  });

  router.post("/generate-notes-streaming-text", async (req, res) => {
    const { transcript, title, codeBlocks, previousNotesContent, referenceUrls: refUrls } = parse(
      generateNotesStreamingTextBody,
      req.body,
    );
    const gemini = model();
    const normalizedTranscript = normalizeTranscriptForPrompt(transcript);
    const referenceUrlsBlock = await fetchReferenceUrlsForPrompt(normalizeReferenceUrlList(refUrls));

    let enrichedTranscript = normalizedTranscript;
    if (codeBlocks) {
      try {
        const blocks = JSON.parse(codeBlocks);
        if (Array.isArray(blocks) && blocks.length > 0) {
          const codeSection = blocks
            .map((block: { label?: string; language: string; content: string }, i: number) => {
              const label = block.label ? ` (${block.label})` : "";
              return `--- Code Block ${i + 1}${label} [${block.language}] ---\n\`\`\`${block.language}\n${block.content}\n\`\`\``;
            })
            .join("\n\n");
          enrichedTranscript += `\n\n=== EXTRACTED CODE BLOCKS FROM LECTURE ===\n${codeSection}`;
        }
      } catch {
        // Ignore malformed codeBlocks JSON
      }
    }

    const titleContext = title ? `\nLecture Title: "${title}"` : "";
    const hasCodeBlocks = enrichedTranscript.includes("=== EXTRACTED CODE BLOCKS");

    const codeInstructions = hasCodeBlocks
      ? `\n6. **Code Examples** - Explain each extracted code block: what it does, key patterns used, and how it connects to the lecture concepts. Use proper markdown code fences.`
      : "";

    const prevStream = previousNotesContent?.trim();
    const revisionStream = prevStream
      ? `

REVISION MODE: The student already has notes from this session. Use the transcript as the source of truth. Improve the previous notes: add missing ideas from the transcript, correct errors, deepen thin sections, and reorganize if needed. Output a **full** polished markdown document (not a changelog).

Previous notes:
"""
${prevStream.slice(0, MAX_PREVIOUS_NOTES_CHARS)}
"""
`
      : "";

    const linkContextStream = referenceUrlsBlock.trim()
      ? `

=== Reference web pages (supplementary — enrich definitions and examples; the transcript remains primary) ===
${referenceUrlsBlock}
`
      : "";

    const prompt = `You are an expert academic note-taker. Convert the following lecture/recording transcript into well-structured, comprehensive study notes.${titleContext}

Transcript:
"""
${enrichedTranscript}
"""
${linkContextStream}${revisionStream}

Create detailed study notes with the following sections:
1. **Summary** - A concise overview (3-4 sentences capturing the key message)
2. **Key Concepts** - Main ideas, definitions, and theories with explanations
3. **Important Details** - Supporting information, examples, and illustrations
4. **Action Items** - Tasks, assignments, deadlines, or things to remember
5. **Questions to Review** - Key questions for self-testing and exam preparation${codeInstructions}

Requirements:
- Use clear markdown formatting with headers, bullet points, and bold/italic emphasis
- Be thorough — expand on concepts, don't just list keywords
- Include specific examples, numbers, and quotes from the transcript when available
- When reference web pages are provided above, weave in accurate details from them where they align with the lecture; do not invent facts not supported by the transcript or references
- Make notes self-contained: a student should understand the material from these notes alone
- Use LaTeX notation ($$...$$) for any mathematical formulas mentioned
- For any multi-line code, pseudocode, or file excerpts, use fenced markdown blocks (\`\`\`language ... \`\`\`) so they render as full code blocks, not inline backticks

Format the output as clean, well-organized markdown suitable for studying.`;

    // Use streaming API for faster first-byte-to-completion (server-side only —
    // the client still gets one JSON response, same as Convex).
    const streamResult = await gemini.generateContentStream(prompt);
    let fullText = "";
    for await (const chunk of streamResult.stream) {
      const chunkText = chunk.text();
      if (chunkText) fullText += chunkText;
    }

    res.json({ text: fullText });
  });

  router.post("/generate-structured-notes", async (req, res) => {
    const {
      transcript,
      title,
      style,
      previousNotesContent,
      referenceUrls: refUrls,
    } = parse(generateStructuredNotesBody, req.body);
    const gemini = model({ responseMimeType: "application/json" });
    const normalizedTranscript = normalizeTranscriptForPrompt(transcript);
    const referenceUrlsBlock = await fetchReferenceUrlsForPrompt(normalizeReferenceUrlList(refUrls));

    const fixJson = async (text: string) => {
      const fixPrompt = `Fix the following JSON. Return ONLY valid JSON with the same structure and content, no markdown.

JSON:
${text}`;
      const fixResult = await gemini.generateContent(fixPrompt);
      return fixResult.response.text().trim();
    };

    // Enrich the transcript if it's sparse/fragmented (common with browser speech recognition)
    const enrichedTranscript = await enrichTranscript(gemini, normalizedTranscript, title);

    const maybeRepairQuality = async (draft: unknown) => {
      const draftText = JSON.stringify(draft);
      const webRef =
        referenceUrlsBlock.trim().length > 0
          ? `\n\nSupplementary web pages (use for depth where relevant):\n${referenceUrlsBlock}\n`
          : "";
      const repairPrompt = `You are a quality assurance specialist improving generated lecture notes. The current notes are too shallow, vague, or repetitive.

Original transcript:
"""
${enrichedTranscript}
"""${webRef}

Current JSON (needs improvement):
${draftText}

Your task: Rewrite the shallow sections to be clearer and more substantive, using content that is actually grounded in the transcript above.

${GROUNDING_RULES}

${CLARITY_RULES}

Return JSON with EXACT keys:
{
  "summary": "A comprehensive summary sized to how much the transcript actually covers",
  "sections": [
    {"id": "unique-id", "type": "heading", "content": "Section Title", "level": 2},
    {"id": "unique-id", "type": "paragraph", "content": "Detailed explanation..."},
    {"id": "unique-id", "type": "bullets", "content": "• Key point 1\\n• Key point 2\\n• Key point 3"}
  ],
  "actionItems": ["..."],
  "reviewQuestions": ["..."],
  "diagramNodes": [{"label": "Central Topic", "kind": "concept"}, {"label": "Key Concept A", "kind": "topic"}, "..."],
  "diagramEdges": ["0-1: causes", "..."]
}

STRICT quality requirements:
- diagramNodes/diagramEdges: If present, index 0 is the root and MUST have kind "concept". Each node is either a plain string label or an object {"label": "...", "kind": "concept"|"topic"|"subtopic"|"note"}, where kind reflects importance to the material, not tree position. Edges are "sourceIndex-targetIndex" referencing valid node indices only, optionally suffixed with ":label" giving a short verb-phrase relationship (max 40 characters, e.g. "0-1: causes") — omit the label rather than emitting a vacuous one like "is related to". Keep labels concise for on-canvas display.
${getDepthRequirements(wordCountFn(enrichedTranscript))}
- Use bullet points for key ideas, important explanations, and lists
- Each section must follow: Concept introduction → Explanation → Example (from the transcript) → Significance
- NEVER use generic filler phrases like "this is important", "key concept", "students should understand"
- Every sentence must add NEW information — no repetition or padding. It is fine for notes to stay short if the source recording was short.
- When supplementary web pages are supplied, incorporate accurate details from them where they support the lecture; do not fabricate unsupported claims
- Return ONLY valid JSON`;

      const repairedResult = await gemini.generateContent(repairPrompt);
      const repairedText = repairedResult.response.text().trim();
      const parsedRepair = tryParseJson(repairedText);
      if (parsedRepair) return parsedRepair;

      const fixedRepairText = await fixJson(repairedText);
      return tryParseJson(fixedRepairText);
    };

    const previousTrimmed = previousNotesContent?.trim();
    const revisionBlock = previousTrimmed
      ? `

REVISION MODE — The student already has study notes from this same recording session. The transcript is the source of truth.

Previous notes (starting point — keep accurate structure and phrasing where still correct; expand thin sections; fix contradictions; reorganize if it helps clarity):
"""
${previousTrimmed.slice(0, MAX_PREVIOUS_NOTES_CHARS)}
"""

Produce a **complete** replacement in the required JSON format. Do not mention "previous notes" or this instruction in the output — only polished final study material.
`
      : "";

    const linkContextBlock = referenceUrlsBlock.trim()
      ? `

=== Reference web pages (supplementary — enrich definitions and examples; the transcript remains primary) ===
${referenceUrlsBlock}
`
      : "";

    let prompt = `You are a world-class academic note-taker and subject matter expert with deep knowledge across all university-level disciplines. You have years of experience transforming lecture recordings into comprehensive, exam-ready study materials that students rely on as their PRIMARY study resource.

Your goal: Create notes so thorough and detailed that a student who MISSED the lecture could study ONLY from your notes and still perform excellently on an exam.

Transcript:
"""
${enrichedTranscript}
"""
${linkContextBlock}${revisionBlock}
${title ? `Lecture Title/Topic: "${title}"` : ""}

CRITICAL CONTEXT: This transcript was captured via voice recording and may be fragmented or incomplete. You should:
- Reconstruct incomplete explanations into full, coherent sentences
- Use your subject matter expertise to explain the meaning and significance of concepts the transcript names — but only concepts it actually names
- Fill small connective gaps a listener would infer automatically, without adding new claims, examples, or numbers

${GROUNDING_RULES}

${CLARITY_RULES}`;

    if (style === "outline") {
      prompt += `\n\nFormat as a hierarchical outline with:
- Main topics as top-level items
- Sub-topics indented under main topics
- Key details as further nested items
- Use task items (checkboxes) for action items
- Maximum 4 levels of nesting

Generate a JSON response with this structure:
{
  "summary": "Brief overview of the lecture",
  "outlineHtml": "<ul><li>Main Topic 1<ul><li>Subtopic 1.1</li><li>Subtopic 1.2</li></ul></li><li>Main Topic 2...</li></ul>",
  "actionItems": ["Task 1", "Task 2"],
  "reviewQuestions": ["Question 1?", "Question 2?"]
}

Return as HTML with proper <ul>, <ol>, and task list structure using data-type="taskList" for checkboxes.
- Return ONLY valid JSON, no markdown code fences`;
    } else {
      prompt += `\n\nGenerate a JSON response with this EXACT structure (Notion-like section-based format). The example below shows the SHAPE only — the number of sections and their length must match how much the transcript actually covers, per the requirements below it:
{
  "summary": "A summary that: 1) Opens with a single clear sentence stating the EXACT main topic, 2) Explains WHY this topic matters, 3) Lists the key themes actually covered, 4) Highlights the most important points discussed, 5) Concludes with key takeaways — sized to how much the transcript covers, not padded to a fixed length.",
  "sections": [
    {"id": "sec-1", "type": "heading", "content": "Main Concept 1 Title", "level": 2},
    {"id": "sec-2", "type": "paragraph", "content": "Start with a precise definition. Explain the mechanism or process. Give a specific example FROM THE TRANSCRIPT with concrete details (numbers, names, formulas) if one was given. Explain why it matters."},
    {"id": "sec-3", "type": "bullets", "content": "• Key insight or important point from this section\\n• Another critical detail with specific example\\n• Third important takeaway or application"},
    {"id": "sec-4", "type": "heading", "content": "Main Concept 2 Title", "level": 2},
    {"id": "sec-5", "type": "paragraph", "content": "Continue the same pattern — definition, mechanism, transcript-grounded example, significance."}
  ],
  "actionItems": ["Specific task 1 with deadline if mentioned", "Task 2"],
  "reviewQuestions": [
    "Definition question: What is [concept] and what are its key characteristics?",
    "Mechanism question: Explain the process/mechanism of [concept] step by step.",
    "Application question: How would you apply [concept] to [specific real-world scenario]?",
    "Comparison question: Compare and contrast [concept A] with [concept B]. What are the key differences?",
    "Analysis question: Why does [phenomenon] occur? What factors contribute to it?"
  ],
  "diagramNodes": [
    {"label": "Central Topic", "kind": "concept"},
    {"label": "Key Concept A", "kind": "topic"},
    {"label": "Key Concept B", "kind": "topic"},
    {"label": "Sub-concept A1", "kind": "subtopic"}
  ],
  "diagramEdges": ["0-1: causes", "0-2: contrasts with", "1-3: example of"]
}

SECTION TYPES AVAILABLE:
- "heading": Section titles with level 1, 2, or 3 (like H1, H2, H3)
- "paragraph": Long-form text explanations
- "bullets": Bullet point lists (use \\n to separate items, prefix each with •)
- "numbered": Numbered lists (use \\n to separate items)
- "quote": Important quotes or key statements
- "divider": Visual separator between sections

MANDATORY QUALITY REQUIREMENTS:
${getDepthRequirements(wordCountFn(enrichedTranscript))}
- Each heading should be a specific term, concept name, or topic — NOT a vague phrase
- Bullets: Use for key points, important explanations, and lists of related items
- reviewQuestions: Create 3-7 varied questions spanning Bloom's taxonomy levels, scaled to how many distinct concepts the transcript actually covers
- diagramNodes: One label per distinct concept actually discussed (typically 4-10, max ~80 characters each). Each entry is EITHER a plain string label OR an object {"label": "...", "kind": "..."} where kind is one of "concept", "topic", "subtopic", "note". Index 0 MUST be the single central topic (root) for the mind map and MUST have kind "concept"; exactly one node may be "concept".
- diagramNodes kind: kind reflects IMPORTANCE TO THE MATERIAL, not tree position — a genuinely central idea several hops from the root is still "topic", never "note". kind is optional; omit it to fall back to depth-based styling.
- diagramEdges: Use "sourceIndex-targetIndex" with valid indices into diagramNodes, optionally followed by ":label" describing the relationship (e.g. "0-1: causes", "1-3: example of"). The bare "0-1" form is still valid. Build a tree or sparse DAG from the root: every node except index 0 must be reachable from node 0. No self-loops; avoid redundant duplicate connections between the same two nodes.
- diagramEdges labels: Short verb phrases for on-canvas display — max 40 characters, ideally 1-3 words, lowercase unless a proper noun, no newlines. Good: "causes", "depends on", "measured by", "contrasts with". Never write full sentences, and omit the label entirely rather than emitting a vacuous one like "is related to" or "connects to".
- actionItems: Only include explicitly mentioned tasks (empty array if none)
- Return ONLY valid JSON, no markdown code fences`;
    }

    try {
      const result = await gemini.generateContent(prompt);
      let responseText = result.response.text().trim();

      responseText = responseText.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "");

      let parsed: unknown = null;
      try {
        parsed = tryParseJson(responseText);
      } catch {
        parsed = null;
      }

      if (!parsed) {
        const fixedText = await fixJson(responseText);
        try {
          parsed = tryParseJson(fixedText);
        } catch {
          parsed = null;
        }
      }

      if (parsed) {
        let workingParsed: StructuredNotesDraft = parsed as StructuredNotesDraft;

        let normalizedSections = Array.isArray(workingParsed.sections)
          ? workingParsed.sections
              .map((section, idx: number) => ({
                id: section.id || `sec-${idx}`,
                type: section.type || "paragraph",
                content: String(section.content || "").trim(),
                level: section.level,
              }))
              .filter((section) => section.content.length > 0)
          : [];

        const needsRepair = needsDepthRepair(normalizedSections, wordCountFn(enrichedTranscript));

        if (needsRepair) {
          const repaired = await maybeRepairQuality(workingParsed);
          if (repaired) {
            workingParsed = repaired as StructuredNotesDraft;
            normalizedSections = Array.isArray(workingParsed.sections)
              ? workingParsed.sections
                  .map((section, idx: number) => ({
                    id: section.id || `sec-${idx}`,
                    type: section.type || "paragraph",
                    content: String(section.content || "").trim(),
                    level: section.level,
                  }))
                  .filter((section) => section.content.length > 0)
              : [];
          }
        }

        const diagramNodes: DiagramNodeInput[] = Array.isArray(workingParsed.diagramNodes)
          ? workingParsed.diagramNodes
              .map(
                (node: unknown): DiagramNodeInput =>
                  node !== null && typeof node === "object" ? (node as DiagramNodeInput) : String(node ?? "").trim(),
              )
              .filter((node: DiagramNodeInput) => typeof node !== "string" || node.length > 0)
          : [];
        const diagramEdges = Array.isArray(workingParsed.diagramEdges)
          ? workingParsed.diagramEdges
              .map((edge: unknown) => String(edge || "").trim())
              .filter((edge: string) => edge.length > 0)
          : [];

        const normalizedActionItems = Array.isArray(workingParsed.actionItems)
          ? workingParsed.actionItems.map((item: unknown) => String(item || "").trim()).filter((item: string) => item.length > 0)
          : [];
        const normalizedReviewQuestions = Array.isArray(workingParsed.reviewQuestions)
          ? workingParsed.reviewQuestions
              .map((question: unknown) => String(question || "").trim())
              .filter((question: string) => question.length > 0)
          : [];

        const diagramData = buildDiagramData(diagramNodes, diagramEdges);

        res.json({
          summary: workingParsed.summary || "",
          sections: normalizedSections,
          actionItems: normalizedActionItems,
          reviewQuestions: normalizedReviewQuestions,
          diagramData,
        });
        return;
      }

      res.json({
        summary: "Could not generate structured notes.",
        sections: [],
        actionItems: [],
        reviewQuestions: [],
        diagramData: undefined,
      });
    } catch (error) {
      console.error("generateStructuredNotes error:", error);
      res.json({
        summary: "Error generating structured notes.",
        sections: [],
        actionItems: [],
        reviewQuestions: [],
        diagramData: undefined,
      });
    }
  });

  /**
   * "Bit 3" of the AI port: transcription/audio. cleanLectureTranscript and
   * detectLectureSegments are pure text in/out; extractFormulaFromImage takes
   * an inline base64 image. transcribeAudio is the one with a real storage
   * dependency — Convex fetched the blob via ctx.storage.get(storageId); here
   * the client uploads the audio through the already-ported generic
   * /api/v1/uploads flow first and passes the resulting storageKey. Audio-minute
   * quota is enforced on /api/v1/recordings, not here — matching Convex, which
   * also does not check limits inside transcribeAudio itself.
   */
  router.post("/clean-lecture-transcript", async (req, res) => {
    const { transcript, context } = parse(cleanLectureTranscriptBody, req.body);
    const gemini = model({ responseMimeType: "application/json" });
    res.json(await runCleanLectureTranscript(gemini, transcript, context));
  });

  router.post("/detect-lecture-segments", async (req, res) => {
    const { transcript } = parse(detectLectureSegmentsBody, req.body);
    const gemini = model({ responseMimeType: "application/json" });
    res.json(await runDetectLectureSegments(gemini, transcript));
  });

  router.post("/extract-formula-from-image", async (req, res) => {
    const { imageBase64, mimeType } = parse(extractFormulaBody, req.body);
    await checkTierAccess(); // always allowed today; kept for parity with convex/ai.ts

    const gemini = model({ responseMimeType: "application/json" });
    const prompt = `You are an expert at recognizing mathematical formulas and equations from images.
Analyze this image and extract any mathematical formulas, equations, or expressions.

Convert all recognized formulas to valid LaTeX notation that can be rendered with KaTeX.

Return a JSON response with this exact structure:
{
  "latex": "The LaTeX representation of the formula(s)",
  "description": "A brief description of what the formula represents",
  "confidence": "high" | "medium" | "low",
  "multipleFormulas": false,
  "formulas": [] // If multiple formulas, list each separately with its own latex and description
}

Rules:
- Use standard LaTeX notation (\\frac, \\sqrt, \\sum, \\int, etc.)
- For display math, use $$ delimiters
- For inline math, use $ delimiters
- If the image contains multiple formulas, set multipleFormulas to true and list each in the formulas array
- If the formula is handwritten and hard to read, mention this in the description
- Set confidence based on image quality and clarity:
  - "high": Clear, printed formulas
  - "medium": Somewhat clear handwriting or partially visible formulas
  - "low": Unclear image or uncertain recognition
- If no formula is found, set latex to empty string and explain in description

Return ONLY valid JSON.`;

    try {
      const result = await gemini.generateContent([
        prompt,
        { inlineData: { mimeType, data: imageBase64 } },
      ]);
      const responseText = result.response.text().trim();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        res.json({ success: false, error: "Failed to parse formula recognition response" });
        return;
      }

      const data = JSON.parse(jsonMatch[0]) as {
        latex: string;
        description: string;
        confidence: "high" | "medium" | "low";
        multipleFormulas?: boolean;
        formulas?: Array<{ latex: string; description: string }>;
      };

      if (!data.latex && !data.multipleFormulas) {
        res.json({ success: false, error: data.description || "No formula detected in the image" });
        return;
      }

      let finalLatex = data.latex;
      if (data.multipleFormulas && data.formulas && data.formulas.length > 0) {
        finalLatex = data.formulas.map((f) => f.latex).join("\n\n");
      }

      res.json({ success: true, latex: finalLatex, description: data.description, confidence: data.confidence });
    } catch (error) {
      console.error("extractFormulaFromImage error:", error);
      res.json({
        success: false,
        error: clientMessage(error, "Failed to extract formula from image"),
      });
    }
  });

  router.post("/transcribe-audio", async (req, res) => {
    const { storageKey, mimeType, courseContext } = parse(transcribeAudioBody, req.body);
    const failure = (error: string) =>
      res.json({ transcript: "", duration: null, speakers: null, keyTopics: [], success: false, error });

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      failure("GEMINI_API_KEY environment variable not set");
      return;
    }

    const user = currentUser(res);
    if (!isOwnedKey(user.clerkUserId, storageKey)) {
      failure("Audio file not found in storage. It may have been deleted.");
      return;
    }
    const outOfMinutes = await audioQuotaExhausted(db, user.id);
    if (outOfMinutes) {
      failure(outOfMinutes);
      return;
    }

    try {
      const stat = await storage.stat(storageKey);
      if (!stat) {
        failure("Audio file not found in storage. It may have been deleted.");
        return;
      }

      if (stat.size > MAX_TRANSCRIBE_BYTES) {
        failure(`Audio file is too large (${(stat.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 50MB.`);
        return;
      }

      const bytes = await storage.getBytes(storageKey);
      const audioBase64 = Buffer.from(bytes).toString("base64");
      const gemini = model();

      const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> =>
        Promise.race([
          promise,
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs / 1000}s`)), timeoutMs),
          ),
        ]);

      const generateTranscription = async () => {
        const result = await withTimeout(
          gemini.generateContent([
            { inlineData: { mimeType, data: audioBase64 } },
            {
              text: `Transcribe this audio file completely and accurately.
Return the transcription as plain text.
If you detect timestamps or speaker changes, include them.
Focus on accuracy above all else.`,
            },
          ]),
          90_000,
        );
        return result.response.text().trim();
      };

      let responseText = "";
      let lastError: Error | null = null;
      const maxRetries = 3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          responseText = await generateTranscription();
          break;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          console.warn(`[transcribeAudio] Attempt ${attempt} failed:`, lastError.message);
          if (attempt < maxRetries) {
            const delay = 2 ** (attempt - 1) * 1000;
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      if (!responseText && lastError) {
        throw lastError;
      }

      let cleanedTranscript = responseText;
      let cleanupMetadata = defaultCleanupMetadata();
      let structureResult: LectureStructureResult = { segments: [] };

      try {
        const jsonModel = model({ responseMimeType: "application/json" });
        const cleanupResult = await runCleanLectureTranscript(jsonModel, responseText, courseContext);
        cleanedTranscript = cleanupResult.cleanedTranscript || cleanedTranscript;
        cleanupMetadata = cleanupResult.metadata || cleanupMetadata;

        const detectedStructure = await runDetectLectureSegments(jsonModel, cleanedTranscript);
        structureResult = detectedStructure?.segments ? detectedStructure : structureResult;
      } catch (cleanupError) {
        console.error("[transcribeAudio] Cleanup pipeline error:", cleanupError);
      }

      res.json({
        transcript: cleanedTranscript,
        duration: null,
        speakers: null,
        keyTopics: cleanupMetadata.emphasizedConcepts || [],
        processingMetadata: { cleaned: cleanupMetadata, structure: structureResult },
        success: true,
      });
    } catch (error) {
      console.error("[transcribeAudio] Full error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      let userFriendlyError = "Transcription failed";
      if (errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("quota")) {
        userFriendlyError = "API quota exceeded. Please try again later.";
      } else if (errorMessage.includes("RATE_LIMIT") || errorMessage.includes("429")) {
        userFriendlyError = "Too many requests. Please wait a moment and try again.";
      } else if (errorMessage.includes("INVALID_ARGUMENT")) {
        userFriendlyError = "Invalid audio format. Please try MP3, WAV, or M4A formats.";
      } else if (errorMessage.includes("couldn't be completed") || errorMessage.includes("completed")) {
        userFriendlyError = "The AI service is temporarily unavailable. Please try again in a few minutes.";
      } else if (errorMessage.includes("deadline") || errorMessage.includes("timeout")) {
        userFriendlyError = "Request timed out. The audio file may be too long. Try a shorter recording.";
      }

      failure(userFriendlyError);
    }
  });

  /** Bit 2: embeddings, document processing, semantic search, ingest flows. */
  registerBit2Routes(router, { db, env, storage, model });

  return router;
}
