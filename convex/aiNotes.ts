"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import {
  TranscriptChunkInput,
  normalizeTranscriptForPrompt,
} from "./shared/transcript";
import {
  tryParseJson,
  sentenceCount,
  wordCountFn,
  noteLacksDepth,
} from "./shared/noteQuality";
import { buildDiagramData } from "./shared/diagram";
import {
  getGeminiModel,
  enrichTranscript,
  StructuredNotesDraft,
} from "./shared/aiClient";
import { api } from "./_generated/api";

/**
 * Refine and improve text - make it cleaner, more structured, and professional
 */
export const refineText = action({
  args: {
    text: v.string(),
    style: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const model = getGeminiModel();

    const styleInstructions = {
      academic: "Use formal academic language with proper citations format.",
      casual: "Keep it conversational and easy to read.",
      "bullet-points": "Structure the content as organized bullet points.",
      concise: "Make it as brief as possible while keeping key information.",
    };

    const style = args.style || "academic";
    const styleGuide =
      styleInstructions[style as keyof typeof styleInstructions] || "";

    const prompt = `You are an expert editor. Refine and improve the following text.
${styleGuide}

Rules:
- Fix grammar and spelling errors
- Improve clarity and flow
- Keep the original meaning intact
- Format appropriately for study notes

Text to refine:
"""
${args.text}
"""

Return ONLY the refined text, no explanations.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  },
});

/**
 * Generate structured study notes from a transcript
 */
export const generateNotesFromTranscript = action({
  args: {
    transcript: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const model = getGeminiModel();
    const normalizedTranscript = normalizeTranscriptForPrompt(args.transcript);

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

    const result = await model.generateContent(prompt);
    return result.response.text();
  },
});

/**
 * Generate notes from transcript using streaming API for faster response.
 * Accumulates all chunks server-side and returns the full markdown text.
 * The frontend animates the reveal for a streaming UX.
 *
 * Optionally accepts extracted code blocks to enrich the transcript context.
 */
export const generateNotesStreamingText = action({
  args: {
    transcript: v.string(),
    title: v.optional(v.string()),
    codeBlocks: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const model = getGeminiModel();
    const normalizedTranscript = normalizeTranscriptForPrompt(args.transcript);

    // Build enriched transcript with code blocks if provided
    let enrichedTranscript = normalizedTranscript;
    if (args.codeBlocks) {
      try {
        const blocks = JSON.parse(args.codeBlocks);
        if (Array.isArray(blocks) && blocks.length > 0) {
          const codeSection = blocks
            .map(
              (
                block: { label?: string; language: string; content: string },
                i: number,
              ) => {
                const label = block.label ? ` (${block.label})` : "";
                return `--- Code Block ${i + 1}${label} [${block.language}] ---\n\`\`\`${block.language}\n${block.content}\n\`\`\``;
              },
            )
            .join("\n\n");
          enrichedTranscript += `\n\n=== EXTRACTED CODE BLOCKS FROM LECTURE ===\n${codeSection}`;
        }
      } catch {
        // Ignore malformed codeBlocks JSON
      }
    }

    const titleContext = args.title ? `\nLecture Title: "${args.title}"` : "";
    const hasCodeBlocks = enrichedTranscript.includes(
      "=== EXTRACTED CODE BLOCKS",
    );

    const codeInstructions = hasCodeBlocks
      ? `\n6. **Code Examples** - Explain each extracted code block: what it does, key patterns used, and how it connects to the lecture concepts. Use proper markdown code fences.`
      : "";

    const prompt = `You are an expert academic note-taker. Convert the following lecture/recording transcript into well-structured, comprehensive study notes.${titleContext}

Transcript:
"""
${enrichedTranscript}
"""

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
- Make notes self-contained: a student should understand the material from these notes alone
- Use LaTeX notation ($$...$$) for any mathematical formulas mentioned

Format the output as clean, well-organized markdown suitable for studying.`;

    // Use streaming API for faster first-byte-to-completion
    const streamResult = await model.generateContentStream(prompt);
    let fullText = "";
    for await (const chunk of streamResult.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        fullText += chunkText;
      }
    }

    return fullText;
  },
});

/**
 * Generate structured notes from transcript with section-based format (Notion-like)
 * Returns JSON instead of plain text for programmatic editor insertion
 */
export const generateStructuredNotes = action({
  args: {
    transcript: v.string(),
    title: v.optional(v.string()),
    style: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const model = getGeminiModel({ responseMimeType: "application/json" });
    const normalizedTranscript = normalizeTranscriptForPrompt(args.transcript);

    const fixJson = async (text: string) => {
      const fixPrompt = `Fix the following JSON. Return ONLY valid JSON with the same structure and content, no markdown.

JSON:
${text}`;
      const fixResult = await model.generateContent(fixPrompt);
      return fixResult.response.text().trim();
    };

    const maybeRepairQuality = async (draft: unknown) => {
      const draftText = JSON.stringify(draft);
      const repairPrompt = `You are a quality assurance specialist improving generated lecture notes. The current notes are too shallow and lack substantive content.

Original transcript:
"""
${enrichedTranscript}
"""

Current JSON (needs improvement):
${draftText}

Your task: Rewrite ALL sections to be substantially more detailed and informative. Each section must provide thorough coverage of its topic.

Return JSON with EXACT keys:
{
  "summary": "5-8 sentence comprehensive summary",
  "sections": [
    {"id": "unique-id", "type": "heading", "content": "Section Title", "level": 2},
    {"id": "unique-id", "type": "paragraph", "content": "Detailed explanation..."},
    {"id": "unique-id", "type": "bullets", "content": "• Key point 1\\n• Key point 2\\n• Key point 3"}
  ],
  "actionItems": ["..."],
  "reviewQuestions": ["..."],
  "diagramNodes": ["..."],
  "diagramEdges": ["..."]
}

STRICT quality requirements:
- diagramNodes/diagramEdges: If present, index 0 is the root; edges must reference valid node indices only; keep labels concise for on-canvas display.
- 6-10 content sections with clear headings
- Each paragraph MUST be 5-8 sentences (80-120 words minimum)
- Use bullet points for key ideas, important explanations, and lists
- Each section must follow: Concept introduction → Explanation → Specific example → Significance
- NEVER use generic filler phrases like "this is important", "key concept", "students should understand"
- Every sentence must add NEW information — no repetition or padding
- Use your expertise to add academic depth where the transcript was brief
- Return ONLY valid JSON`;

      const repairedResult = await model.generateContent(repairPrompt);
      const repairedText = repairedResult.response.text().trim();
      const parsedRepair = tryParseJson(repairedText);
      if (parsedRepair) return parsedRepair;

      const fixedRepairText = await fixJson(repairedText);
      return tryParseJson(fixedRepairText);
    };

    // Enrich the transcript if it's sparse/fragmented
    const enrichedTranscript = await enrichTranscript(
      model,
      normalizedTranscript,
      args.title,
    );

    let prompt = `You are a world-class academic note-taker and subject matter expert with deep knowledge across all university-level disciplines. You have years of experience transforming lecture recordings into comprehensive, exam-ready study materials that students rely on as their PRIMARY study resource.

Your goal: Create notes so thorough and detailed that a student who MISSED the lecture could study ONLY from your notes and still perform excellently on an exam.

Transcript:
"""
${enrichedTranscript}
"""

${args.title ? `Lecture Title/Topic: "${args.title}"` : ""}

CRITICAL CONTEXT: This transcript was captured via voice recording and may be fragmented or incomplete. You MUST use your subject matter expertise to:
- Reconstruct incomplete explanations into full, coherent concepts
- Add relevant academic context that a lecturer would have conveyed through slides, gestures, or board work
- Infer and include the underlying theory, definitions, and frameworks being discussed
- Provide the depth of explanation that a textbook would offer for each concept mentioned`;

    // Add style-specific instructions
    if (args.style === "outline") {
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
      prompt += `\n\nGenerate a JSON response with this EXACT structure (Notion-like section-based format):
{
  "summary": "A comprehensive 5-8 sentence summary that: 1) Opens with a single clear sentence stating the EXACT main topic, 2) Explains WHY this topic matters in the broader field, 3) Lists ALL key themes and sub-topics covered, 4) Highlights the most important findings, theories, or methods discussed, 5) Concludes with key takeaways or implications.",
  "sections": [
    {"id": "sec-1", "type": "heading", "content": "Main Concept 1 Title", "level": 2},
    {"id": "sec-2", "type": "paragraph", "content": "Start with a precise one-sentence DEFINITION. Then explain the underlying mechanism or process in 2-3 sentences. Then provide a SPECIFIC example from the lecture with concrete details (numbers, names, formulas). Finally explain why this concept matters and how it connects to the broader topic. (Minimum 5 sentences, ~80-120 words)"},
    {"id": "sec-3", "type": "bullets", "content": "• Key insight or important point from this section\\n• Another critical detail with specific example\\n• Third important takeaway or application"},
    {"id": "sec-4", "type": "heading", "content": "Main Concept 2 Title", "level": 2},
    {"id": "sec-5", "type": "paragraph", "content": "Continue the same pattern — thorough explanation with definition, mechanism, specific example, significance. Each paragraph MUST be a self-contained mini-essay on the concept. (Minimum 5 sentences, ~80-120 words)"},
    {"id": "sec-6", "type": "bullets", "content": "• Key points for concept 2\\n• Important details and examples\\n• Practical applications or implications"}
  ],
  "actionItems": ["Specific task 1 with deadline if mentioned", "Task 2"],
  "reviewQuestions": [
    "Definition question: What is [concept] and what are its key characteristics?",
    "Mechanism question: Explain the process/mechanism of [concept] step by step.",
    "Application question: How would you apply [concept] to [specific real-world scenario]?",
    "Comparison question: Compare and contrast [concept A] with [concept B]. What are the key differences?",
    "Analysis question: Why does [phenomenon] occur? What factors contribute to it?",
    "Synthesis question: How do [concept A] and [concept B] work together to produce [outcome]?",
    "Evaluation question: What are the strengths and limitations of [theory/approach]?"
  ],
  "diagramNodes": ["Central Topic", "Key Concept A", "Key Concept B", "Key Concept C", "Sub-concept A1", "Sub-concept A2", "Sub-concept B1", "Sub-concept C1", "Related Framework"],
  "diagramEdges": ["0-1", "0-2", "0-3", "1-4", "1-5", "2-6", "3-7", "0-8"]
}

SECTION TYPES AVAILABLE:
- "heading": Section titles with level 1, 2, or 3 (like H1, H2, H3)
- "paragraph": Long-form text explanations
- "bullets": Bullet point lists (use \\n to separate items, prefix each with •)
- "numbered": Numbered lists (use \\n to separate items)
- "quote": Important quotes or key statements
- "divider": Visual separator between sections

MANDATORY QUALITY REQUIREMENTS:
- sections: Generate 8-15 sections with a mix of headings, paragraphs, and bullet points
- Each heading should be a specific academic term, concept name, or topic — NOT vague phrases
- Paragraphs: THIS IS THE MOST IMPORTANT PART. Each paragraph MUST be:
  * A SUBSTANTIAL block of 5-8 sentences (80-120 words minimum)
  * Structured as: Definition → Mechanism/Process → Specific Example → Significance
  * Include at LEAST one concrete detail: a number, name, date, formula, or specific example
  * Written as if explaining to a student who wasn't in the lecture
  * Free of generic filler like "this is an important concept" or "students should understand"
- Bullets: Use for key points, important explanations, and lists of related items
- If the transcript mentions something briefly, EXPAND it using your subject matter knowledge to give the full academic explanation
- reviewQuestions: Create 5-7 varied, thought-provoking questions spanning Bloom's taxonomy levels
- diagramNodes: 7-10 short labels (max ~80 characters each). Index 0 MUST be the single central topic (root) for the mind map.
- diagramEdges: Use only "sourceIndex-targetIndex" with valid indices into diagramNodes. Build a tree or sparse DAG from the root: every node except index 0 must be reachable from node 0. No self-loops; avoid redundant duplicate connections between the same two nodes.
- actionItems: Only include explicitly mentioned tasks (empty array if none)
- Return ONLY valid JSON, no markdown code fences`;
    }

    try {
      const result = await model.generateContent(prompt);
      let responseText = result.response.text().trim();

      // Remove markdown code fences if present
      responseText = responseText
        .replace(/^```json?\s*/i, "")
        .replace(/```\s*$/i, "");

      // Parse JSON response
      let parsed = null;
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
        let workingParsed: StructuredNotesDraft =
          parsed as StructuredNotesDraft;

        // Normalize sections array
        let normalizedSections = Array.isArray(workingParsed.sections)
          ? workingParsed.sections
              .map((section: any, idx: number) => ({
                id: section.id || `sec-${idx}`,
                type: section.type || "paragraph",
                content: String(section.content || "").trim(),
                level: section.level,
              }))
              .filter((section: any) => section.content.length > 0)
          : [];

        // Quality check: repair if too few sections or sections lack depth
        const paragraphSections = normalizedSections.filter(
          (s: any) => s.type === "paragraph"
        );
        const avgParagraphWords =
          paragraphSections.length > 0
            ? paragraphSections.reduce(
                (sum: number, s: any) => sum + wordCountFn(s.content),
                0
              ) / paragraphSections.length
            : 0;
        const needsRepair =
          normalizedSections.length < 5 ||
          avgParagraphWords < 50 ||
          paragraphSections.some((s: any) => noteLacksDepth(s.content));

        if (needsRepair) {
          const repaired = await maybeRepairQuality(workingParsed);
          if (repaired) {
            workingParsed = repaired as StructuredNotesDraft;
            normalizedSections = Array.isArray(workingParsed.sections)
              ? workingParsed.sections
                  .map((section: any, idx: number) => ({
                    id: section.id || `sec-${idx}`,
                    type: section.type || "paragraph",
                    content: String(section.content || "").trim(),
                    level: section.level,
                  }))
                  .filter((section: any) => section.content.length > 0)
              : [];
          }
        }

        const diagramNodes = Array.isArray(workingParsed.diagramNodes)
          ? workingParsed.diagramNodes
              .map((label: unknown) => String(label || "").trim())
              .filter((label: string) => label.length > 0)
          : [];
        const diagramEdges = Array.isArray(workingParsed.diagramEdges)
          ? workingParsed.diagramEdges
              .map((edge: unknown) => String(edge || "").trim())
              .filter((edge: string) => edge.length > 0)
          : [];

        const normalizedActionItems = Array.isArray(workingParsed.actionItems)
          ? workingParsed.actionItems
              .map((item: unknown) => String(item || "").trim())
              .filter((item: string) => item.length > 0)
          : [];
        const normalizedReviewQuestions = Array.isArray(
          workingParsed.reviewQuestions,
        )
          ? workingParsed.reviewQuestions
              .map((question: unknown) => String(question || "").trim())
              .filter((question: string) => question.length > 0)
          : [];

        const diagramData = buildDiagramData(diagramNodes, diagramEdges);

        return {
          summary: workingParsed.summary || "",
          sections: normalizedSections,
          actionItems: normalizedActionItems,
          reviewQuestions: normalizedReviewQuestions,
          diagramData,
        };
      }

      // Fallback: return empty structure
      return {
        summary: "Could not generate structured notes.",
        sections: [],
        actionItems: [],
        reviewQuestions: [],
        diagramData: undefined,
      };
    } catch (error) {
      console.error("generateStructuredNotes error:", error);
      return {
        summary: "Error generating structured notes.",
        sections: [],
        actionItems: [],
        reviewQuestions: [],
        diagramData: undefined,
      };
    }
  },
});

/**
 * Generate structured notes from a document (for drag-and-drop reference)
 */
export const generateNotesFromDocument = action({
  args: {
    fileId: v.id("files"),
    topic: v.optional(v.string()),
    noteStyle: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    content?: string;
    title?: string;
    sourceDocument?: { id: string; name: string };
    error?: string;
  }> => {
    try {
      const file = await ctx.runQuery(api.files.getFile, {
        fileId: args.fileId,
      });
      if (!file) {
        throw new Error("Document not found");
      }

      if (file.processingStatus !== "done" || !file.extractedText) {
        throw new Error(
          "Document not yet processed. Please wait for processing to complete.",
        );
      }

      const documentName = file.name;
      const documentContent = file.extractedText;
      const documentSummary = file.summary || "";
      const keyTopics = file.keyTopics || [];

      const noteStyle = args.noteStyle || "detailed";
      const topicFocus = args.topic
        ? `Focus specifically on information related to: "${args.topic}"`
        : "Cover the main topics comprehensively";

      const styleInstructions: Record<string, string> = {
        summary:
          "Create a concise summary with key takeaways (1-2 paragraphs max)",
        detailed:
          "Create comprehensive study notes with explanations and examples",
        "bullet-points": "Use organized bullet points with clear hierarchy",
        sections:
          "Use section-based format with headings and organized content blocks",
      };

      const model = getGeminiModel();
      const prompt = `You are an expert academic note-taker. Generate structured study notes from this document.

Document: "${documentName}"
Document Summary: ${documentSummary}
Key Topics: ${keyTopics.join(", ")}

Full Document Content:
"""
${documentContent.substring(0, 20000)}
"""

Instructions:
- ${styleInstructions[noteStyle] || styleInstructions.detailed}
- ${topicFocus}
- Include the most important concepts, definitions, and details
- Use proper markdown formatting (headers, bold, lists)
- Add a "Source" reference at the end: [Source: ${documentName}]

Generate the notes now:`;

      const result = await model.generateContent(prompt);
      const generatedContent = result.response.text();

      const titlePrompt = `Based on these notes, generate a short, descriptive title (max 8 words):
      
${generatedContent.substring(0, 500)}

Return ONLY the title, no quotes or explanation.`;

      const titleResult = await model.generateContent(titlePrompt);
      const title = titleResult.response
        .text()
        .trim()
        .replace(/^["']|["']$/g, "");

      return {
        success: true,
        content: generatedContent,
        title: title || `Notes from ${documentName}`,
        sourceDocument: {
          id: args.fileId,
          name: documentName,
        },
      };
    } catch (error) {
      console.error("generateNotesFromDocument error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to generate notes",
      };
    }
  },
});
