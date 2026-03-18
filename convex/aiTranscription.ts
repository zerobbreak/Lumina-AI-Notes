"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getGeminiModel } from "./shared/aiClient";
import { api } from "./_generated/api";

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
 * Transcribe an audio file using Gemini
 * Supports MP3, WAV, M4A, OGG, FLAC formats
 * Fetches audio from Convex storage to avoid argument size limits
 */
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
          90000,
        );
        console.log(
          `[transcribeAudio] AI call time: ${Date.now() - apiStartMs}ms`,
        );
        return result.response.text().trim();
      };

      let responseText = "";
      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(
            `[transcribeAudio] Attempt ${attempt}/${maxRetries} with gemini-2.5-flash`,
          );
          responseText = await generateTranscription("gemini-2.5-flash");
          break;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          console.warn(
            `[transcribeAudio] Attempt ${attempt} failed:`,
            lastError.message,
          );

          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt - 1) * 1000;
            console.log(`[transcribeAudio] Waiting ${delay}ms before retry...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

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
        console.log("[transcribeAudio] Transcript obtained, now cleaning...");
        const cleanupResult = await ctx.runAction(
          api.aiTranscription.cleanLectureTranscript,
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
          api.aiTranscription.detectLectureSegments,
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
        console.error(
          "[transcribeAudio] Cleanup pipeline error:",
          cleanupError,
        );
      }

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
   - "pi r squared" → $$\\\\pi r^2$$
   - "3 point 14159" → $$3.14159$$
   - "equals, approximately" → $$\\\\approx$$
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
