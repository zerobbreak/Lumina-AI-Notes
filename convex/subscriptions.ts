import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Types for subscription management
type SubscriptionTier = "free" | "scholar" | "institution";
type SubscriptionStatus = "active" | "cancelled" | "past_due" | "expired";

/**
 * Get the current user's subscription status
 */
export const getSubscriptionStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) return null;

    // TEMPORARY: All features are free - return scholar tier for everyone
    // Payment gateway disabled due to Paystack bug
    return {
      tier: "scholar" as SubscriptionTier,
      rawTier: "scholar" as SubscriptionTier,
      status: "active",
      paystackCustomerId: user.paystackCustomerId,
      paystackSubscriptionCode: user.paystackSubscriptionCode,
      subscriptionStartDate: user.subscriptionStartDate,
      subscriptionEndDate: user.subscriptionEndDate,
      monthlyUsage: user.monthlyUsage || {
        audioMinutesUsed: 0,
        notesCreated: 0,
        lastResetDate: Date.now(),
      },
    };
  },
});

/**
 * Get subscription status by Paystack customer ID (for webhook handlers)
 */
export const getUserByPaystackCustomerId = query({
  args: { customerId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_paystackCustomerId", (q) =>
        q.eq("paystackCustomerId", args.customerId)
      )
      .unique();

    return user;
  },
});

/**
 * Update subscription after successful payment (called from webhook)
 */
export const updateSubscription = mutation({
  args: {
    tokenIdentifier: v.string(),
    tier: v.string(),
    status: v.string(),
    paystackCustomerId: v.optional(v.string()),
    paystackSubscriptionCode: v.optional(v.string()),
    paystackAuthorizationCode: v.optional(v.string()),
    subscriptionStartDate: v.optional(v.number()),
    subscriptionEndDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", args.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      subscriptionTier: args.tier,
      subscriptionStatus: args.status,
      paystackCustomerId: args.paystackCustomerId,
      paystackSubscriptionCode: args.paystackSubscriptionCode,
      paystackAuthorizationCode: args.paystackAuthorizationCode,
      subscriptionStartDate: args.subscriptionStartDate,
      subscriptionEndDate: args.subscriptionEndDate,
    });

    return { success: true };
  },
});

/**
 * Internal mutation to update subscription by customer ID (for webhooks)
 */
export const updateSubscriptionByCustomerId = internalMutation({
  args: {
    paystackCustomerId: v.string(),
    tier: v.optional(v.string()),
    status: v.optional(v.string()),
    paystackSubscriptionCode: v.optional(v.string()),
    paystackAuthorizationCode: v.optional(v.string()),
    subscriptionStartDate: v.optional(v.number()),
    subscriptionEndDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_paystackCustomerId", (q) =>
        q.eq("paystackCustomerId", args.paystackCustomerId)
      )
      .unique();

    if (!user) {
      console.error(
        `User not found for Paystack customer ID: ${args.paystackCustomerId}`
      );
      return { success: false, error: "User not found" };
    }

    const updates: Record<string, unknown> = {};
    if (args.tier !== undefined) updates.subscriptionTier = args.tier;
    if (args.status !== undefined) updates.subscriptionStatus = args.status;
    if (args.paystackSubscriptionCode !== undefined)
      updates.paystackSubscriptionCode = args.paystackSubscriptionCode;
    if (args.paystackAuthorizationCode !== undefined)
      updates.paystackAuthorizationCode = args.paystackAuthorizationCode;
    if (args.subscriptionStartDate !== undefined)
      updates.subscriptionStartDate = args.subscriptionStartDate;
    if (args.subscriptionEndDate !== undefined)
      updates.subscriptionEndDate = args.subscriptionEndDate;

    await ctx.db.patch(user._id, updates);

    return { success: true };
  },
});

/**
 * Cancel subscription
 */
export const cancelSubscription = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Mark as cancelled but keep access until end date
    await ctx.db.patch(user._id, {
      subscriptionStatus: "cancelled",
    });

    return {
      success: true,
      subscriptionCode: user.paystackSubscriptionCode,
    };
  },
});

/**
 * Increment usage counters
 */
export const incrementUsage = mutation({
  args: {
    audioMinutes: v.optional(v.number()),
    notesCreated: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const now = Date.now();
    const currentUsage = user.monthlyUsage || {
      audioMinutesUsed: 0,
      notesCreated: 0,
      lastResetDate: now,
    };

    // Check if we need to reset monthly usage (first day of month)
    const lastReset = new Date(currentUsage.lastResetDate);
    const today = new Date(now);
    const shouldReset =
      lastReset.getMonth() !== today.getMonth() ||
      lastReset.getFullYear() !== today.getFullYear();

    const newUsage = shouldReset
      ? {
          audioMinutesUsed: args.audioMinutes || 0,
          notesCreated: args.notesCreated || 0,
          lastResetDate: now,
        }
      : {
          audioMinutesUsed:
            currentUsage.audioMinutesUsed + (args.audioMinutes || 0),
          notesCreated: currentUsage.notesCreated + (args.notesCreated || 0),
          lastResetDate: currentUsage.lastResetDate,
        };

    await ctx.db.patch(user._id, {
      monthlyUsage: newUsage,
    });

    return newUsage;
  },
});

/**
 * Check if user can perform an action based on their tier
 */
export const checkUsageLimits = query({
  args: {
    audioMinutesToAdd: v.optional(v.number()),
    checkNoteCreation: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { allowed: false, reason: "Unauthorized" };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      return { allowed: false, reason: "User not found" };
    }

    // TEMPORARY: All features are free - unlimited access for everyone
    // Payment gateway disabled due to Paystack bug
    const effectiveTier: SubscriptionTier = "scholar";
    const limits = { audioMinutes: Infinity, notes: Infinity };

    const currentUsage = user.monthlyUsage || {
      audioMinutesUsed: 0,
      notesCreated: 0,
      lastResetDate: Date.now(),
    };

    // Check audio limit
    if (args.audioMinutesToAdd) {
      const newAudioTotal =
        currentUsage.audioMinutesUsed + args.audioMinutesToAdd;
      if (newAudioTotal > limits.audioMinutes) {
        return {
          allowed: false,
          reason: "audio_limit_exceeded",
          current: currentUsage.audioMinutesUsed,
          limit: limits.audioMinutes,
          tier: effectiveTier,
        };
      }
    }

    // Check notes limit
    if (args.checkNoteCreation) {
      if (currentUsage.notesCreated >= limits.notes) {
        return {
          allowed: false,
          reason: "notes_limit_exceeded",
          current: currentUsage.notesCreated,
          limit: limits.notes,
          tier: effectiveTier,
        };
      }
    }

    return {
      allowed: true,
      tier: effectiveTier,
      usage: currentUsage,
      limits,
    };
  },
});

/**
 * Initialize user with free tier (called during user creation)
 */
export const initializeFreeTier = mutation({
  args: { tokenIdentifier: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", args.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Only initialize if not already set
    if (!user.subscriptionTier) {
      await ctx.db.patch(user._id, {
        subscriptionTier: "free",
        subscriptionStatus: "active",
        monthlyUsage: {
          audioMinutesUsed: 0,
          notesCreated: 0,
          lastResetDate: Date.now(),
        },
      });
    }

    return { success: true };
  },
});

/**
 * Store Paystack customer ID for a user (after first payment)
 */
export const setPaystackCustomerId = mutation({
  args: {
    paystackCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      paystackCustomerId: args.paystackCustomerId,
    });

    return { success: true };
  },
});
