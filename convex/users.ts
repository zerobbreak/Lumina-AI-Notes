import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getLocalDayStart } from "../lib/analytics";

export const getUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    return user;
  },
});

export const createOrUpdateUser = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error(
        "Called createOrUpdateUser without authentication present"
      );
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (user) {
      return user._id;
    }

    // Create new user
    return await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      email: args.email,
      name: args.name,
      image: args.image,
      onboardingComplete: false,
      currentStreak: 0,
      longestStreak: 0,
      badges: [],
      dailyGoalMinutes: 30,
      dailyGoalCards: 20,
      tourCompleted: false,
      tourStep: 0,
    });
  },
});

export const completeOnboarding = mutation({
  args: {
    major: v.string(),
    semester: v.string(),
    courses: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        code: v.string(),
        defaultNoteStyle: v.optional(v.string()),
      })
    ),
    noteStyle: v.string(),
    theme: v.optional(v.string()),
    enabledBlocks: v.array(v.string()),
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

    if (user) {
      // Existing user - update with onboarding data
      await ctx.db.patch(user._id, {
        ...args,
        onboardingComplete: true,
        currentStreak: user.currentStreak ?? 0,
        longestStreak: user.longestStreak ?? 0,
        badges: user.badges ?? [],
        dailyGoalMinutes: user.dailyGoalMinutes ?? 30,
        dailyGoalCards: user.dailyGoalCards ?? 20,
        tourCompleted: user.tourCompleted ?? false,
        tourStep: user.tourStep ?? 0,
      });
    } else {
      // New user - create with onboarding data
      await ctx.db.insert("users", {
        tokenIdentifier: identity.tokenIdentifier,
        email: identity.email || "",
        name: identity.name,
        image: identity.pictureUrl,
        ...args,
        onboardingComplete: true,
        currentStreak: 0,
        longestStreak: 0,
        badges: [],
        dailyGoalMinutes: 30,
        dailyGoalCards: 20,
        tourCompleted: false,
        tourStep: 0,
      });
    }
  },
});

export const updateTourProgress = mutation({
  args: {
    completed: v.optional(v.boolean()),
    step: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) throw new Error("User not found");

    const patch: Record<string, unknown> = {};
    if (args.completed !== undefined) patch.tourCompleted = args.completed;
    if (args.step !== undefined) patch.tourStep = args.step;

    if (Object.keys(patch).length === 0) return;

    await ctx.db.patch(user._id, patch);
  },
});

export const updateStudyStreak = mutation({
  args: {
    timestamp: v.optional(v.number()),
    tzOffsetMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) throw new Error("User not found");

    const now = args.timestamp ?? Date.now();
    const todayStart = getLocalDayStart(now, args.tzOffsetMinutes);
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

    const lastStudiedDate = user.lastStudiedDate;
    let currentStreak = user.currentStreak ?? 0;

    if (lastStudiedDate === todayStart) {
      return {
        currentStreak,
        longestStreak: user.longestStreak ?? currentStreak,
      };
    }

    if (lastStudiedDate === yesterdayStart) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }

    const longestStreak = Math.max(user.longestStreak ?? 0, currentStreak);

    await ctx.db.patch(user._id, {
      currentStreak,
      longestStreak,
      lastStudiedDate: todayStart,
      lastTimezoneOffsetMinutes: args.tzOffsetMinutes,
    });

    return { currentStreak, longestStreak };
  },
});

export const awardBadge = mutation({
  args: { badgeId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (!user) throw new Error("User not found");

    const badges = new Set(user.badges ?? []);
    badges.add(args.badgeId);

    await ctx.db.patch(user._id, { badges: Array.from(badges) });
  },
});

export const setDailyGoal = mutation({
  args: { minutes: v.number(), cards: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      dailyGoalMinutes: args.minutes,
      dailyGoalCards: args.cards,
    });
  },
});

export const getUserGamificationStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (!user) return null;

    return {
      currentStreak: user.currentStreak ?? 0,
      longestStreak: user.longestStreak ?? 0,
      lastStudiedDate: user.lastStudiedDate,
      badges: user.badges ?? [],
      dailyGoalMinutes: user.dailyGoalMinutes ?? 30,
      dailyGoalCards: user.dailyGoalCards ?? 20,
    };
  },
});

export const resetStreaksInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const now = Date.now();

    let resetCount = 0;
    for (const user of users) {
      if (!user.lastStudiedDate) continue;

      const tzOffset = user.lastTimezoneOffsetMinutes ?? 0;
      const todayStart = getLocalDayStart(now, tzOffset);
      const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

      if ((user.currentStreak ?? 0) > 0 && user.lastStudiedDate < yesterdayStart) {
        await ctx.db.patch(user._id, { currentStreak: 0 });
        resetCount++;
      }
    }

    return { resetCount };
  },
});

export const updatePreferences = mutation({
  args: {
    major: v.optional(v.string()),
    noteStyle: v.optional(v.string()),
    theme: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) throw new Error("User not found");

    const updates: Record<string, unknown> = {};
    if (args.major !== undefined) updates.major = args.major;
    if (args.noteStyle !== undefined) updates.noteStyle = args.noteStyle;
    if (args.theme !== undefined) updates.theme = args.theme;
    if (Object.keys(updates).length === 0) return;

    await ctx.db.patch(user._id, updates);
  },
});

export const createCourse = mutation({
  args: {
    name: v.string(),
    code: v.string(),
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

    // Auto-create user if they don't exist yet (first action creates user)
    let userId = user?._id;
    if (!user) {
      userId = await ctx.db.insert("users", {
        tokenIdentifier: identity.tokenIdentifier,
        email: identity.email || "",
        name: identity.name,
        image: identity.pictureUrl,
        onboardingComplete: false,
        courses: [],
      });
    }

    const newCourse = {
      id: Math.random().toString(36).substring(7),
      name: args.name,
      code: args.code,
      modules: [],
    };

    const currentCourses = user?.courses || [];

    await ctx.db.patch(userId!, {
      courses: [...currentCourses, newCourse],
    });

    return newCourse.id;
  },
});

export const addModuleToCourse = mutation({
  args: {
    courseId: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user || !user.courses) throw new Error("User or courses not found");

    const updatedCourses = user.courses.map((c) => {
      if (c.id === args.courseId) {
        return {
          ...c,
          modules: [
            ...(c.modules || []),
            {
              id: Math.random().toString(36).substring(7),
              title: args.title,
            },
          ],
        };
      }
      return c;
    });

    await ctx.db.patch(user._id, { courses: updatedCourses });
  },
});

export const deleteCourse = mutation({
  args: { courseId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
    if (!user || !user.courses) return;

    const updatedCourses = user.courses.filter((c) => c.id !== args.courseId);
    await ctx.db.patch(user._id, { courses: updatedCourses });
  },
});

export const deleteModule = mutation({
  args: { courseId: v.string(), moduleId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
    if (!user || !user.courses) return;

    const updatedCourses = user.courses.map((c) => {
      if (c.id === args.courseId && c.modules) {
        return {
          ...c,
          modules: c.modules.filter((m) => m.id !== args.moduleId),
        };
      }
      return c;
    });

    await ctx.db.patch(user._id, { courses: updatedCourses });
  },
});

export const renameCourse = mutation({
  args: { courseId: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
    if (!user || !user.courses) return;

    const updatedCourses = user.courses.map((c) =>
      c.id === args.courseId ? { ...c, name: args.name } : c
    );
    await ctx.db.patch(user._id, { courses: updatedCourses });
  },
});

export const renameModule = mutation({
  args: { courseId: v.string(), moduleId: v.string(), title: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
    if (!user || !user.courses) return;

    const updatedCourses = user.courses.map((c) => {
      if (c.id === args.courseId && c.modules) {
        return {
          ...c,
          modules: c.modules.map((m) =>
            m.id === args.moduleId ? { ...m, title: args.title } : m
          ),
        };
      }
      return c;
    });

    await ctx.db.patch(user._id, { courses: updatedCourses });
  },
});

export const updateCourseStyle = mutation({
  args: { courseId: v.string(), style: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
    if (!user || !user.courses) return;

    const updatedCourses = user.courses.map((c) =>
      c.id === args.courseId ? { ...c, defaultNoteStyle: args.style } : c
    );
    await ctx.db.patch(user._id, { courses: updatedCourses });
  },
});
