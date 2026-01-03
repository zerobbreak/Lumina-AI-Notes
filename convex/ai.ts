"use node";

import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini client
const getGeminiModel = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable not set");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
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
        { "id": "1", "type": "input", "data": { "label": "${args.major}" }, "position": { "x": 0, "y": 0 } },
        { "id": "2", "data": { "label": "Course Name" }, "position": { "x": 100, "y": 100 } }
      ],
      "edges": [
        { "id": "e1-2", "source": "1", "target": "2", "animated": true }
      ]
    }

    Rules:
    - The central node should be the Major.
    - Branch out to Semesters or Core Areas, then to specific Courses.
    - Add "Concept" nodes for key topics within courses if relevant.
    - Use "animated": true for edges showing progression.
    - Generate reasonable (x, y) positions to minimize overlap (simulated layout).
    - Return ONLY valid JSON.
    `;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      // Extract JSON
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Failed to generate roadmap JSON");

      return JSON.parse(match[0]);
    } catch (e) {
      console.error("Roadmap generation failed", e);
      // Return a basic fallback structure
      return {
        nodes: [
          {
            id: "1",
            type: "input",
            data: { label: args.major },
            position: { x: 0, y: 0 },
          },
        ],
        edges: [],
      };
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
  },
  handler: async (ctx, args) => {
    const model = getGeminiModel();

    const prompt = `You are an expert academic note-taker with years of experience creating comprehensive study materials. Your goal is to transform this lecture transcript into detailed, exam-ready study notes.

Transcript:
"""
${args.transcript}
"""

${args.title ? `Lecture Title: ${args.title}` : ""}

Generate a JSON response with this EXACT structure:
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

    try {
      const result = await model.generateContent(prompt);
      let responseText = result.response.text().trim();

      // Remove markdown code fences if present
      responseText = responseText
        .replace(/^```json?\s*/i, "")
        .replace(/```\s*$/i, "");

      // Parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Convert simplified diagram format to ReactFlow format
        let diagramData = undefined;
        if (
          parsed.diagramNodes &&
          Array.isArray(parsed.diagramNodes) &&
          parsed.diagramNodes.length > 0
        ) {
          const nodes = parsed.diagramNodes.map(
            (label: string, index: number) => ({
              id: String(index),
              type: index === 0 ? "input" : "default",
              data: { label },
              position: {
                x: index === 0 ? 200 : 100 + (index % 3) * 150,
                y: index === 0 ? 0 : Math.floor(index / 3) * 100 + 100,
              },
            })
          );

          const edges = (parsed.diagramEdges || []).map(
            (edge: string, index: number) => {
              const [source, target] = edge.split("-");
              return { id: `e${index}`, source, target };
            }
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
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

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
    args
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
      model: "text-embedding-004",
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
      })
    );

    // Synthesize answer using found context
    if (notes.length > 0) {
      const contextText = notes
        .map(
          (n: { title: string; content: string }) =>
            `## ${n.title}\n${n.content}`
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
          })
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
export const transcribeAudio = action({
  args: {
    storageId: v.id("_storage"),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable not set");
    }

    try {
      // Fetch the audio file from Convex storage
      const audioBlob = await ctx.storage.get(args.storageId);
      if (!audioBlob) {
        throw new Error("Audio file not found in storage");
      }

      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const audioBase64 = btoa(binary);

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: args.mimeType,
            data: audioBase64,
          },
        },
        {
          text: `Transcribe this audio recording. This is a lecture or study session recording.

Instructions:
- Provide a complete and accurate transcription
- Include timestamps at natural breaks (format: [MM:SS])
- If multiple speakers are detected, label them (Speaker 1, Speaker 2, etc.)
- Preserve important terms and concepts
- Format the output as clear, readable text

Return the transcription in this JSON format:
{
  "transcript": "The full transcription text with timestamps",
  "duration": "Estimated duration in MM:SS format",
  "speakers": ["Speaker 1", "Speaker 2"] or null if single speaker,
  "keyTopics": ["Topic 1", "Topic 2", "Topic 3"]
}

Return ONLY valid JSON, no markdown code fences.`,
        },
      ]);

      const responseText = result.response.text().trim();

      // Try to parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          transcript: parsed.transcript || responseText,
          duration: parsed.duration || null,
          speakers: parsed.speakers || null,
          keyTopics: parsed.keyTopics || [],
          success: true,
        };
      }

      // Fallback: return raw text as transcript
      return {
        transcript: responseText,
        duration: null,
        speakers: null,
        keyTopics: [],
        success: true,
      };
    } catch (error) {
      console.error("transcribeAudio error:", error);
      return {
        transcript: "",
        duration: null,
        speakers: null,
        keyTopics: [],
        success: false,
        error: error instanceof Error ? error.message : "Transcription failed",
      };
    }
  },
});

/**
 * Generate flashcards from note content and save them to the database
 */
export const generateAndSaveFlashcards = action({
  args: {
    noteId: v.id("notes"),
    title: v.string(),
    count: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean;
    deckId?: string;
    cardCount?: number;
    error?: string;
  }> => {
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

    const model = getGeminiModel();
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
 * Process a document (PDF) - extract text, generate summary, and create embeddings
 * Uses pdf-parse for text extraction and Gemini for summarization
 */
export const processDocument = action({
  args: {
    fileId: v.id("files"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      // Update status to processing
      await ctx.runMutation(api.files.updateProcessingStatus, {
        fileId: args.fileId,
        status: "processing",
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
          text: `Analyze this PDF document and extract its content.

Return a JSON response with this exact structure:
{
  "extractedText": "The full text content of the document, preserving important formatting and structure",
  "summary": "2-3 sentence summary of the document",
  "keyTopics": ["topic1", "topic2", "topic3", "topic4", "topic5"]
}

Rules:
- extractedText should contain all readable text from the document
- Summary should capture the main purpose and key information
- keyTopics should be 3-7 important concepts/terms from the document
- Return ONLY valid JSON, no markdown code fences or explanation`,
        },
      ]);

      const extractionText = extractionResult.response.text().trim();

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
        model: "text-embedding-004",
      });

      // Combine summary and beginning of text for embedding
      const textForEmbedding = `${summary}\n\n${extractedText.substring(0, 5000)}`;
      const embeddingResult =
        await embeddingModel.embedContent(textForEmbedding);
      const embedding = embeddingResult.embedding.values;

      // Save extracted content
      await ctx.runMutation(api.files.saveExtractedContent, {
        fileId: args.fileId,
        extractedText: extractedText.substring(0, 50000), // Limit stored text
        summary,
        keyTopics,
        embedding,
      });

      return { success: true };
    } catch (error) {
      console.error("processDocument error:", error);

      // Update status to error
      await ctx.runMutation(api.files.updateProcessingStatus, {
        fileId: args.fileId,
        status: "error",
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
    args
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
      model: "text-embedding-004",
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
      })
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
      })
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
    args
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
        })
      );

      const validDocs = documents.filter((d) => d.content);
      if (validDocs.length === 0) {
        throw new Error(
          "No processed documents found. Please wait for document processing to complete."
        );
      }

      // Build context from documents
      const docContext = validDocs
        .map(
          (d, i) =>
            `[${i + 1}] ${d.name}:\nSummary: ${d.summary}\nContent: ${d.content}`
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
    args
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
          "Document not yet processed. Please wait for processing to complete."
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
    args
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
      // maxLength could be used for future truncation of responses
      const _maxLength = args.maxLength || 1000;

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
    args
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
          text: `Extract the main text content from this PDF document.
          
Return the extracted text as plain text, preserving the logical structure and important information.
Focus on extractable content that would be useful for creating study flashcards.
Return ONLY the extracted text, no JSON or formatting.`,
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
        }
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
    args
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
    args
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

For the content field, create DETAILED notes using this HTML structure:

<h2>📋 Executive Summary</h2>
<p>A 3-4 sentence overview explaining what this document covers and why it matters.</p>

<h2>🎯 Key Concepts & Definitions</h2>
<ul>
<li><strong>Term 1</strong>: Complete definition with context and examples</li>
<li><strong>Term 2</strong>: Full explanation including how it relates to other concepts</li>
</ul>

<h2>📚 Main Content</h2>
<h3>Section Title</h3>
<p>Detailed explanation of the topic with specific facts, figures, and examples from the document.</p>
<ul>
<li>Important point with supporting details</li>
<li>Another key point with examples or evidence</li>
</ul>

<h2>💡 Important Takeaways</h2>
<ul>
<li>Key insight 1 - why it matters</li>
<li>Key insight 2 - practical application</li>
</ul>

<h2>❓ Review Questions</h2>
<ul>
<li>What is the main purpose of [concept]?</li>
<li>How does [X] relate to [Y]?</li>
<li>Why is [topic] significant?</li>
</ul>

CRITICAL REQUIREMENTS:
- Extract SPECIFIC information: names, dates, numbers, formulas, examples
- Include ALL major topics and subtopics from the document
- Provide thorough explanations, not just surface-level summaries
- Add context and connections between ideas
- Create 3-5 review questions based on the content
- Use <strong> for key terms and <em> for emphasis
- Return ONLY valid JSON, no markdown code fences
- IMPORTANT: Escape all newlines in the "content" string as \\n`,
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
          "AI generated invalid JSON (control characters). Please try again."
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
