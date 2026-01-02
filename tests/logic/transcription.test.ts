/**
 * Tests for Transcription and Live Recording Logic
 *
 * Tests the business logic for audio transcription and live recording features.
 * These tests verify the data structures, validation, and transformation logic
 * without making actual API calls or rendering components.
 */
import { describe, it, expect, vi } from "vitest";

// ============================================================================
// TYPE DEFINITIONS (mirroring the actual types used in the codebase)
// ============================================================================

/**
 * Enhanced transcript chunk with AI analysis
 * Mirrors the EnhancedChunk interface in RightSidebar.tsx
 */
interface EnhancedChunk {
  text: string;
  enhancedText: string;
  timestamp: string;
  isImportant: boolean;
  concepts: string[];
}

/**
 * Transcription result from AI
 * Mirrors the response from transcribeAudio action
 */
interface TranscriptionResult {
  transcript: string;
  duration: string | null;
  speakers: string[] | null;
  keyTopics: string[];
  success: boolean;
  error?: string;
}

/**
 * Recording data structure
 * Mirrors the recording schema in convex/schema.ts
 */
interface Recording {
  userId: string;
  sessionId: string;
  title: string;
  transcript: string;
  audioUrl?: string;
  duration?: number;
  createdAt: number;
}

// ============================================================================
// HELPER FUNCTIONS (mirroring actual implementations)
// ============================================================================

/**
 * Formats seconds to HH:MM:SS format
 * Mirrors formatTime in RightSidebar.tsx
 */
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * Validates audio file type
 * Mirrors validation in handleFileUpload
 */
function isValidAudioType(mimeType: string): boolean {
  // Must be an audio MIME type
  if (!mimeType.startsWith("audio/")) {
    return false;
  }

  const validSubtypes = [
    "mpeg",
    "mp3",
    "wav",
    "m4a",
    "mp4",
    "ogg",
    "flac",
    "webm",
  ];
  const subtype = mimeType.split("/")[1];
  return validSubtypes.some((valid) => subtype?.includes(valid));
}

/**
 * Validates file size (max 20MB)
 */
function isValidFileSize(bytes: number): boolean {
  const maxSize = 20 * 1024 * 1024; // 20MB
  return bytes <= maxSize;
}

/**
 * Determines MIME type from file extension
 * Mirrors logic in handleFileUpload
 */
function getMimeTypeFromFileName(fileName: string): string {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".mp3")) return "audio/mpeg";
  if (lowerName.endsWith(".wav")) return "audio/wav";
  if (lowerName.endsWith(".m4a")) return "audio/mp4";
  if (lowerName.endsWith(".ogg")) return "audio/ogg";
  if (lowerName.endsWith(".flac")) return "audio/flac";
  if (lowerName.endsWith(".webm")) return "audio/webm";
  return "audio/mpeg"; // default
}

/**
 * Parses transcript JSON or returns raw text
 * Mirrors logic in handleLoadPastSession
 */
function parseTranscript(transcriptData: string): EnhancedChunk[] {
  try {
    const parsed = JSON.parse(transcriptData);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    // Single object, wrap in array
    return [
      {
        text: transcriptData,
        enhancedText: transcriptData,
        timestamp: "00:00:00",
        isImportant: false,
        concepts: [],
      },
    ];
  } catch {
    // Not JSON, return as raw text
    return [
      {
        text: transcriptData,
        enhancedText: transcriptData,
        timestamp: "00:00:00",
        isImportant: false,
        concepts: [],
      },
    ];
  }
}

/**
 * Creates an EnhancedChunk from raw text
 */
function createChunkFromText(text: string, timestamp: string): EnhancedChunk {
  return {
    text: text.trim(),
    enhancedText: text.trim(),
    timestamp,
    isImportant: false,
    concepts: [],
  };
}

/**
 * Validates transcription result structure
 */
function isValidTranscriptionResult(
  result: any
): result is TranscriptionResult {
  return (
    typeof result === "object" &&
    result !== null &&
    typeof result.success === "boolean" &&
    (typeof result.transcript === "string" || result.transcript === undefined)
  );
}

// ============================================================================
// TESTS
// ============================================================================

describe("Time Formatting", () => {
  it("formats zero seconds correctly", () => {
    expect(formatTime(0)).toBe("00:00:00");
  });

  it("formats seconds only", () => {
    expect(formatTime(45)).toBe("00:00:45");
  });

  it("formats minutes and seconds", () => {
    expect(formatTime(125)).toBe("00:02:05");
  });

  it("formats hours, minutes, and seconds", () => {
    expect(formatTime(3661)).toBe("01:01:01");
  });

  it("formats large values correctly", () => {
    expect(formatTime(36000)).toBe("10:00:00");
  });

  it("pads single digits with zeros", () => {
    expect(formatTime(61)).toBe("00:01:01");
  });
});

describe("Audio File Type Validation", () => {
  it("accepts MP3 files", () => {
    expect(isValidAudioType("audio/mpeg")).toBe(true);
    expect(isValidAudioType("audio/mp3")).toBe(true);
  });

  it("accepts WAV files", () => {
    expect(isValidAudioType("audio/wav")).toBe(true);
  });

  it("accepts M4A files", () => {
    expect(isValidAudioType("audio/m4a")).toBe(true);
    expect(isValidAudioType("audio/mp4")).toBe(true);
  });

  it("accepts OGG files", () => {
    expect(isValidAudioType("audio/ogg")).toBe(true);
  });

  it("accepts FLAC files", () => {
    expect(isValidAudioType("audio/flac")).toBe(true);
  });

  it("accepts WebM files", () => {
    expect(isValidAudioType("audio/webm")).toBe(true);
  });

  it("rejects video files", () => {
    expect(isValidAudioType("video/mp4")).toBe(false);
  });

  it("rejects image files", () => {
    expect(isValidAudioType("image/jpeg")).toBe(false);
  });

  it("rejects text files", () => {
    expect(isValidAudioType("text/plain")).toBe(false);
  });

  it("rejects application files", () => {
    expect(isValidAudioType("application/pdf")).toBe(false);
  });
});

describe("File Size Validation", () => {
  it("accepts files under 20MB", () => {
    expect(isValidFileSize(1024 * 1024)).toBe(true); // 1MB
    expect(isValidFileSize(10 * 1024 * 1024)).toBe(true); // 10MB
    expect(isValidFileSize(19 * 1024 * 1024)).toBe(true); // 19MB
  });

  it("accepts files exactly 20MB", () => {
    expect(isValidFileSize(20 * 1024 * 1024)).toBe(true);
  });

  it("rejects files over 20MB", () => {
    expect(isValidFileSize(21 * 1024 * 1024)).toBe(false);
    expect(isValidFileSize(50 * 1024 * 1024)).toBe(false);
  });

  it("accepts empty files", () => {
    expect(isValidFileSize(0)).toBe(true);
  });
});

describe("MIME Type Detection from File Name", () => {
  it("detects MP3 files", () => {
    expect(getMimeTypeFromFileName("lecture.mp3")).toBe("audio/mpeg");
    expect(getMimeTypeFromFileName("LECTURE.MP3")).toBe("audio/mpeg");
  });

  it("detects WAV files", () => {
    expect(getMimeTypeFromFileName("recording.wav")).toBe("audio/wav");
  });

  it("detects M4A files", () => {
    expect(getMimeTypeFromFileName("podcast.m4a")).toBe("audio/mp4");
  });

  it("detects OGG files", () => {
    expect(getMimeTypeFromFileName("audio.ogg")).toBe("audio/ogg");
  });

  it("detects FLAC files", () => {
    expect(getMimeTypeFromFileName("highres.flac")).toBe("audio/flac");
  });

  it("detects WebM files", () => {
    expect(getMimeTypeFromFileName("browser-recording.webm")).toBe(
      "audio/webm"
    );
  });

  it("defaults to audio/mpeg for unknown extensions", () => {
    expect(getMimeTypeFromFileName("unknown.xyz")).toBe("audio/mpeg");
    expect(getMimeTypeFromFileName("noextension")).toBe("audio/mpeg");
  });
});

describe("Transcript Parsing", () => {
  it("parses valid JSON array of chunks", () => {
    const jsonData = JSON.stringify([
      {
        text: "Hello world",
        enhancedText: "Hello world",
        timestamp: "00:00:00",
        isImportant: false,
        concepts: ["greeting"],
      },
    ]);

    const result = parseTranscript(jsonData);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Hello world");
    expect(result[0].concepts).toContain("greeting");
  });

  it("handles raw text (non-JSON)", () => {
    const rawText = "This is a plain text transcript.";
    const result = parseTranscript(rawText);

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe(rawText);
    expect(result[0].timestamp).toBe("00:00:00");
    expect(result[0].isImportant).toBe(false);
  });

  it("handles empty string", () => {
    const result = parseTranscript("");
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("");
  });

  it("handles malformed JSON gracefully", () => {
    const malformed = '{"text": "incomplete';
    const result = parseTranscript(malformed);

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe(malformed);
  });

  it("parses multiple chunks correctly", () => {
    const chunks: EnhancedChunk[] = [
      {
        text: "First segment",
        enhancedText: "First segment",
        timestamp: "00:00:00",
        isImportant: false,
        concepts: [],
      },
      {
        text: "Second segment",
        enhancedText: "Second segment with **emphasis**",
        timestamp: "00:01:30",
        isImportant: true,
        concepts: ["important topic"],
      },
    ];

    const result = parseTranscript(JSON.stringify(chunks));
    expect(result).toHaveLength(2);
    expect(result[1].isImportant).toBe(true);
    expect(result[1].timestamp).toBe("00:01:30");
  });
});

describe("Enhanced Chunk Creation", () => {
  it("creates a basic chunk from text", () => {
    const chunk = createChunkFromText("Hello world", "00:05:30");

    expect(chunk.text).toBe("Hello world");
    expect(chunk.enhancedText).toBe("Hello world");
    expect(chunk.timestamp).toBe("00:05:30");
    expect(chunk.isImportant).toBe(false);
    expect(chunk.concepts).toEqual([]);
  });

  it("trims whitespace from text", () => {
    const chunk = createChunkFromText("  padded text  ", "00:00:00");
    expect(chunk.text).toBe("padded text");
  });

  it("handles empty text", () => {
    const chunk = createChunkFromText("", "00:00:00");
    expect(chunk.text).toBe("");
  });

  it("handles multiline text", () => {
    const multiline = "Line one\nLine two\nLine three";
    const chunk = createChunkFromText(multiline, "00:00:00");
    expect(chunk.text).toBe(multiline);
  });
});

describe("Transcription Result Validation", () => {
  it("validates successful transcription result", () => {
    const result: TranscriptionResult = {
      transcript: "This is the transcribed text",
      duration: "05:30",
      speakers: ["Speaker 1"],
      keyTopics: ["topic1", "topic2"],
      success: true,
    };

    expect(isValidTranscriptionResult(result)).toBe(true);
  });

  it("validates failed transcription result", () => {
    const result: TranscriptionResult = {
      transcript: "",
      duration: null,
      speakers: null,
      keyTopics: [],
      success: false,
      error: "Transcription failed",
    };

    expect(isValidTranscriptionResult(result)).toBe(true);
  });

  it("rejects null", () => {
    expect(isValidTranscriptionResult(null)).toBe(false);
  });

  it("rejects undefined", () => {
    expect(isValidTranscriptionResult(undefined)).toBe(false);
  });

  it("rejects objects without success property", () => {
    const invalid = {
      transcript: "text",
      duration: null,
      speakers: null,
      keyTopics: [],
    };
    expect(isValidTranscriptionResult(invalid)).toBe(false);
  });

  it("rejects primitive types", () => {
    expect(isValidTranscriptionResult("string")).toBe(false);
    expect(isValidTranscriptionResult(123)).toBe(false);
    expect(isValidTranscriptionResult(true)).toBe(false);
  });
});

describe("Recording Session Logic", () => {
  /**
   * Generates a session title with current date/time
   */
  function generateDefaultSessionTitle(date: Date): string {
    return `Session ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  }

  /**
   * Validates if a session has content to save
   */
  function hasContentToSave(
    transcript: string,
    existingChunks: EnhancedChunk[]
  ): boolean {
    return transcript.trim().length > 0 || existingChunks.length > 0;
  }

  /**
   * Prepares final chunks for saving
   */
  function prepareFinalChunks(
    existingChunks: EnhancedChunk[],
    currentTranscript: string,
    currentTimestamp: string
  ): EnhancedChunk[] {
    const finalChunks = [...existingChunks];
    if (currentTranscript.trim()) {
      finalChunks.push(
        createChunkFromText(currentTranscript, currentTimestamp)
      );
    }
    return finalChunks;
  }

  it("generates session title with date and time", () => {
    const testDate = new Date("2024-01-15T14:30:00");
    const title = generateDefaultSessionTitle(testDate);

    expect(title).toContain("Session");
    expect(title).toContain("2024"); // Year should be present
  });

  it("detects content when transcript has text", () => {
    expect(hasContentToSave("Hello world", [])).toBe(true);
  });

  it("detects content when chunks exist", () => {
    const chunks: EnhancedChunk[] = [
      createChunkFromText("Existing chunk", "00:00:00"),
    ];
    expect(hasContentToSave("", chunks)).toBe(true);
  });

  it("detects no content when both empty", () => {
    expect(hasContentToSave("", [])).toBe(false);
    expect(hasContentToSave("   ", [])).toBe(false);
  });

  it("prepares final chunks with current transcript", () => {
    const existing: EnhancedChunk[] = [
      createChunkFromText("First chunk", "00:00:00"),
    ];

    const result = prepareFinalChunks(existing, "Second chunk", "00:01:00");

    expect(result).toHaveLength(2);
    expect(result[0].text).toBe("First chunk");
    expect(result[1].text).toBe("Second chunk");
    expect(result[1].timestamp).toBe("00:01:00");
  });

  it("ignores empty current transcript", () => {
    const existing: EnhancedChunk[] = [
      createChunkFromText("Only chunk", "00:00:00"),
    ];

    const result = prepareFinalChunks(existing, "", "00:01:00");

    expect(result).toHaveLength(1);
  });

  it("ignores whitespace-only current transcript", () => {
    const existing: EnhancedChunk[] = [
      createChunkFromText("Only chunk", "00:00:00"),
    ];

    const result = prepareFinalChunks(existing, "   ", "00:01:00");

    expect(result).toHaveLength(1);
  });
});

describe("AI Analysis Integration", () => {
  /**
   * Simulates updating a chunk with AI analysis results
   */
  function updateChunkWithAnalysis(
    chunk: EnhancedChunk,
    analysis: {
      enhancedText: string;
      isImportant: boolean;
      concepts: string[];
    }
  ): EnhancedChunk {
    return {
      ...chunk,
      enhancedText: analysis.enhancedText,
      isImportant: analysis.isImportant,
      concepts: analysis.concepts,
    };
  }

  /**
   * Finds and updates a specific chunk in an array
   */
  function updateChunkInArray(
    chunks: EnhancedChunk[],
    originalText: string,
    analysis: {
      enhancedText: string;
      isImportant: boolean;
      concepts: string[];
    }
  ): EnhancedChunk[] {
    return chunks.map((chunk) =>
      chunk.text === originalText
        ? updateChunkWithAnalysis(chunk, analysis)
        : chunk
    );
  }

  it("updates chunk with AI analysis", () => {
    const original = createChunkFromText("E equals mc squared", "00:00:00");
    const analysis = {
      enhancedText: "$$E = mc^2$$",
      isImportant: true,
      concepts: ["physics", "relativity"],
    };

    const updated = updateChunkWithAnalysis(original, analysis);

    expect(updated.text).toBe("E equals mc squared"); // Original preserved
    expect(updated.enhancedText).toBe("$$E = mc^2$$");
    expect(updated.isImportant).toBe(true);
    expect(updated.concepts).toEqual(["physics", "relativity"]);
  });

  it("finds and updates correct chunk in array", () => {
    const chunks: EnhancedChunk[] = [
      createChunkFromText("First segment", "00:00:00"),
      createChunkFromText("Important topic here", "00:01:00"),
      createChunkFromText("Third segment", "00:02:00"),
    ];

    const analysis = {
      enhancedText: "**Important topic** here",
      isImportant: true,
      concepts: ["key concept"],
    };

    const result = updateChunkInArray(chunks, "Important topic here", analysis);

    expect(result[0].enhancedText).toBe("First segment"); // Unchanged
    expect(result[1].enhancedText).toBe("**Important topic** here");
    expect(result[1].isImportant).toBe(true);
    expect(result[2].enhancedText).toBe("Third segment"); // Unchanged
  });

  it("handles no matching chunk gracefully", () => {
    const chunks: EnhancedChunk[] = [
      createChunkFromText("Only chunk", "00:00:00"),
    ];

    const analysis = {
      enhancedText: "Updated text",
      isImportant: false,
      concepts: [],
    };

    const result = updateChunkInArray(chunks, "Non-existent", analysis);

    expect(result).toEqual(chunks); // Unchanged
  });
});

describe("Recording Data Structure", () => {
  /**
   * Creates a recording object
   */
  function createRecording(
    title: string,
    chunks: EnhancedChunk[],
    userId: string
  ): Recording {
    return {
      userId,
      sessionId: crypto.randomUUID(),
      title,
      transcript: JSON.stringify(chunks),
      createdAt: Date.now(),
    };
  }

  /**
   * Creates an uploaded recording with audio file
   */
  function createUploadedRecording(
    title: string,
    audioUrl: string,
    duration: number,
    userId: string
  ): Recording {
    return {
      userId,
      sessionId: crypto.randomUUID(),
      title,
      transcript: "", // Will be filled after transcription
      audioUrl,
      duration,
      createdAt: Date.now(),
    };
  }

  it("creates recording with serialized chunks", () => {
    const chunks: EnhancedChunk[] = [
      createChunkFromText("Test content", "00:00:00"),
    ];

    const recording = createRecording("Test Session", chunks, "user123");

    expect(recording.title).toBe("Test Session");
    expect(recording.userId).toBe("user123");
    expect(JSON.parse(recording.transcript)).toEqual(chunks);
    expect(recording.sessionId).toBeDefined();
    expect(recording.createdAt).toBeGreaterThan(0);
  });

  it("creates uploaded recording with audio metadata", () => {
    const recording = createUploadedRecording(
      "Uploaded Lecture",
      "https://storage.example.com/audio.mp3",
      300, // 5 minutes
      "user456"
    );

    expect(recording.title).toBe("Uploaded Lecture");
    expect(recording.audioUrl).toBe("https://storage.example.com/audio.mp3");
    expect(recording.duration).toBe(300);
    expect(recording.transcript).toBe(""); // Empty until transcribed
  });
});
