import { randomUUID } from "node:crypto";
import {
  ELEVENLABS_ISOLATION_URL,
  ISOLATED_AUDIO_MIME,
  ISOLATION_TIMEOUT_MS,
  isolationFileName,
  shouldAttemptIsolation,
} from "../../ai/audioIsolationConstants.js";
import { UserFacingError } from "../../ai/errors.js";
import { getGeminiModel } from "../../ai/gemini.js";
import { MAX_TRANSCRIBE_BYTES } from "../../recordings/usage.js";
import { userPrefix, type Storage } from "../../storage/s3.js";

export type TranscribeInput = {
  storageKey: string;
  mimeType: string;
  /** Clerk user id: isolated audio is stored under the owner's prefix. */
  clerkUserId: string;
  courseContext?: string;
};

export type TranscribeKeys = { gemini?: string; elevenLabs?: string };

/**
 * Strips background noise with ElevenLabs, then has Gemini transcribe the
 * cleaner take. Moved from POST /ai/isolate-and-transcribe. Isolation is best
 * effort: if it fails, the original audio is transcribed instead.
 */
export async function transcribeAudio(
  storage: Storage,
  keys: TranscribeKeys,
  input: TranscribeInput,
  log: Pick<Console, "warn"> = console,
): Promise<{ transcript: string; isolatedStorageKey?: string }> {
  // Checked before reading any bytes: both isolation and Gemini hold the whole file in memory.
  const source = await storage.stat(input.storageKey);
  if (!source) {
    throw new UserFacingError("Audio file not found in storage. It may have been deleted.");
  }
  if (source.size > MAX_TRANSCRIBE_BYTES) {
    throw new UserFacingError(
      `Audio file is too large (${(source.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 50MB.`,
    );
  }

  const sourceBytes = await storage.getBytes(input.storageKey);
  let audio = { bytes: sourceBytes, mimeType: input.mimeType };
  let isolatedStorageKey: string | undefined;

  if (keys.elevenLabs && shouldAttemptIsolation(sourceBytes.byteLength)) {
    try {
      const isolated = await isolateSpeech(keys.elevenLabs, sourceBytes, input.mimeType);
      if (isolated) {
        // Under the user's prefix, like every other object, so they can use it later.
        isolatedStorageKey = `${userPrefix(input.clerkUserId)}isolated/${randomUUID()}.mp3`;
        await storage.put(isolatedStorageKey, Buffer.from(isolated), ISOLATED_AUDIO_MIME);
        audio = { bytes: new Uint8Array(isolated), mimeType: ISOLATED_AUDIO_MIME };
      }
    } catch (error) {
      log.warn("[transcribe] isolation failed; transcribing the original audio:", error);
    }
  }

  const gemini = getGeminiModel(keys.gemini);
  const result = await gemini.generateContent([
    { inlineData: { mimeType: audio.mimeType, data: Buffer.from(audio.bytes).toString("base64") } },
    {
      text: `Transcribe this audio file completely and accurately. Return plain text only.${
        input.courseContext ? `\nContext: ${input.courseContext}` : ""
      }`,
    },
  ]);
  return { transcript: result.response.text().trim(), isolatedStorageKey };
}

async function isolateSpeech(apiKey: string, bytes: Uint8Array, mimeType: string): Promise<ArrayBuffer | null> {
  const form = new FormData();
  form.append(
    "audio",
    new Blob([bytes], { type: mimeType || "application/octet-stream" }),
    isolationFileName(mimeType),
  );
  form.append("file_format", "other");
  const response = await fetch(ELEVENLABS_ISOLATION_URL, {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: form,
    signal: AbortSignal.timeout(ISOLATION_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`ElevenLabs isolation returned ${response.status}`);
  }
  const isolated = await response.arrayBuffer();
  return isolated.byteLength >= 256 ? isolated : null;
}
