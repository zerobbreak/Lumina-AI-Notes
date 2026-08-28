"use node";

import { action, type ActionCtx } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  ELEVENLABS_ISOLATION_URL,
  ISOLATED_AUDIO_MIME,
  ISOLATION_TIMEOUT_MS,
  MAX_ISOLATION_BYTES,
  isolationErrorMessage,
  isolationFileName,
  shouldAttemptIsolation,
  transcribeIsolatedWithFallback,
} from "./shared/audioIsolation";

const isolateAndTranscribeResult = v.object({
  transcript: v.string(),
  success: v.boolean(),
  isolated: v.boolean(),
  isolatedStorageId: v.optional(v.id("_storage")),
  error: v.optional(v.string()),
});

type IsolateAndTranscribeResult = {
  transcript: string;
  success: boolean;
  isolated: boolean;
  isolatedStorageId?: Id<"_storage">;
  error?: string;
};

type TranscribeAudioResult = {
  transcript: string;
  success: boolean;
  error?: string;
};

async function isolateStoredAudio(
  ctx: ActionCtx,
  args: { storageId: Id<"_storage">; mimeType: string },
): Promise<
  | { ok: true; storageId: Id<"_storage"> }
  | { ok: false; error: string }
> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "ELEVENLABS_API_KEY environment variable not set",
    };
  }

  const source = await ctx.storage.get(args.storageId);
  if (!source) {
    return { ok: false, error: "Audio file not found in storage." };
  }

  const sourceBytes = await source.arrayBuffer();
  if (!shouldAttemptIsolation(sourceBytes.byteLength)) {
    return {
      ok: false,
      error:
        sourceBytes.byteLength > MAX_ISOLATION_BYTES
          ? "That recording is too large to isolate."
          : "Recording is too short to isolate.",
    };
  }

  const mimeType = args.mimeType || source.type || "application/octet-stream";
  const form = new FormData();
  form.append(
    "audio",
    new Blob([new Uint8Array(sourceBytes)], { type: mimeType }),
    isolationFileName(mimeType),
  );
  form.append("file_format", "other");

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), ISOLATION_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(ELEVENLABS_ISOLATION_URL, {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: form,
      signal: abort.signal,
    });
  } catch (error) {
    const aborted =
      (error instanceof Error && error.name === "AbortError") ||
      abort.signal.aborted;
    return {
      ok: false,
      error: aborted
        ? "Audio isolation timed out. Try a shorter recording."
        : "Couldn't reach ElevenLabs for audio isolation.",
    };
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    console.error(
      `[isolateAudio] ElevenLabs ${response.status}: ${bodyText.slice(0, 400)}`,
    );
    return { ok: false, error: isolationErrorMessage(response.status, bodyText) };
  }

  const isolatedBytes = await response.arrayBuffer();
  if (isolatedBytes.byteLength < 256) {
    return { ok: false, error: "Isolated audio was empty." };
  }

  const isolatedStorageId = await ctx.storage.store(
    new Blob([new Uint8Array(isolatedBytes)], { type: ISOLATED_AUDIO_MIME }),
  );
  return { ok: true, storageId: isolatedStorageId };
}

/**
 * Strip background noise from a stored recording via ElevenLabs Voice Isolator,
 * then transcribe the isolated speech. Falls back to the original audio when
 * isolation is unavailable so a session is never lost.
 */
export const isolateAndTranscribe = action({
  args: {
    storageId: v.id("_storage"),
    mimeType: v.string(),
    courseContext: v.optional(v.string()),
    fallbackToOriginal: v.optional(v.boolean()),
  },
  returns: isolateAndTranscribeResult,
  handler: async (ctx, args): Promise<IsolateAndTranscribeResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        transcript: "",
        success: false,
        isolated: false,
        error: "Not authenticated",
      };
    }

    const isolated = await isolateStoredAudio(ctx, {
      storageId: args.storageId,
      mimeType: args.mimeType,
    });

    if (!isolated.ok && !args.fallbackToOriginal) {
      return {
        transcript: "",
        success: false,
        isolated: false,
        error: isolated.error,
      };
    }

    const transcribe = async (
      storageId: Id<"_storage">,
      mimeType: string,
    ): Promise<TranscribeAudioResult> =>
      (await ctx.runAction(api.ai.transcribeAudio, {
        storageId,
        mimeType,
        courseContext: args.courseContext,
      })) as TranscribeAudioResult;

    let transcribed: TranscribeAudioResult;
    let usedIsolated = false;
    if (isolated.ok) {
      const attempt = await transcribeIsolatedWithFallback({
        isolatedStorageId: isolated.storageId,
        originalStorageId: args.storageId,
        fallbackToOriginal: args.fallbackToOriginal ?? false,
        transcribe: async (storageId) =>
          await transcribe(
            storageId,
            storageId === isolated.storageId
              ? ISOLATED_AUDIO_MIME
              : args.mimeType,
          ),
      });
      transcribed = attempt.result;
      usedIsolated = attempt.isolated;
    } else {
      transcribed = await transcribe(args.storageId, args.mimeType);
    }

    if (!transcribed.success || !transcribed.transcript.trim()) {
      return {
        transcript: "",
        success: false,
        isolated: usedIsolated,
        isolatedStorageId: isolated.ok ? isolated.storageId : undefined,
        error: transcribed.error || "Couldn't transcribe the isolated audio.",
      };
    }

    return {
      transcript: transcribed.transcript,
      success: true,
      isolated: usedIsolated,
      isolatedStorageId: isolated.ok ? isolated.storageId : undefined,
      error: isolated.ok ? undefined : isolated.error,
    };
  },
});
