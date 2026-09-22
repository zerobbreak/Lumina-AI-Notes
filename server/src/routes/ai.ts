import { Router } from "express";
import { z } from "zod";
import { buildDiagramData, type DiagramNodeInput } from "../ai/diagram.js";
import { enrichTranscript } from "../ai/enrichTranscript.js";
import { getGeminiModel } from "../ai/gemini.js";
import { needsDepthRepair, tryParseJson, wordCountFn } from "../ai/noteQuality.js";
import { CLARITY_RULES, getDepthRequirements, GROUNDING_RULES } from "../ai/notePrompts.js";
import { normalizeTranscriptForPrompt } from "../ai/transcript.js";
import { fetchReferenceUrlsForPrompt, normalizeReferenceUrlList } from "../ai/urlContent.js";
import type { Env } from "../env.js";
import { aiRateLimit } from "../middleware/ai-rate-limit.js";
import type { Db } from "../db/client.js";
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
export function createAiRouter(db: Db, env: Env) {
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

  return router;
}
