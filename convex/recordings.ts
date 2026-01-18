import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Tier limits for audio (in minutes)
const TIER_AUDIO_LIMITS = {
  free: 300, // 5 hours
  scholar: Infinity,
  institution: Infinity,
};

type SubscriptionTier = "free" | "scholar" | "institution";
type SubscriptionStatus = "active" | "cancelled" | "past_due" | "expired";

// Helper function to get user's effective tier and usage
async function getUserTierAndUsage(ctx: any, tokenIdentifier: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q: any) =>
      q.eq("tokenIdentifier", tokenIdentifier)
    )
    .unique();

  if (!user) {
    return { tier: "free" as SubscriptionTier, usage: { audioMinutesUsed: 0, notesCreated: 0, lastResetDate: Date.now() } };
  }

  // Determine effective tier
  const tier = (user.subscriptionTier as SubscriptionTier) || "free";
  const status = user.subscriptionStatus as SubscriptionStatus | undefined;
  const endDate = user.subscriptionEndDate;
  const isActive = status === "active" && (!endDate || endDate > Date.now());
  const effectiveTier: SubscriptionTier = isActive && tier !== "free" ? tier : "free";

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

  return { tier: effectiveTier, usage, userId: user._id };
}

// Helper function to check and update audio usage
async function checkAndUpdateAudioUsage(
  ctx: any,
  tokenIdentifier: string,
  durationMinutes: number
): Promise<{ allowed: boolean; error?: string; remaining?: number }> {
  const { tier, usage, userId } = await getUserTierAndUsage(ctx, tokenIdentifier);
  const limit = TIER_AUDIO_LIMITS[tier];

  if (limit !== Infinity) {
    const newTotal = usage.audioMinutesUsed + durationMinutes;
    if (newTotal > limit) {
      return {
        allowed: false,
        error: `Audio limit exceeded. You have ${Math.max(0, limit - usage.audioMinutesUsed).toFixed(1)} minutes remaining this month. Upgrade to Scholar for unlimited audio.`,
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
    remaining: limit === Infinity ? Infinity : limit - usage.audioMinutesUsed - durationMinutes,
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

    const { tier, usage } = await getUserTierAndUsage(ctx, identity.tokenIdentifier);
    const limit = TIER_AUDIO_LIMITS[tier];
    const estimatedMinutes = args.estimatedMinutes || 0;

    if (limit === Infinity) {
      return { allowed: true, tier, remaining: Infinity };
    }

    const remaining = Math.max(0, limit - usage.audioMinutesUsed);
    const allowed = remaining >= estimatedMinutes;

    return {
      allowed,
      tier,
      remaining,
      used: usage.audioMinutesUsed,
      limit,
      error: allowed
        ? undefined
        : `You have ${remaining.toFixed(1)} minutes remaining this month. Upgrade to Scholar for unlimited audio.`,
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
        durationMinutes
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

    return recordingId;
  },
});

// Save an uploaded recording with audio file
export const saveUploadedRecording = mutation({
  args: {
    title: v.string(),
    storageId: v.string(),
    duration: v.optional(v.number()), // Duration in seconds
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
        durationMinutes
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

    const recording = await ctx.db.get(args.recordingId);
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
