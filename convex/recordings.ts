import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Generate upload URL for audio files
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

// Save a live recording session (existing functionality)
export const saveRecording = mutation({
  args: {
    sessionId: v.string(),
    title: v.string(),
    transcript: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const recordingId = await ctx.db.insert("recordings", {
      userId: identity.tokenIdentifier,
      sessionId: args.sessionId,
      title: args.title,
      transcript: args.transcript,
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
