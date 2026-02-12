import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

const AUDIO_LIMIT_MINUTES = 300;

// Helper function to get user's usage
async function getUserUsage(ctx: any, tokenIdentifier: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q: any) =>
      q.eq("tokenIdentifier", tokenIdentifier),
    )
    .unique();

  if (!user) {
    return {
      usage: {
        audioMinutesUsed: 0,
        notesCreated: 0,
        lastResetDate: Date.now(),
      },
    };
  }

  // Get or initialize usage
  const now = Date.now();
  let usage = user.monthlyUsage || {
    audioMinutesUsed: 0,
    notesCreated: 0,
    lastResetDate: now,
  };

  // Check if we need to reset monthly usage
  const lastReset = new Date(usage.lastResetDate);
  const today = new Date(now);
  const shouldReset =
    lastReset.getMonth() !== today.getMonth() ||
    lastReset.getFullYear() !== today.getFullYear();

  if (shouldReset) {
    usage = {
      audioMinutesUsed: 0,
      notesCreated: 0,
      lastResetDate: now,
    };
    // Update the user's usage in the database
    await ctx.db.patch(user._id, { monthlyUsage: usage });
  }

  return { usage, userId: user._id };
}

// Helper function to check and update audio usage
async function checkAndUpdateAudioUsage(
  ctx: any,
  tokenIdentifier: string,
  durationMinutes: number,
): Promise<{ allowed: boolean; error?: string; remaining?: number }> {
  const { usage, userId } = await getUserUsage(ctx, tokenIdentifier);
  const limit = AUDIO_LIMIT_MINUTES;

  if (limit !== Infinity) {
    const newTotal = usage.audioMinutesUsed + durationMinutes;
    if (newTotal > limit) {
      return {
        allowed: false,
        error: `Audio limit exceeded. You have ${Math.max(0, limit - usage.audioMinutesUsed).toFixed(1)} minutes remaining this month.`,
        remaining: Math.max(0, limit - usage.audioMinutesUsed),
      };
    }
  }

  // Update usage
  if (userId) {
    await ctx.db.patch(userId, {
      monthlyUsage: {
        ...usage,
        audioMinutesUsed: usage.audioMinutesUsed + durationMinutes,
      },
    });
  }

  return {
    allowed: true,
    remaining:
      limit === Infinity
        ? Infinity
        : limit - usage.audioMinutesUsed - durationMinutes,
  };
}

// Generate upload URL for audio files
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

// Check if user can record/upload audio (call before starting)
export const checkAudioLimit = query({
  args: {
    estimatedMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { allowed: false, error: "Unauthorized" };

    const { usage } = await getUserUsage(ctx, identity.tokenIdentifier);
    const limit = AUDIO_LIMIT_MINUTES;
    const estimatedMinutes = args.estimatedMinutes || 0;

    if (limit === Infinity) {
      return { allowed: true, remaining: Infinity };
    }

    const remaining = Math.max(0, limit - usage.audioMinutesUsed);
    const allowed = remaining >= estimatedMinutes;

    return {
      allowed,
      remaining,
      used: usage.audioMinutesUsed,
      limit,
      error: allowed
        ? undefined
        : `You have ${remaining.toFixed(1)} minutes remaining this month.`,
    };
  },
});

// Save a live recording session (existing functionality)
export const saveRecording = mutation({
  args: {
    sessionId: v.string(),
    title: v.string(),
    transcript: v.string(),
    duration: v.optional(v.number()), // Duration in seconds
    tzOffsetMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Convert duration to minutes and check limit
    const durationMinutes = (args.duration || 0) / 60;
    if (durationMinutes > 0) {
      const usageCheck = await checkAndUpdateAudioUsage(
        ctx,
        identity.tokenIdentifier,
        durationMinutes,
      );

      if (!usageCheck.allowed) {
        throw new Error(usageCheck.error || "Audio limit exceeded");
      }
    }

    const recordingId = await ctx.db.insert("recordings", {
      userId: identity.tokenIdentifier,
      sessionId: args.sessionId,
      title: args.title,
      transcript: args.transcript,
      duration: args.duration,
      createdAt: Date.now(),
    });

    if (args.tzOffsetMinutes !== undefined) {
      await ctx.runMutation(api.users.updateStudyStreak, {
        tzOffsetMinutes: args.tzOffsetMinutes,
      });
    }

    return recordingId;
  },
});

// Upsert an in-progress recording draft by sessionId (used for autosave/recovery)
export const upsertRecordingDraft = mutation({
  args: {
    sessionId: v.string(),
    title: v.string(),
    transcript: v.string(),
    duration: v.optional(v.number()), // Duration in seconds
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const existing = await ctx.db
      .query("recordings")
      .withIndex("by_userId_sessionId", (q) =>
        q
          .eq("userId", identity.tokenIdentifier)
          .eq("sessionId", args.sessionId),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        title: args.title,
        transcript: args.transcript,
        duration: args.duration,
      });
      return existing._id;
    }

    return await ctx.db.insert("recordings", {
      userId: identity.tokenIdentifier,
      sessionId: args.sessionId,
      title: args.title,
      transcript: args.transcript,
      duration: args.duration,
      createdAt: Date.now(),
    });
  },
});

// Save an uploaded recording with audio file
export const saveUploadedRecording = mutation({
  args: {
    title: v.string(),
    storageId: v.string(),
    duration: v.optional(v.number()), // Duration in seconds
    tzOffsetMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Convert duration to minutes and check limit
    const durationMinutes = (args.duration || 0) / 60;
    if (durationMinutes > 0) {
      const usageCheck = await checkAndUpdateAudioUsage(
        ctx,
        identity.tokenIdentifier,
        durationMinutes,
      );

      if (!usageCheck.allowed) {
        throw new Error(usageCheck.error || "Audio limit exceeded");
      }
    }

    // Get the audio URL from storage
    const audioUrl = await ctx.storage.getUrl(args.storageId);

    const recordingId = await ctx.db.insert("recordings", {
      userId: identity.tokenIdentifier,
      sessionId: crypto.randomUUID(),
      title: args.title,
      transcript: "", // Will be filled after transcription
      audioUrl: audioUrl || undefined,
      duration: args.duration,
      createdAt: Date.now(),
    });

    console.log(`[saveUploadedRecording] Created recording: ${recordingId}`);
    console.log(
      `[saveUploadedRecording] With userId: ${identity.tokenIdentifier}`,
    );

    if (args.tzOffsetMinutes !== undefined) {
      await ctx.runMutation(api.users.updateStudyStreak, {
        tzOffsetMinutes: args.tzOffsetMinutes,
      });
    }

    return recordingId;
  },
});

// Update recording with transcript after AI processing
export const updateRecordingTranscript = mutation({
  args: {
    recordingId: v.id("recordings"),
    transcript: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    console.log(
      `[updateRecordingTranscript] Looking for recording: ${args.recordingId}`,
    );
    console.log(
      `[updateRecordingTranscript] Current user tokenIdentifier: ${identity.tokenIdentifier}`,
    );

    const recording = await ctx.db.get(args.recordingId);
    console.log(
      `[updateRecordingTranscript] Recording found:`,
      recording ? "yes" : "no",
    );
    if (recording) {
      console.log(
        `[updateRecordingTranscript] Recording userId: ${recording.userId}`,
      );
      console.log(
        `[updateRecordingTranscript] Match: ${recording.userId === identity.tokenIdentifier}`,
      );
    }

    if (!recording || recording.userId !== identity.tokenIdentifier) {
      throw new Error("Recording not found or unauthorized");
    }

    await ctx.db.patch(args.recordingId, { transcript: args.transcript });
  },
});

// Get all recordings for the user
export const getRecordings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("recordings")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .order("desc")
      .collect();
  },
});

// Get a single recording by ID
export const getRecording = query({
  args: { recordingId: v.id("recordings") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const recording = await ctx.db.get(args.recordingId);
    if (!recording || recording.userId !== identity.tokenIdentifier) {
      return null;
    }

    return recording;
  },
});

// Delete a recording
export const deleteRecording = mutation({
  args: { recordingId: v.id("recordings") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const recording = await ctx.db.get(args.recordingId);
    if (!recording || recording.userId !== identity.tokenIdentifier) {
      throw new Error("Recording not found or unauthorized");
    }

    await ctx.db.delete(args.recordingId);
  },
});

// Cleanup orphaned recordings (those without valid transcripts)
export const cleanupOrphanedRecordings = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const recordings = await ctx.db
      .query("recordings")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .collect();

    let deletedCount = 0;
    for (const recording of recordings) {
      // Delete recordings without transcripts (empty or just whitespace)
      if (!recording.transcript || recording.transcript.trim().length === 0) {
        await ctx.db.delete(recording._id);
        deletedCount++;
      }
    }

    return { deletedCount };
  },
});
