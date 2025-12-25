import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
      // Update existing user if needed (e.g., new image)
      // For now, we just return the user id, or you could update fields here
      return user._id;
    }

    // Create new user
    return await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      email: args.email,
      name: args.name,
      image: args.image,
      onboardingComplete: false,
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
      })
    ),
    noteStyle: v.string(),
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

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      ...args,
      onboardingComplete: true,
    });
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

    if (!user) {
      throw new Error("User not found");
    }

    const newCourse = {
      id: Math.random().toString(36).substring(7),
      name: args.name,
      code: args.code,
      modules: [],
    };

    const currentCourses = user.courses || [];

    await ctx.db.patch(user._id, {
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
