import { GoogleGenerativeAI, TaskType, type GenerativeModel } from "@google/generative-ai";
import { and, eq } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { files, type RecordingJobCheckpoint } from "../../db/schema/index.js";
import { buildDiagramData, type DiagramData, type DiagramNodeInput } from "../../ai/diagram.js";
import { embedTextForVectorSearch } from "../../ai/embedding.js";
import { enrichTranscript } from "../../ai/enrichTranscript.js";
import { enrichTranscriptForPinned } from "../../ai/enrichTranscriptForPinned.js";
import { UserFacingError } from "../../ai/errors.js";
import { RetryableError } from "../../queue/errors.js";
import { needsDepthRepair, tryParseJson, wordCountFn } from "../../ai/noteQuality.js";
import { CLARITY_RULES, getDepthRequirements, GROUNDING_RULES } from "../../ai/notePrompts.js";
import { normalizeTranscriptForPrompt } from "../../ai/transcript.js";
import { fetchReferenceUrlsForPrompt, normalizeReferenceUrlList } from "../../ai/urlContent.js";
import { searchDocumentsByEmbedding } from "../../search/vectorSearch.js";

/**
 * Transcript -> structured study notes, split into the stages the recording
 * job checkpoints: research, generate, validate. Moved from the old
 * POST /ai/generate-structured-notes and /ai/generate-from-pinned-audio
 * routes; the prompts are unchanged. Unlike those routes, failures throw, so
 * the job can retry them.
 */

export type Research = NonNullable<RecordingJobCheckpoint["research"]>;

export type NoteSection = {
  id: string;
  type: string;
  content: string;
  level?: number;
};

export type StructuredNotes = {
  summary: string;
  sections: NoteSection[];
  actionItems: string[];
  reviewQuestions: string[];
  diagramData?: DiagramData;
};

type Draft = {
  summary?: string;
  sections?: Array<{ id?: string; type?: string; content?: string; level?: number }>;
  actionItems?: unknown[];
  reviewQuestions?: unknown[];
  diagramNodes?: unknown[];
  diagramEdges?: unknown[];
};

export type NotesOptions = {
  title?: string;
  /** Set when a document was pinned: grounds the notes in it. */
  pinnedFileId?: string;
  referenceUrls?: string[];
};

export function geminiModels(apiKey: string | undefined) {
  if (!apiKey) {
    throw new UserFacingError("Note generation isn't configured on the server");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return {
    genAI,
    text: genAI.getGenerativeModel({ model: "gemini-2.5-flash" }),
    json: genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" },
    }),
  };
}

type Models = ReturnType<typeof geminiModels>;

/**
 * Gathers what the notes are grounded in: reference web pages, the pinned
 * document's most relevant chunks, and a reconstructed transcript when the
 * raw one is sparse.
 */
export async function research(
  db: Db,
  models: Models,
  userId: string,
  transcript: string,
  options: NotesOptions,
): Promise<Research> {
  const normalized = normalizeTranscriptForPrompt(transcript);
  const referenceUrlsBlock = await fetchReferenceUrlsForPrompt(normalizeReferenceUrlList(options.referenceUrls));

  if (!options.pinnedFileId) {
    const enrichedTranscript = await enrichTranscript(models.text, normalized, options.title);
    return { enrichedTranscript, referenceUrlsBlock, pinnedContext: "" };
  }

  const [file] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, options.pinnedFileId), eq(files.userId, userId)))
    .limit(1);
  if (!file) throw new UserFacingError("The pinned document was not found");

  let pinnedContext = "";
  const embedding = await embedTextForVectorSearch(models.genAI, normalized, TaskType.RETRIEVAL_QUERY);
  // Only uploads have chunks; a link file has no storageKey to scope the search to.
  if (embedding && file.storageKey) {
    const chunks = await searchDocumentsByEmbedding(db, embedding, 5, file.storageKey);
    pinnedContext = chunks.map((c) => c.text).join("\n\n---\n\n");
  }
  if (!pinnedContext && file.extractedText) {
    pinnedContext = file.extractedText.substring(0, 8000);
  }
  const enrichedTranscript = await enrichTranscriptForPinned(models.text, normalized, pinnedContext);
  return { enrichedTranscript, referenceUrlsBlock, pinnedContext };
}

/** First draft of the notes, as the model's JSON. */
export async function generateDraft(models: Models, found: Research, options: NotesOptions): Promise<Draft> {
  const prompt = options.pinnedFileId ? pinnedPrompt(found) : standardPrompt(found, options.title);
  const text = (await models.json.generateContent(prompt)).response.text().trim();
  const draft = await parseOrFix(models.json, text);
  if (!draft) {
    // Usually a truncated or chatty response; worth another attempt.
    throw new RetryableError("Gemini returned notes that aren't valid JSON");
  }
  return draft as Draft;
}

/**
 * Checks the draft is deep enough for how long the recording was, has the
 * model repair it once if not, and normalises it into StructuredNotes.
 */
export async function validateDraft(
  models: Models,
  found: Research,
  draft: Draft,
  options: NotesOptions,
): Promise<StructuredNotes> {
  const words = wordCountFn(found.enrichedTranscript);
  let working = draft;
  let sections = normalizeSections(working);

  if (needsDepthRepair(sections, words)) {
    const prompt = options.pinnedFileId
      ? `Improve shallow notes grounded in transcript and pinned document. Return same JSON schema.\n${JSON.stringify(working)}`
      : standardRepairPrompt(found, working);
    const text = (await models.json.generateContent(prompt)).response.text().trim();
    const repaired = (await parseOrFix(models.json, text)) as Draft | null;
    // A failed repair keeps the first draft: shallow notes beat none.
    if (repaired && Array.isArray(repaired.sections)) {
      working = { ...working, ...repaired };
      sections = normalizeSections(working);
    }
  }

  const diagramNodes: DiagramNodeInput[] = Array.isArray(working.diagramNodes)
    ? working.diagramNodes
        .map((node): DiagramNodeInput =>
          node !== null && typeof node === "object" ? (node as DiagramNodeInput) : String(node ?? "").trim(),
        )
        .filter((node) => typeof node !== "string" || node.length > 0)
    : [];
  const diagramEdges = strings(working.diagramEdges);

  const notes: StructuredNotes = {
    summary: typeof working.summary === "string" ? working.summary : "",
    sections,
    actionItems: strings(working.actionItems),
    reviewQuestions: strings(working.reviewQuestions),
    diagramData: buildDiagramData(diagramNodes, diagramEdges),
  };
  if (!notes.summary.trim() && notes.sections.length === 0) {
    throw new RetryableError("Gemini returned empty notes");
  }
  return notes;
}

function normalizeSections(draft: Draft): NoteSection[] {
  if (!Array.isArray(draft.sections)) return [];
  return draft.sections
    .map((section, idx) => ({
      id: section.id || `sec-${idx}`,
      type: section.type || "paragraph",
      content: String(section.content || "").trim(),
      level: section.level,
    }))
    .filter((section) => section.content.length > 0);
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.map((v) => String(v ?? "").trim()).filter(Boolean) : [];
}

async function parseOrFix(model: GenerativeModel, text: string): Promise<unknown> {
  const stripped = text.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "");
  const parsed = tryParseJson(stripped);
  if (parsed) return parsed;
  const fixed = await model.generateContent(
    `Fix the following JSON. Return ONLY valid JSON with the same structure and content, no markdown.\n\nJSON:\n${text}`,
  );
  return tryParseJson(fixed.response.text().trim());
}

function referenceSection(block: string) {
  return block.trim()
    ? `

=== Reference web pages (supplementary — enrich definitions and examples; the transcript remains primary) ===
${block}
`
    : "";
}

function standardPrompt(found: Research, title?: string) {
  const { enrichedTranscript } = found;
  return `You are a world-class academic note-taker and subject matter expert with deep knowledge across all university-level disciplines. You have years of experience transforming lecture recordings into comprehensive, exam-ready study materials that students rely on as their PRIMARY study resource.

Your goal: Create notes so thorough and detailed that a student who MISSED the lecture could study ONLY from your notes and still perform excellently on an exam.

Transcript:
"""
${enrichedTranscript}
"""
${referenceSection(found.referenceUrlsBlock)}
${title ? `Lecture Title/Topic: "${title}"` : ""}

CRITICAL CONTEXT: This transcript was captured via voice recording and may be fragmented or incomplete. You should:
- Reconstruct incomplete explanations into full, coherent sentences
- Use your subject matter expertise to explain the meaning and significance of concepts the transcript names — but only concepts it actually names
- Fill small connective gaps a listener would infer automatically, without adding new claims, examples, or numbers

${GROUNDING_RULES}

${CLARITY_RULES}

Generate a JSON response with this EXACT structure (Notion-like section-based format). The example below shows the SHAPE only — the number of sections and their length must match how much the transcript actually covers, per the requirements below it:
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

function standardRepairPrompt(found: Research, draft: Draft) {
  const webRef = found.referenceUrlsBlock.trim()
    ? `\n\nSupplementary web pages (use for depth where relevant):\n${found.referenceUrlsBlock}\n`
    : "";
  return `You are a quality assurance specialist improving generated lecture notes. The current notes are too shallow, vague, or repetitive.

Original transcript:
"""
${found.enrichedTranscript}
"""${webRef}

Current JSON (needs improvement):
${JSON.stringify(draft)}

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
${getDepthRequirements(wordCountFn(found.enrichedTranscript))}
- Use bullet points for key ideas, important explanations, and lists
- Each section must follow: Concept introduction → Explanation → Example (from the transcript) → Significance
- NEVER use generic filler phrases like "this is important", "key concept", "students should understand"
- Every sentence must add NEW information — no repetition or padding. It is fine for notes to stay short if the source recording was short.
- When supplementary web pages are supplied, incorporate accurate details from them where they support the lecture; do not fabricate unsupported claims
- Return ONLY valid JSON`;
}

function pinnedPrompt(found: Research) {
  const contextSection = found.pinnedContext
    ? `\n\nRelevant Context from Pinned Document:\n"""\n${found.pinnedContext}\n"""\n`
    : "";
  const webLinkSection = found.referenceUrlsBlock.trim()
    ? `\n\n=== Reference web pages ===\n${found.referenceUrlsBlock}\n`
    : "";
  return `You are a world-class academic note-taker. Create exam-ready structured notes.

Transcript:
"""
${found.enrichedTranscript}
"""
${contextSection}${webLinkSection}

${GROUNDING_RULES}
${CLARITY_RULES}

Return JSON with keys: summary, sections (array with id,type,content,level), actionItems, reviewQuestions, diagramNodes, diagramEdges.
${getDepthRequirements(wordCountFn(found.enrichedTranscript))}
Return ONLY valid JSON.`;
}
