"use node";

import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Types for subscription tier checking
type SubscriptionTier = "free" | "scholar" | "institution";

// TEMPORARY: All features are free - payment gateway disabled due to Paystack bug
// Tier feature checks and subscription response types removed

// Helper to check if user has access to a premium feature
// TEMPORARY: All features are free - always allow access
// Payment gateway disabled due to Paystack bug
async function checkTierAccess(): Promise<{
  allowed: boolean;
  tier: SubscriptionTier;
  error?: string;
}> {
  return { allowed: true, tier: "scholar" as SubscriptionTier };
}

// Initialize Gemini client
const getGeminiModel = (config?: { responseMimeType: string }) => {
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
 * Refine and improve text - make it cleaner, more structured, and professional
 */
export const refineText = action({
  args: {
    text: v.string(),
    style: v.optional(v.string()), // "academic", "casual", "bullet-points", etc.
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
    transcript: v.string(), // JSON stringified array of {text, timestamp}
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const model = getGeminiModel();

    const prompt = `You are an expert academic note-taker. Convert the following lecture/recording transcript into well-structured study notes.

Transcript:
"""
${args.transcript}
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
 * Answer questions about provided context (notes or transcripts)
 */
/**
 * Generate a visual course roadmap (Mind Map)
 */
export const generateCourseRoadmap = action({
  args: {
    major: v.string(),
    courses: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const model = getGeminiModel();

    const prompt = `You are an academic advisor. Create a visual learning roadmap (mind map) for a student majoring in "${args.major}".
    
    Courses: ${args.courses.join(", ")}

    Generate a node-graph JSON structure representing the relationships between these courses and key concepts they cover.

    Return EXACTLY this JSON structure:
    {
      "nodes": [
        { 
          "id": "1", 
          "type": "concept", 
          "data": { 
            "label": "${args.major}",
            "color": "bg-gradient-to-br from-purple-500 to-pink-500"
          }, 
          "position": { "x": 400, "y": 50 } 
        },
        { 
          "id": "2", 
          "type": "topic",
          "data": { 
            "label": "Course Name",
            "color": "bg-gradient-to-br from-blue-500 to-cyan-500"
          }, 
          "position": { "x": 200, "y": 200 } 
        }
      ],
      "edges": [
        { "id": "e1-2", "source": "1", "target": "2", "animated": true }
      ]
    }

    Rules:
    - The central node (id: "1") should be the Major with type "concept"
    - Use node types: "concept" (major), "topic" (courses/semesters), "subtopic" (key concepts), "note" (details)
    - Assign colors based on node type:
      * concept: "bg-gradient-to-br from-purple-500 to-pink-500"
      * topic: "bg-gradient-to-br from-blue-500 to-cyan-500"
      * subtopic: "bg-gradient-to-br from-emerald-500 to-teal-500"
      * note: "bg-gradient-to-br from-amber-400 to-orange-400"
    - Position the major node at center-top (x: 400, y: 50)
    - Arrange courses/topics in a hierarchical tree below
    - Use reasonable spacing: 200-300px horizontally, 150-200px vertically between levels
    - Create 8-12 nodes total (major + courses + key concepts)
    - All edges should have "animated": true
    - Return ONLY valid JSON, no markdown code fences.
    `;

    try {
      const result = await model.generateContent(prompt);
      let text = result.response.text().trim();

      // Remove markdown code fences if present
      text = text.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "");

      // Extract JSON
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Failed to generate roadmap JSON");

      // Types for roadmap nodes and edges
      interface RoadmapNode {
        id: string;
        type: string;
        data: { label: string; color: string };
        position: { x: number; y: number };
      }
      interface RoadmapEdge {
        id: string;
        source: string;
        target: string;
        animated?: boolean;
      }

      const data = JSON.parse(match[0]) as {
        nodes: RoadmapNode[];
        edges: RoadmapEdge[];
      };

      // Apply dagre layout for better positioning
      if (data.nodes && data.nodes.length > 0) {
        // Dynamic import for dagre
        const dagre = await import("dagre");
        const dagreGraph = new dagre.graphlib.Graph();
        dagreGraph.setDefaultEdgeLabel(() => ({}));
        dagreGraph.setGraph({ rankdir: "TB", nodesep: 150, ranksep: 100 });

        // Add nodes with estimated dimensions
        data.nodes.forEach((node: RoadmapNode) => {
          const width =
            node.type === "concept"
              ? 200
              : node.type === "topic"
                ? 160
                : node.type === "subtopic"
                  ? 120
                  : 100;
          const height =
            node.type === "concept"
              ? 80
              : node.type === "topic"
                ? 60
                : node.type === "subtopic"
                  ? 50
                  : 40;
          dagreGraph.setNode(node.id, { width, height });
        });

        // Add edges
        data.edges.forEach((edge: RoadmapEdge) => {
          dagreGraph.setEdge(edge.source, edge.target);
        });

        // Calculate layout
        dagre.layout(dagreGraph);

        // Update positions
        data.nodes = data.nodes.map((node: RoadmapNode) => {
          const nodeWithPosition = dagreGraph.node(node.id);
          return {
            ...node,
            position: {
              x: nodeWithPosition.x - nodeWithPosition.width / 2,
              y: nodeWithPosition.y - nodeWithPosition.height / 2,
            },
          };
        });
      }

      return data;
    } catch (e) {
      console.error("Roadmap generation failed", e);

      // Return a better fallback structure with the courses
      const nodes: Array<{
        id: string;
        type: string;
        data: { label: string; color: string };
        position: { x: number; y: number };
      }> = [
        {
          id: "1",
          type: "concept",
          data: {
            label: args.major,
            color: "bg-gradient-to-br from-purple-500 to-pink-500",
          },
          position: { x: 400, y: 50 },
        },
      ];

      const edges: Array<{
        id: string;
        source: string;
        target: string;
        animated: boolean;
      }> = [];

      // Add courses as topic nodes
      args.courses.forEach((course, index) => {
        const nodeId = `${index + 2}`;
        nodes.push({
          id: nodeId,
          type: "topic",
          data: {
            label: course,
            color: "bg-gradient-to-br from-blue-500 to-cyan-500",
          },
          position: {
            x: 200 + (index % 3) * 200,
            y: 200 + Math.floor(index / 3) * 150,
          },
        });
        edges.push({
          id: `e1-${nodeId}`,
          source: "1",
          target: nodeId,
          animated: true,
        });
      });

      return { nodes, edges };
    }
  },
});

/**
 * Answer questions about provided context (notes or transcripts)
 */
export const askAboutContext = action({
  args: {
    question: v.string(),
    context: v.string(),
    contextType: v.optional(v.string()), // "note", "transcript", "general"
  },
  handler: async (ctx, args) => {
    const model = getGeminiModel();

    const contextTypeLabel =
      args.contextType === "transcript"
        ? "lecture transcript"
        : args.contextType === "note"
          ? "study notes"
          : "content";

    const prompt = `You are Lumina AI, a helpful academic assistant for students. 
Answer the following question based on the provided ${contextTypeLabel}.

Context:
"""
${args.context}
"""

Question: ${args.question}

Instructions:
- Answer based primarily on the provided context
- If the context doesn't contain enough information, say so
- Be concise but thorough
- Use examples from the context when helpful
- Format your response clearly with markdown if needed`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  },
});

/**
 * Generate structured notes from transcript with Cornell format, action items, and mind map
 * Returns JSON instead of plain text for programmatic editor insertion
 */
export const generateStructuredNotes = action({
  args: {
    transcript: v.string(), // JSON stringified array of {text, timestamp}
    title: v.optional(v.string()),
    style: v.optional(v.string()), // "cornell" | "outline" | "standard"
  },
  handler: async (ctx, args) => {
    const model = getGeminiModel({ responseMimeType: "application/json" });

    const tryParseJson = (text: string) => {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      return JSON.parse(jsonMatch[0]);
    };

    const fixJson = async (text: string) => {
      const fixPrompt = `Fix the following JSON. Return ONLY valid JSON with the same structure and content, no markdown.

JSON:
${text}`;
      const fixResult = await model.generateContent(fixPrompt);
      return fixResult.response.text().trim();
    };

    let prompt = `You are an expert academic note-taker with years of experience creating comprehensive study materials. Your goal is to transform this lecture transcript into detailed, exam-ready study notes.

Transcript:
"""
${args.transcript}
"""

${args.title ? `Lecture Title: ${args.title}` : ""}`;

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
      prompt += `\n\nGenerate a JSON response with this EXACT structure:
{
  "summary": "A comprehensive 4-6 sentence summary that: 1) States the main topic clearly, 2) Explains WHY this topic matters, 3) Lists the key themes covered, 4) Mentions any important conclusions or takeaways.",
  "cornellCues": ["Concept/Term 1", "Concept/Term 2", "Concept/Term 3", "Concept/Term 4", "Concept/Term 5"],
  "cornellNotes": [
    "Detailed explanation with definition, examples, and context. Include specific facts, figures, or formulas mentioned.",
    "Thorough explanation covering what it is, how it works, and why it's important. Add any relationships to other concepts.",
    "Complete explanation with real-world applications or examples from the lecture.",
    "In-depth coverage including any exceptions, edge cases, or important nuances mentioned.",
    "Comprehensive notes including comparisons, contrasts, or connections to prior knowledge."
  ],
  "actionItems": ["Specific task 1 with deadline if mentioned", "Task 2"],
  "reviewQuestions": [
    "Conceptual question that tests understanding of the main idea?",
    "Application question: How would you apply [concept] to [scenario]?",
    "Comparison question: What is the difference between X and Y?",
    "Analysis question that requires deeper thinking?",
    "Synthesis question connecting multiple concepts?"
  ],
  "diagramNodes": ["Central Topic", "Key Concept A", "Key Concept B", "Sub-concept A1", "Sub-concept B1", "Related Idea"],
  "diagramEdges": ["0-1", "0-2", "1-3", "2-4", "0-5"]
}

IMPORTANT RULES:
- cornellCues: Extract 5-8 key terms, concepts, or questions from the lecture
- cornellNotes: Each note should be 2-4 sentences with SPECIFIC details, not generic descriptions
- Include actual examples, numbers, dates, names, or formulas mentioned in the lecture
- reviewQuestions: Create 5 varied questions (recall, application, analysis, synthesis, evaluation)
- diagramNodes: Create 5-8 nodes showing the hierarchical relationship between concepts
- diagramEdges: Connect nodes logically (format: "sourceIndex-targetIndex")
- actionItems: Only include if explicitly mentioned (homework, readings, deadlines)
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
        // Attempt one repair pass through the model
        const fixedText = await fixJson(responseText);
        try {
          parsed = tryParseJson(fixedText);
        } catch {
          parsed = null;
        }
      }

      if (parsed) {

        // Convert simplified diagram format to ReactFlow format
        let diagramData = undefined;
        if (
          parsed.diagramNodes &&
          Array.isArray(parsed.diagramNodes) &&
          parsed.diagramNodes.length > 0
        ) {
          const nodes = parsed.diagramNodes.map(
            (label: string, index: number) => {
              // Assign node types and colors based on position
              let type = "default";
              let color = "bg-gradient-to-br from-gray-500 to-gray-600";

              if (index === 0) {
                type = "concept";
                color = "bg-gradient-to-br from-purple-500 to-pink-500";
              } else if (index <= 3) {
                type = "topic";
                color = "bg-gradient-to-br from-blue-500 to-cyan-500";
              } else if (index <= 6) {
                type = "subtopic";
                color = "bg-gradient-to-br from-emerald-500 to-teal-500";
              } else {
                type = "note";
                color = "bg-gradient-to-br from-amber-400 to-orange-400";
              }

              return {
                id: String(index),
                type,
                data: { label, color },
                position: {
                  x: index === 0 ? 400 : 200 + (index % 3) * 200,
                  y: index === 0 ? 50 : Math.floor(index / 3) * 150 + 200,
                },
              };
            },
          );

          const edges = (parsed.diagramEdges || []).map(
            (edge: string, index: number) => {
              const [source, target] = edge.split("-");
              return { id: `e${index}`, source, target, animated: true };
            },
          );

          diagramData = { nodes, edges };
        }

        return {
          summary: parsed.summary || "",
          cornellCues: parsed.cornellCues || [],
          cornellNotes: parsed.cornellNotes || [],
          actionItems: parsed.actionItems || [],
          reviewQuestions: parsed.reviewQuestions || [],
          diagramData,
        };
      }

      // Fallback: return empty structure
      return {
        summary: "Could not generate structured notes.",
        cornellCues: [],
        cornellNotes: [],
        actionItems: [],
        reviewQuestions: [],
        diagramData: undefined,
      };
    } catch (error) {
      console.error("generateStructuredNotes error:", error);
      return {
        summary: "Error generating structured notes.",
        cornellCues: [],
        cornellNotes: [],
        actionItems: [],
        reviewQuestions: [],
        diagramData: undefined,
      };
    }
  },
});

/**
 * Analyze a transcript chunk in real-time for:
 * - Key concepts (bolded)
 * - Important markers ("exam", "remember", etc.)
 * - LaTeX math formatting
 */
export const analyzeChunk = action({
  args: {
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const model = getGeminiModel();

    const prompt = `You are a real-time lecture assistant. Analyze the following spoken text chunk from a lecture.

Input:
"""
${args.text}
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
      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();

      // Try to parse the JSON response
      // Handle case where model might wrap in code fences
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          enhancedText: parsed.enhancedText || args.text,
          isImportant: parsed.isImportant || false,
          concepts: parsed.concepts || [],
        };
      }

      // Fallback: return original text
      return {
        enhancedText: args.text,
        isImportant: false,
        concepts: [],
      };
    } catch (error) {
      console.error("analyzeChunk error:", error);
      // On error, return original text unchanged
      return {
        enhancedText: args.text,
        isImportant: false,
        concepts: [],
      };
    }
  },
});

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

/**
 * Generate text embedding for semantic search
 */
export const generateEmbedding = action({
  args: {
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable not set");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

    // Strip HTML tags and limit text length
    const plainText = args.text
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 8000);

    if (!plainText) {
      return null;
    }

    try {
      const result = await model.embedContent(plainText);
      return result.embedding.values;
    } catch (error) {
      console.error("generateEmbedding error:", error);
      return null;
    }
  },
});

/**
 * Semantic search across user's notes
 */
export const semanticSearch = action({
  args: {
    query: v.string(),
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    answer: string;
    sources: Array<{ id: string; title: string; score: number }>;
  }> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable not set");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const embeddingModel = genAI.getGenerativeModel({
      model: "embedding-001",
    });

    // Generate query embedding
    const queryResult = await embeddingModel.embedContent(args.query);
    const queryEmbedding = queryResult.embedding.values;

    // Search using vector index
    const limit = args.limit || 5;
    const results = await ctx.vectorSearch("notes", "by_embedding", {
      vector: queryEmbedding,
      limit,
      filter: (q) => q.eq("userId", args.userId),
    });

    // Get the actual note content for found results
    const notes: Array<{
      id: string;
      title: string;
      content: string;
      score: number;
    }> = await Promise.all(
      results.map(async (result) => {
        const note = await ctx.runQuery(api.notes.getNote, {
          noteId: result._id,
        });
        return {
          id: result._id as string,
          title: note?.title || "Untitled",
          content: note?.content?.substring(0, 500) || "",
          score: result._score,
        };
      }),
    );

    // Synthesize answer using found context
    if (notes.length > 0) {
      const contextText = notes
        .map(
          (n: { title: string; content: string }) =>
            `## ${n.title}\n${n.content}`,
        )
        .join("\n\n");

      const chatModel = getGeminiModel();
      const synthesisPrompt = `Based on the following notes from a student's knowledge base, answer their question.

Notes Context:
${contextText}

Question: ${args.query}

Instructions:
- Answer based on the provided context
- If the context doesn't have enough info, say so
- Be concise and helpful
- Cite which notes the information came from`;

      const synthesisResult = await chatModel.generateContent(synthesisPrompt);
      const answer = synthesisResult.response.text();

      return {
        answer,
        sources: notes.map(
          (n: { id: string; title: string; score: number }) => ({
            id: n.id,
            title: n.title,
            score: n.score,
          }),
        ),
      };
    }

    return {
      answer:
        "I couldn't find relevant information in your notes. Try rephrasing your question or add more notes on this topic.",
      sources: [],
    };
  },
});

/**
 * Transcribe an audio file using Gemini
 * Supports MP3, WAV, M4A, OGG, FLAC formats
 * Fetches audio from Convex storage to avoid argument size limits
 */
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

export const transcribeAudio = action({
  args: {
    storageId: v.id("_storage"),
    mimeType: v.string(),
    courseContext: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const startMs = Date.now();
    console.log(
      `[transcribeAudio] Start: storageId=${args.storageId}, mimeType=${args.mimeType}`,
    );
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        transcript: "",
        duration: null,
        speakers: null,
        keyTopics: [],
        success: false,
        error: "GEMINI_API_KEY environment variable not set",
      };
    }

    try {
      const fetchStartMs = Date.now();
      // Fetch the audio file from Convex storage
      const audioBlob = await ctx.storage.get(args.storageId);
      console.log(
        `[transcribeAudio] Storage fetch time: ${Date.now() - fetchStartMs}ms`,
      );
      if (!audioBlob) {
        return {
          transcript: "",
          duration: null,
          speakers: null,
          keyTopics: [],
          success: false,
          error: "Audio file not found in storage. It may have been deleted.",
        };
      }

      // Check file size - Gemini supports inline audio up to ~50MB
      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
      if (audioBlob.size > MAX_FILE_SIZE) {
        return {
          transcript: "",
          duration: null,
          speakers: null,
          keyTopics: [],
          success: false,
          error: `Audio file is too large (${(audioBlob.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 50MB.`,
        };
      }

      console.log(
        `[transcribeAudio] Processing audio: ${(audioBlob.size / 1024).toFixed(1)}KB, mimeType: ${args.mimeType}`,
      );

      const genAI = new GoogleGenerativeAI(apiKey);

      // Convert blob to base64
      const encodeStartMs = Date.now();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const audioBase64 = btoa(binary);
      console.log(
        `[transcribeAudio] Base64 encode time: ${Date.now() - encodeStartMs}ms, base64Bytes=${audioBase64.length}`,
      );

      // Timeout wrapper to prevent hanging connections
      const withTimeout = <T>(
        promise: Promise<T>,
        timeoutMs: number,
      ): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<T>((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(`Request timed out after ${timeoutMs / 1000}s`),
                ),
              timeoutMs,
            ),
          ),
        ]);
      };

      const generateTranscription = async (modelName: string) => {
        console.log(
          `[transcribeAudio] Attempting transcription with model: ${modelName}`,
        );
        const model = genAI.getGenerativeModel({ model: modelName });

        // 90 second timeout for the API call (longer for larger files)
        const apiStartMs = Date.now();
        const result = await withTimeout(
          model.generateContent([
            {
              inlineData: {
                mimeType: args.mimeType,
                data: audioBase64,
              },
            },
            {
              text: `Transcribe this audio file completely and accurately. 
Return the transcription as plain text. 
If you detect timestamps or speaker changes, include them.
Focus on accuracy above all else.`,
            },
          ]),
          90000, // 90 seconds
        );
        console.log(
          `[transcribeAudio] AI call time: ${Date.now() - apiStartMs}ms`,
        );
        return result.response.text().trim();
      };

      let responseText = "";
      const maxRetries = 3; // Increased for transient errors
      let lastError: Error | null = null;

      // Retry with exponential backoff for transient errors
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(
            `[transcribeAudio] Attempt ${attempt}/${maxRetries} with gemini-2.5-flash`,
          );
          responseText = await generateTranscription("gemini-2.5-flash");
          break; // Success, exit loop
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          console.warn(
            `[transcribeAudio] Attempt ${attempt} failed:`,
            lastError.message,
          );

          // If this was the last attempt, don't wait
          if (attempt < maxRetries) {
            // Exponential backoff: 1s, 2s, 4s
            const delay = Math.pow(2, attempt - 1) * 1000;
            console.log(`[transcribeAudio] Waiting ${delay}ms before retry...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      // If all retries failed, throw the last error
      if (!responseText && lastError) {
        throw lastError;
      }

      console.log(
        `[transcribeAudio] Success! Got ${responseText.length} characters of transcription`,
      );
      console.log(
        `[transcribeAudio] Total action time: ${Date.now() - startMs}ms`,
      );

      let cleanedTranscript = responseText;
      let cleanupMetadata: CleanupMetadata = defaultCleanupMetadata();
      let structureResult: LectureStructureResult = { segments: [] };

      try {
        console.log(
          "[transcribeAudio] Transcript obtained, now cleaning...",
        );
        const cleanupResult = await ctx.runAction(
          api.ai.cleanLectureTranscript,
          {
            transcript: responseText,
            context: args.courseContext,
          },
        );
        cleanedTranscript =
          cleanupResult.cleanedTranscript || cleanedTranscript;
        cleanupMetadata = cleanupResult.metadata || cleanupMetadata;

        console.log(
          `[transcribeAudio] Cleaned transcript: removed ${cleanupMetadata.fillerWordsRemoved} filler words, marked ${cleanupMetadata.repetitionsMarked} repetitions, converted ${cleanupMetadata.mathExpressionsConverted} math expressions`,
        );

        const detectedStructure = await ctx.runAction(
          api.ai.detectLectureSegments,
          {
            transcript: cleanedTranscript,
          },
        );
        structureResult =
          detectedStructure && detectedStructure.segments
            ? detectedStructure
            : structureResult;

        console.log(
          `[transcribeAudio] Detected ${structureResult.segments?.length || 0} lecture segments`,
        );
      } catch (cleanupError) {
        console.error("[transcribeAudio] Cleanup pipeline error:", cleanupError);
      }

      // Return the transcription directly as plain text
      return {
        transcript: cleanedTranscript,
        duration: null,
        speakers: null,
        keyTopics: cleanupMetadata.emphasizedConcepts || [],
        processingMetadata: {
          cleaned: cleanupMetadata,
          structure: structureResult,
        },
        success: true,
      };
    } catch (error) {
      // Log full error details for debugging
      console.error(
        "[transcribeAudio] Full error:",
        JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
      );
      console.error(
        "[transcribeAudio] Error message:",
        error instanceof Error ? error.message : String(error),
      );
      console.error(
        `[transcribeAudio] Total action time (error): ${Date.now() - startMs}ms`,
      );

      // Parse specific error types
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      let userFriendlyError = "Transcription failed";

      if (
        errorMessage.includes("RESOURCE_EXHAUSTED") ||
        errorMessage.includes("quota")
      ) {
        userFriendlyError = "API quota exceeded. Please try again later.";
      } else if (
        errorMessage.includes("RATE_LIMIT") ||
        errorMessage.includes("429")
      ) {
        userFriendlyError =
          "Too many requests. Please wait a moment and try again.";
      } else if (errorMessage.includes("INVALID_ARGUMENT")) {
        userFriendlyError =
          "Invalid audio format. Please try MP3, WAV, or M4A formats.";
      } else if (
        errorMessage.includes("couldn't be completed") ||
        errorMessage.includes("completed")
      ) {
        userFriendlyError =
          "The AI service is temporarily unavailable. Please try again in a few minutes.";
      } else if (
        errorMessage.includes("deadline") ||
        errorMessage.includes("timeout")
      ) {
        userFriendlyError =
          "Request timed out. The audio file may be too long. Try a shorter recording.";
      }

      return {
        transcript: "",
        duration: null,
        speakers: null,
        keyTopics: [],
        success: false,
        error: userFriendlyError,
      };
    }
  },
});

/**
 * Clean up lecture transcripts - removes filler, marks emphasis, converts math
 */
export const cleanLectureTranscript = action({
  args: {
    transcript: v.string(),
    context: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const model = getGeminiModel({ responseMimeType: "application/json" });

    const prompt = `You are a lecture transcription cleaning specialist. Your job is to make raw lecture transcripts clean and ready for study materials.

TASK: Clean this lecture transcript intelligently while preserving ALL important meaning.

Raw transcript:
"""
${args.transcript}
"""

${args.context ? `Course/Topic: ${args.context}` : ""}

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
      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();
      const jsonText = extractJsonObject(responseText);
      if (!jsonText) {
        throw new Error("Failed to parse cleaning response");
      }

      const parsed = JSON.parse(jsonText);
      return {
        cleanedTranscript: parsed.cleanedTranscript || args.transcript,
        metadata: parsed.metadata || defaultCleanupMetadata(),
      };
    } catch (error) {
      console.error("[cleanLectureTranscript] error:", error);
      return {
        cleanedTranscript: args.transcript,
        metadata: defaultCleanupMetadata(),
      };
    }
  },
});

/**
 * Detect lecture structure and segments for better note organization
 */
export const detectLectureSegments = action({
  args: {
    transcript: v.string(),
  },
  handler: async (ctx, args) => {
    const model = getGeminiModel({ responseMimeType: "application/json" });

    const prompt = `Analyze this lecture transcript and identify its structure and segments.

Transcript (first 15,000 chars):
"""
${args.transcript.substring(0, 15000)}
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
      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();
      const jsonText = extractJsonObject(responseText);
      if (!jsonText) {
        return { segments: [] };
      }
      return JSON.parse(jsonText);
    } catch (error) {
      console.error("[detectLectureSegments] error:", error);
      return { segments: [] };
    }
  },
});

/**
 * Generate flashcards from note content and save them to the database
 * PREMIUM FEATURE: Requires Scholar tier
 */
export const generateAndSaveFlashcards = action({
  args: {
    noteId: v.id("notes"),
    title: v.string(),
    count: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    deckId?: string;
    cardCount?: number;
    error?: string;
    requiresUpgrade?: boolean;
  }> => {
    // Check tier access for flashcards feature
    const tierCheck = await checkTierAccess();
    if (!tierCheck.allowed) {
      return {
        success: false,
        error: tierCheck.error,
        requiresUpgrade: true,
      };
    }

    // Get the note content
    const note = await ctx.runQuery(api.notes.getNote, { noteId: args.noteId });
    if (!note) {
      return {
        success: false,
        error: "Note not found. Please select a different note.",
      };
    }

    // Strip HTML tags from content
    const plainText = (note.content || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!plainText || plainText.length < 50) {
      return {
        success: false,
        error:
          "This note doesn't have enough content yet. Add more text to your note before generating flashcards.",
      };
    }

    const model = getGeminiModel({ responseMimeType: "application/json" });
    const count = args.count || 10;

    const prompt = `Generate ${count} flashcards from the following study content.

Content:
"""
${plainText.substring(0, 8000)}
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
- Focus on key concepts that are important to remember
- Return ONLY valid JSON, no markdown or explanation`;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();

      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("Failed to parse AI response");
      }

      const cards = JSON.parse(jsonMatch[0]) as Array<{
        front: string;
        back: string;
      }>;

      if (!cards.length) {
        throw new Error("No flashcards generated");
      }

      // Save to database
      const deckId = await ctx.runMutation(api.flashcards.createDeckWithCards, {
        title: args.title,
        sourceNoteId: args.noteId,
        courseId: note.courseId,
        cards: cards,
      });

      return {
        success: true,
        deckId,
        cardCount: cards.length,
      };
    } catch (error) {
      console.error("generateAndSaveFlashcards error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate flashcards",
      };
    }
  },
});

/**
 * Generate quiz questions from note content and save them to the database
 * PREMIUM FEATURE: Requires Scholar tier
 */
export const generateAndSaveQuiz = action({
  args: {
    noteId: v.id("notes"),
    title: v.string(),
    count: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    deckId?: string;
    questionCount?: number;
    error?: string;
    requiresUpgrade?: boolean;
  }> => {
    // Check tier access for quizzes feature
    const tierCheck = await checkTierAccess();
    if (!tierCheck.allowed) {
      return {
        success: false,
        error: tierCheck.error,
        requiresUpgrade: true,
      };
    }

    // Get the note content
    const note = await ctx.runQuery(api.notes.getNote, { noteId: args.noteId });
    if (!note) {
      return {
        success: false,
        error: "Note not found. Please select a different note.",
      };
    }

    // Strip HTML tags from content
    const plainText = (note.content || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!plainText || plainText.length < 50) {
      return {
        success: false,
        error:
          "This note doesn't have enough content yet. Add more text to your note before generating a quiz.",
      };
    }

    const model = getGeminiModel({ responseMimeType: "application/json" });
    const count = args.count || 10;

    const prompt = `Generate ${count} multiple-choice questions from the following study content.

Content:
"""
${plainText.substring(0, 8000)}
"""

Each question should have:
- A clear question testing understanding of key concepts
- Exactly 4 plausible options labeled A, B, C, D
- One correct answer (specify by index 0-3)
- A brief explanation of why the answer is correct

Return a JSON array with this exact structure:
[
  {
    "question": "What is the main concept of...?",
    "options": ["A) First option", "B) Second option", "C) Third option", "D) Fourth option"],
    "correctAnswer": 0,
    "explanation": "Brief explanation of the correct answer"
  }
]

Rules:
- Focus on key concepts and important facts
- Make all options plausible to test real understanding
- Ensure correctAnswer is a number from 0 to 3
- Keep questions clear and concise
- Return ONLY valid JSON, no markdown or explanation`;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();

      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("Failed to parse AI response");
      }

      const questions = JSON.parse(jsonMatch[0]) as Array<{
        question: string;
        options: string[];
        correctAnswer: number;
        explanation?: string;
      }>;

      if (!questions.length) {
        throw new Error("No questions generated");
      }

      // Validate questions
      for (const q of questions) {
        if (!q.question || !q.options || q.options.length !== 4) {
          throw new Error("Invalid question format: must have 4 options");
        }
        if (q.correctAnswer < 0 || q.correctAnswer > 3) {
          throw new Error("Invalid correctAnswer: must be 0-3");
        }
      }

      // Save to database
      const deckId = await ctx.runMutation(
        api.quizzes.createDeckWithQuestions,
        {
          title: args.title,
          sourceNoteId: args.noteId,
          courseId: note.courseId,
          questions: questions,
        },
      );

      return {
        success: true,
        deckId,
        questionCount: questions.length,
      };
    } catch (error) {
      console.error("generateAndSaveQuiz error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to generate quiz",
      };
    }
  },
});

/**
 * Process a document (PDF) - extract text, generate summary, and create embeddings
 * Uses pdf-parse for text extraction and Gemini for summarization
 */
export const processDocument = action({
  args: {
    fileId: v.id("files"),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      // Update status to processing
      await ctx.runMutation(api.files.updateProcessingStatus, {
        fileId: args.fileId,
        status: "processing",
        progressPercent: 10,
      });

      // Get file info
      const file = await ctx.runQuery(api.files.getFile, {
        fileId: args.fileId,
      });
      if (!file || !file.storageId) {
        throw new Error("File not found or missing storage ID");
      }

      // Fetch PDF content from Convex storage
      const storageUrl = file.url;
      if (!storageUrl) {
        throw new Error("Could not get storage URL for file");
      }

      const response = await fetch(storageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      await ctx.runMutation(api.files.updateProcessingStatus, {
        fileId: args.fileId,
        status: "processing",
        progressPercent: 40,
      });

      // Use Gemini's native PDF processing capability
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY not set");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      // Convert buffer to base64 for Gemini
      const base64Data = buffer.toString("base64");

      // Extract text and generate summary using Gemini's PDF understanding
      const extractionResult = await model.generateContent([
        {
          inlineData: {
            mimeType: "application/pdf",
            data: base64Data,
          },
        },
        {
          text: `Analyze this PDF document and extract its content with careful attention to structure and formatting.

Return a JSON response with this exact structure:
{
  "extractedText": "The full text content with preserved structure",
  "summary": "2-3 sentence summary of the document",
  "keyTopics": ["topic1", "topic2", "topic3", "topic4", "topic5"]
}

CRITICAL EXTRACTION RULES:
1. **Preserve Document Structure**:
   - Maintain heading hierarchy (use markdown: # for H1, ## for H2, etc.)
   - Keep paragraph breaks and spacing
   - Preserve list structures (use - for bullets, 1. for numbered lists)
   - Maintain table structure using markdown table syntax if present

2. **Handle Page Breaks Intelligently**:
   - Continue sentences/paragraphs that span page breaks
   - Don't insert extra breaks where pages end
   - Preserve section continuity across pages

3. **Format Special Content**:
   - Code blocks: wrap in triple backticks (\`\`\`)
   - Mathematical formulas: preserve using LaTeX notation when possible
   - Tables: use markdown table format (| col1 | col2 |)
   - Quotes/callouts: prefix with > for blockquotes

4. **Multi-Column Layouts**:
   - Read left-to-right, top-to-bottom
   - Merge columns into single flowing text
   - Preserve logical reading order

5. **Metadata Extraction**:
   - Include document title if present
   - Preserve author, date, or version info if visible
   - Keep section numbers and references

6. **Text Quality**:
   - Fix obvious OCR errors if any
   - Preserve technical terms, acronyms, and proper nouns exactly
   - Keep URLs and references intact

7. **Summary Requirements**:
   - 2-3 sentences capturing main purpose and key information
   - Mention document type (textbook, research paper, notes, etc.)

8. **Key Topics**:
   - Extract 3-7 most important concepts, terms, or themes
   - Use specific terminology from the document
   - Prioritize exam-worthy or central concepts

Return ONLY valid JSON, no markdown code fences or explanation.`,
        },
      ]);

      const extractionText = extractionResult.response.text().trim();

      await ctx.runMutation(api.files.updateProcessingStatus, {
        fileId: args.fileId,
        status: "processing",
        progressPercent: 70,
      });

      // Parse the response
      let extractedText = "";
      let summary = "Document summary unavailable";
      let keyTopics: string[] = [];

      const jsonMatch = extractionText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          extractedText = parsed.extractedText || "";
          summary = parsed.summary || summary;
          keyTopics = parsed.keyTopics || [];
        } catch {
          // If JSON parsing fails, use the raw text as extracted content
          extractedText = extractionText;
        }
      } else {
        extractedText = extractionText;
      }

      if (!extractedText.trim()) {
        throw new Error("No text could be extracted from PDF");
      }

      // Generate embedding using existing genAI instance
      const embeddingModel = genAI.getGenerativeModel({
        model: "embedding-001",
      });

      // Combine summary and beginning of text for embedding
      const textForEmbedding = `${summary}\n\n${extractedText.substring(0, 5000)}`;
      const embeddingResult =
        await embeddingModel.embedContent(textForEmbedding);
      const embedding = embeddingResult.embedding.values;

      await ctx.runMutation(api.files.updateProcessingStatus, {
        fileId: args.fileId,
        status: "processing",
        progressPercent: 90,
      });

      // Save extracted content
      await ctx.runMutation(api.files.saveExtractedContent, {
        fileId: args.fileId,
        extractedText: extractedText.substring(0, 50000), // Limit stored text
        summary,
        keyTopics,
        embedding,
      });

      await ctx.runMutation(api.files.updateProcessingStatus, {
        fileId: args.fileId,
        status: "done",
        progressPercent: 100,
        errorMessage: "",
      });

      return { success: true };
    } catch (error) {
      console.error("processDocument error:", error);

      // Update status to error
      await ctx.runMutation(api.files.updateProcessingStatus, {
        fileId: args.fileId,
        status: "error",
        errorMessage: error instanceof Error ? error.message : "Processing failed",
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Processing failed",
      };
    }
  },
});

/**
 * Unified semantic search across notes AND documents
 * Returns results with source citations
 */
export const unifiedSemanticSearch = action({
  args: {
    query: v.string(),
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    answer: string;
    sources: Array<{
      id: string;
      type: "note" | "document";
      title: string;
      score: number;
      snippet: string;
    }>;
  }> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable not set");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const embeddingModel = genAI.getGenerativeModel({
      model: "embedding-001",
    });

    // Generate query embedding
    const queryResult = await embeddingModel.embedContent(args.query);
    const queryEmbedding = queryResult.embedding.values;

    const limit = args.limit || 5;

    // Search notes
    const noteResults = await ctx.vectorSearch("notes", "by_embedding", {
      vector: queryEmbedding,
      limit,
      filter: (q) => q.eq("userId", args.userId),
    });

    // Search documents
    const docResults = await ctx.vectorSearch("files", "by_embedding", {
      vector: queryEmbedding,
      limit,
      filter: (q) => q.eq("userId", args.userId),
    });

    // Fetch note details
    const noteSources = await Promise.all(
      noteResults.map(async (result) => {
        const note = await ctx.runQuery(api.notes.getNote, {
          noteId: result._id,
        });
        const content =
          note?.content?.replace(/<[^>]*>/g, " ").substring(0, 200) || "";
        return {
          id: result._id as string,
          type: "note" as const,
          title: note?.title || "Untitled Note",
          score: result._score,
          snippet: content,
          fullContent:
            note?.content?.replace(/<[^>]*>/g, " ").substring(0, 1000) || "",
        };
      }),
    );

    // Fetch document details
    const docSources = await Promise.all(
      docResults.map(async (result) => {
        const file = await ctx.runQuery(api.files.getFile, {
          fileId: result._id,
        });
        return {
          id: result._id as string,
          type: "document" as const,
          title: file?.name || "Unknown Document",
          score: result._score,
          snippet:
            file?.summary || file?.extractedText?.substring(0, 200) || "",
          fullContent: file?.extractedText?.substring(0, 1000) || "",
        };
      }),
    );

    // Combine and sort by score
    const allSources = [...noteSources, ...docSources]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Synthesize answer with source citations
    if (allSources.length > 0) {
      const contextText = allSources
        .map((s, i) => `[${i + 1}] ${s.title} (${s.type}):\n${s.fullContent}`)
        .join("\n\n");

      const chatModel = getGeminiModel();
      const synthesisPrompt = `Based on the following sources from a student's knowledge base, answer their question.
Include citation numbers like [1], [2] when referencing information from specific sources.

Sources:
${contextText}

Question: ${args.query}

Instructions:
- Answer based on the provided context
- Use [1], [2], etc. to cite which source the information came from
- If the context doesn't have enough info, say so
- Be concise and helpful`;

      const synthesisResult = await chatModel.generateContent(synthesisPrompt);
      const answer = synthesisResult.response.text();

      return {
        answer,
        sources: allSources.map((s) => ({
          id: s.id,
          type: s.type,
          title: s.title,
          score: s.score,
          snippet: s.snippet,
        })),
      };
    }

    return {
      answer:
        "I couldn't find relevant information in your notes or documents. Try rephrasing your question or upload more materials on this topic.",
      sources: [],
    };
  },
});

/**
 * Improve note content using context from linked documents
 * Returns enhanced content with inline citations
 */
export const improveNoteWithDocuments = action({
  args: {
    noteId: v.id("notes"),
    documentIds: v.array(v.id("files")),
    instruction: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    improvedContent?: string;
    citations?: Array<{
      marker: string;
      documentId: string;
      documentName: string;
    }>;
    error?: string;
  }> => {
    try {
      // Get note content
      const note = await ctx.runQuery(api.notes.getNote, {
        noteId: args.noteId,
      });
      if (!note) {
        throw new Error("Note not found");
      }

      const noteContent = note.content?.replace(/<[^>]*>/g, " ") || "";

      // Get document contents
      const documents = await Promise.all(
        args.documentIds.map(async (docId) => {
          const file = await ctx.runQuery(api.files.getFile, { fileId: docId });
          return {
            id: docId,
            name: file?.name || "Unknown",
            content: file?.extractedText?.substring(0, 5000) || "",
            summary: file?.summary || "",
          };
        }),
      );

      const validDocs = documents.filter((d) => d.content);
      if (validDocs.length === 0) {
        throw new Error(
          "No processed documents found. Please wait for document processing to complete.",
        );
      }

      // Build context from documents
      const docContext = validDocs
        .map(
          (d, i) =>
            `[${i + 1}] ${d.name}:\nSummary: ${d.summary}\nContent: ${d.content}`,
        )
        .join("\n\n---\n\n");

      const instruction =
        args.instruction ||
        "Enhance and expand the note content using information from the linked documents";

      const model = getGeminiModel();
      const prompt = `You are a helpful academic assistant. ${instruction}

Current note content:
"""
${noteContent}
"""

Reference documents:
${docContext}

Instructions:
- Enhance the note with relevant information from the documents
- Add citation markers [1], [2], etc. to indicate which document the information came from
- Keep the original structure and add new details where appropriate
- Format the output as clean, readable study notes
- Return ONLY the improved note content, no explanations`;

      const result = await model.generateContent(prompt);
      const improvedContent = result.response.text();

      // Build citations array
      const citations = validDocs.map((d, i) => ({
        marker: `[${i + 1}]`,
        documentId: d.id as string,
        documentName: d.name,
      }));

      return {
        success: true,
        improvedContent,
        citations,
      };
    } catch (error) {
      console.error("improveNoteWithDocuments error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to improve note",
      };
    }
  },
});

/**
 * Generate structured notes from a document (for drag-and-drop reference)
 * Takes a processed document and creates formatted study notes with relevant details
 */
export const generateNotesFromDocument = action({
  args: {
    fileId: v.id("files"),
    topic: v.optional(v.string()), // Optional topic to focus on
    noteStyle: v.optional(v.string()), // "summary" | "detailed" | "bullet-points" | "cornell"
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    content?: string;
    title?: string;
    sourceDocument?: {
      id: string;
      name: string;
    };
    error?: string;
  }> => {
    try {
      // Get document content
      const file = await ctx.runQuery(api.files.getFile, {
        fileId: args.fileId,
      });
      if (!file) {
        throw new Error("Document not found");
      }

      // Check if document is processed
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
        cornell:
          "Use Cornell note-taking format with cues, notes, and summary sections",
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

      // Generate a title for the notes
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

/**
 * Quick document reference - extracts key info relevant to current note context
 * Used when user drags a document while editing a note
 */
export const getDocumentReference = action({
  args: {
    fileId: v.id("files"),
    currentNoteContent: v.optional(v.string()), // Context from current note
    maxLength: v.optional(v.number()), // Max characters to return
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    reference?: {
      summary: string;
      relevantExcerpts: string[];
      citation: string;
    };
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
        throw new Error("Document not yet processed");
      }

      const documentContent = file.extractedText;
      const currentContext =
        args.currentNoteContent?.replace(/<[^>]*>/g, " ") || "";
      // maxLength is available for future use to truncate responses
      void args.maxLength; // Acknowledge but don't use yet

      const model = getGeminiModel();

      // If we have current note context, find relevant excerpts
      let prompt: string;
      if (currentContext.trim().length > 50) {
        prompt = `Given the current note context and a source document, extract the most relevant information.

Current Note Context:
"""
${currentContext.substring(0, 2000)}
"""

Source Document "${file.name}":
"""
${documentContent.substring(0, 10000)}
"""

Return a JSON response:
{
  "summary": "2-3 sentence summary of relevant content",
  "relevantExcerpts": ["excerpt 1", "excerpt 2", "excerpt 3"],
  "citation": "Brief citation format"
}

Focus on information that complements or expands on the current note topic.
Return ONLY valid JSON.`;
      } else {
        prompt = `Extract key information from this document.

Source Document "${file.name}":
"""
${documentContent.substring(0, 10000)}
"""

Return a JSON response:
{
  "summary": "2-3 sentence summary of the document",
  "relevantExcerpts": ["key point 1", "key point 2", "key point 3"],
  "citation": "${file.name}"
}

Return ONLY valid JSON.`;
      }

      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to parse AI response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        success: true,
        reference: {
          summary: parsed.summary || file.summary || "",
          relevantExcerpts: parsed.relevantExcerpts || [],
          citation: parsed.citation || file.name,
        },
      };
    } catch (error) {
      console.error("getDocumentReference error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get reference",
      };
    }
  },
});

/**
 * Ingest a PDF and immediately generate flashcards from its content.
 * Used by the "Bottom 20%" drop zone for quick flashcard generation.
 *
 * Chain: Extract PDF text -> Generate flashcards -> Save to database
 */
export const ingestAndGenerateFlashcards = action({
  args: {
    pdfBase64: v.optional(v.string()),
    storageId: v.optional(v.string()),
    fileName: v.string(),
    courseId: v.optional(v.string()),
    cardCount: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    deckId?: string;
    cardCount?: number;
    error?: string;
  }> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable not set");
    }

    try {
      let pdfBase64 = args.pdfBase64;

      // If storageId is provided, fetch the file from storage
      if (args.storageId) {
        const blob = await ctx.storage.get(args.storageId as Id<"_storage">);
        if (!blob) {
          throw new Error("Failed to retrieve file from storage");
        }
        const arrayBuffer = await blob.arrayBuffer();
        pdfBase64 = Buffer.from(arrayBuffer).toString("base64");
      }

      if (!pdfBase64) {
        throw new Error("No PDF content provided");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      // Step 1: Extract text from PDF using Gemini's native PDF processing
      const extractionResult = await model.generateContent([
        {
          inlineData: {
            mimeType: "application/pdf",
            data: pdfBase64,
          },
        },
        {
          text: `Extract the complete text content from this PDF document for flashcard generation.

EXTRACTION GUIDELINES:
1. **Preserve Structure**: Maintain headings, sections, and logical organization
2. **Handle Page Breaks**: Continue concepts that span multiple pages seamlessly
3. **Capture Definitions**: Pay special attention to terms, definitions, and key concepts
4. **Include Context**: Keep explanations and examples that clarify concepts
5. **Preserve Lists**: Maintain bullet points and numbered lists intact
6. **Tables & Formulas**: Extract table data and mathematical formulas accurately
7. **Multi-Column Content**: Read in logical order (left-to-right, top-to-bottom)
8. **Important Details**: Include dates, names, numbers, and specific facts

Focus on content that would be valuable for study flashcards:
- Definitions and terminology
- Key concepts and principles
- Important facts and figures
- Cause-and-effect relationships
- Processes and procedures
- Comparisons and contrasts

Return ONLY the extracted text with preserved structure. Use markdown for headings (# ## ###) and lists (- or 1.).`,
        },
      ]);

      const extractedText = extractionResult.response.text().trim();

      if (!extractedText || extractedText.length < 50) {
        throw new Error("Could not extract sufficient text from PDF");
      }

      // Step 2: Generate flashcards with exam-focused prompt
      const count = args.cardCount || 10;
      const flashcardPrompt = `[Context: ${extractedText.substring(0, 15000)}]

Generate ${count} flashcards focusing on exam-worthy definitions, key concepts, and important facts.

Return a JSON array with this exact structure:
[
  {"front": "Question or term to test", "back": "Clear, concise answer or definition"},
  {"front": "Question or term to test", "back": "Clear, concise answer or definition"}
]

Rules:
- Focus on definitions and key concepts that would appear on an exam
- Questions should be direct and test recall
- Answers should be memorable and concise
- Cover the most important content evenly
- Return ONLY valid JSON, no markdown or explanation
- IMPORTANT: Escape all newlines in string properties as \\n. Do not use literal control characters.`;

      const flashcardResult = await model.generateContent(flashcardPrompt);
      const flashcardText = flashcardResult.response.text().trim();

      const jsonMatch = flashcardText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("Failed to parse flashcard response from AI");
      }

      const cards = JSON.parse(jsonMatch[0]) as Array<{
        front: string;
        back: string;
      }>;

      if (!cards.length) {
        throw new Error("No flashcards were generated");
      }

      // Step 3: Save flashcards with immediate review dates
      const deckTitle = args.fileName.replace(/\.pdf$/i, "") + " - Quick Cards";

      const deckId = await ctx.runMutation(
        api.flashcards.createDeckWithCardsImmediate,
        {
          title: deckTitle,
          sourceFileName: args.fileName,
          courseId: args.courseId,
          cards: cards,
        },
      );

      return {
        success: true,
        deckId,
        cardCount: cards.length,
      };
    } catch (error) {
      console.error("ingestAndGenerateFlashcards error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate flashcards from PDF",
      };
    }
  },
});

/**
 * Ask a question about a specific file's content
 * Uses the file's extractedText to scope AI responses to that document
 */
export const askAboutFile = action({
  args: {
    fileId: v.id("files"),
    question: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    answer?: string;
    error?: string;
  }> => {
    try {
      // Fetch the file
      const file = await ctx.runQuery(api.files.getFile, {
        fileId: args.fileId,
      });

      if (!file) {
        return {
          success: false,
          error: "File not found",
        };
      }

      if (!file.extractedText) {
        return {
          success: false,
          error:
            "This file hasn't been processed yet. Please wait for processing to complete.",
        };
      }

      const model = getGeminiModel();

      const prompt = `You are Lumina AI, a helpful academic assistant. Answer the following question based ONLY on the provided document content.

Document: "${file.name}"
Content:
"""
${file.extractedText.substring(0, 15000)}
"""

Question: ${args.question}

Instructions:
- Answer based ONLY on the provided document content
- If the document doesn't contain information to answer the question, say so clearly
- Be concise but thorough
- Use specific quotes or references from the document when helpful
- Format your response with markdown for clarity`;

      const result = await model.generateContent(prompt);
      const answer = result.response.text();

      return {
        success: true,
        answer,
      };
    } catch (error) {
      console.error("askAboutFile error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to answer question",
      };
    }
  },
});

/**
 * Ingest a PDF and immediately generate study notes from its content.
 * Used by the "Top 80%" drop zone for quick note generation.
 *
 * Chain: Extract PDF text -> Generate structured notes -> Save to database
 */
export const ingestAndGenerateNote = action({
  args: {
    pdfBase64: v.optional(v.string()),
    storageId: v.optional(v.string()),
    fileName: v.string(),
    courseId: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    noteId?: string;
    title?: string;
    error?: string;
  }> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: "GEMINI_API_KEY environment variable not set",
      };
    }

    try {
      let pdfBase64 = args.pdfBase64;

      // If storageId is provided, fetch the file from storage
      if (args.storageId) {
        const blob = await ctx.storage.get(args.storageId as Id<"_storage">);
        if (!blob) {
          throw new Error("Failed to retrieve file from storage");
        }
        const arrayBuffer = await blob.arrayBuffer();
        pdfBase64 = Buffer.from(arrayBuffer).toString("base64");
      }

      if (!pdfBase64) {
        throw new Error("No PDF content provided");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      // Step 1: Extract text and generate notes from PDF using Gemini's native PDF processing
      const noteGenerationResult = await model.generateContent([
        {
          inlineData: {
            mimeType: "application/pdf",
            data: pdfBase64,
          },
        },
        {
          text: `You are an expert academic note-taker with extensive experience creating comprehensive study materials. Analyze this PDF document thoroughly and create detailed, exam-ready study notes.

Generate a JSON response with this structure:
{
  "title": "A clear, descriptive title that captures the main topic (max 10 words)",
  "content": "Comprehensive study notes in HTML format"
}

DOCUMENT ANALYSIS REQUIREMENTS:
1. **Read Across Page Breaks**: Treat the document as a continuous whole, not separate pages
2. **Preserve Document Structure**: Maintain the original heading hierarchy and organization
3. **Handle Multi-Column Layouts**: Read in logical order (left-to-right, top-to-bottom)
4. **Extract Tables**: Convert tables to HTML <table> format with proper <thead> and <tbody>
5. **Preserve Code Blocks**: Wrap code in <pre><code> tags with proper formatting
6. **Mathematical Formulas**: Keep formulas intact (use LaTeX notation if present)
7. **Lists and Bullets**: Maintain all list structures from the original document
8. **Diagrams and Figures**: Reference them by description if text-based explanations exist

For the content field, create DETAILED notes using this HTML structure:

<h2>📋 Executive Summary</h2>
<p>A 3-4 sentence overview explaining what this document covers, its purpose, and why it matters. Include document type (textbook chapter, lecture notes, research paper, etc.).</p>

<h2>🎯 Key Concepts & Definitions</h2>
<ul>
<li><strong>Term 1</strong>: Complete definition with context, examples, and how it relates to other concepts</li>
<li><strong>Term 2</strong>: Full explanation including practical applications and significance</li>
<li><strong>Term 3</strong>: Detailed description with any formulas, processes, or procedures</li>
</ul>

<h2>📚 Main Content</h2>
<h3>Section 1: [Actual Section Title from Document]</h3>
<p>Detailed explanation of the topic with SPECIFIC information from the document:</p>
<ul>
<li><strong>Key Point</strong>: Explanation with supporting details, facts, figures, dates, or names</li>
<li><strong>Important Concept</strong>: Description with examples, evidence, or real-world applications</li>
<li><strong>Process/Procedure</strong>: Step-by-step explanation if applicable</li>
</ul>

<h3>Section 2: [Next Section Title]</h3>
<p>Continue with thorough coverage of all major sections from the document...</p>

<h3>Tables and Data</h3>
<table>
<thead>
<tr><th>Column 1</th><th>Column 2</th></tr>
</thead>
<tbody>
<tr><td>Data 1</td><td>Data 2</td></tr>
</tbody>
</table>
<p>Explanation of the table and its significance.</p>

<h3>Code Examples (if applicable)</h3>
<pre><code>// Preserve any code blocks from the document
function example() {
  return "formatted code";
}
</code></pre>
<p>Explanation of what the code does and why it matters.</p>

<h2>🔗 Connections & Relationships</h2>
<ul>
<li><strong>Concept A relates to Concept B</strong>: Explain how different ideas connect</li>
<li><strong>Cause and Effect</strong>: Describe causal relationships between concepts</li>
<li><strong>Comparisons</strong>: Highlight similarities and differences between related topics</li>
</ul>

<h2>💡 Important Takeaways</h2>
<ul>
<li><strong>Key Insight 1</strong>: Why it matters and practical implications</li>
<li><strong>Key Insight 2</strong>: Real-world applications or significance</li>
<li><strong>Key Insight 3</strong>: Common misconceptions or important distinctions</li>
<li><strong>Exam Focus</strong>: Topics most likely to appear on tests or assessments</li>
</ul>

<h2>❓ Review Questions</h2>
<ul>
<li><strong>Definition</strong>: What is [key term] and why is it important?</li>
<li><strong>Application</strong>: How would you apply [concept] in [scenario]?</li>
<li><strong>Analysis</strong>: How does [X] relate to [Y]?</li>
<li><strong>Comparison</strong>: What are the differences between [A] and [B]?</li>
<li><strong>Synthesis</strong>: How do these concepts work together to explain [phenomenon]?</li>
</ul>

CRITICAL EXTRACTION REQUIREMENTS:
✓ Extract SPECIFIC information: names, dates, numbers, formulas, examples, citations
✓ Include ALL major topics and subtopics - don't skip sections
✓ Preserve original structure: if document has 5 sections, notes should cover all 5
✓ Handle page breaks: continue concepts seamlessly across pages
✓ Tables: convert to proper HTML table format
✓ Code blocks: wrap in <pre><code> tags
✓ Formulas: preserve using appropriate notation
✓ Lists: maintain bullet points and numbered lists
✓ Provide thorough explanations, not surface-level summaries
✓ Add context and connections between ideas
✓ Create 5-7 review questions based on actual content
✓ Use <strong> for key terms and <em> for emphasis
✓ Use <blockquote> for important quotes or definitions
✓ Return ONLY valid JSON, no markdown code fences
✓ IMPORTANT: Escape all newlines in the "content" string as \\n
✓ IMPORTANT: Escape all quotes in HTML attributes and content`,
        },
      ]);

      const responseText = noteGenerationResult.response.text().trim();

      // Strip markdown code fences if present (```json ... ```)
      let cleanedResponse = responseText;
      const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        cleanedResponse = codeBlockMatch[1].trim();
      }

      // Parse the JSON response
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to parse note generation response from AI");
      }

      let parsed;
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (error) {
        console.error("JSON parse error:", error);
        console.error("Response text was:", responseText);
        // Attempt to clean newlines inside strings if possible, or fail gracefully
        throw new Error(
          "AI generated invalid JSON (control characters). Please try again.",
        );
      }
      const noteTitle =
        parsed.title || `Notes from ${args.fileName.replace(/\.pdf$/i, "")}`;
      const noteContent = parsed.content || "";

      if (!noteContent || noteContent.length < 100) {
        throw new Error("Could not generate sufficient notes from PDF content");
      }

      // Step 2: Create the note in the database
      const noteId = await ctx.runMutation(api.notes.createNote, {
        title: noteTitle,
        courseId: args.courseId,
      });

      // Step 3: Update the note with the generated content
      await ctx.runMutation(api.notes.updateNote, {
        noteId,
        content: noteContent,
      });

      return {
        success: true,
        noteId: noteId as string,
        title: noteTitle,
      };
    } catch (error) {
      console.error("ingestAndGenerateNote error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate notes from PDF",
      };
    }
  },
});

/**
 * Extract mathematical formulas from an image using Gemini Vision.
 * Supports both printed and handwritten formulas.
 * PREMIUM FEATURE: Requires Scholar tier (advanced-formula)
 */
export const extractFormulaFromImage = action({
  args: {
    imageBase64: v.string(),
    mimeType: v.string(),
    courseContext: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    latex?: string;
    description?: string;
    confidence?: "high" | "medium" | "low";
    error?: string;
    requiresUpgrade?: boolean;
  }> => {
    // Check tier access for advanced formula feature
    const tierCheck = await checkTierAccess();
    if (!tierCheck.allowed) {
      return {
        success: false,
        error: tierCheck.error,
        requiresUpgrade: true,
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable not set");
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

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

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: args.mimeType,
            data: args.imageBase64,
          },
        },
      ]);

      const responseText = result.response.text().trim();

      // Parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          success: false,
          error: "Failed to parse formula recognition response",
        };
      }

      const data = JSON.parse(jsonMatch[0]) as {
        latex: string;
        description: string;
        confidence: "high" | "medium" | "low";
        multipleFormulas?: boolean;
        formulas?: Array<{ latex: string; description: string }>;
      };

      if (!data.latex && !data.multipleFormulas) {
        return {
          success: false,
          error: data.description || "No formula detected in the image",
        };
      }

      // If multiple formulas, combine them
      let finalLatex = data.latex;
      if (data.multipleFormulas && data.formulas && data.formulas.length > 0) {
        finalLatex = data.formulas.map((f) => f.latex).join("\n\n");
      }

      return {
        success: true,
        latex: finalLatex,
        description: data.description,
        confidence: data.confidence,
      };
    } catch (error) {
      console.error("extractFormulaFromImage error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to extract formula from image",
      };
    }
  },
});





