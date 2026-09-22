import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import type { Db } from "../db/client.js";
import { users } from "../db/schema/index.js";
import { currentUser, type User } from "../middleware/user.js";
import { parse } from "./validation.js";

export const NOTE_STYLES = ["standard", "outline", "mindmap"] as const;
export const noteStyle = z.enum(NOTE_STYLES);

/**
 * The user as clients see it. Gamification (streaks, badges, goals) is being
 * removed from the product, so those columns stay in the table for the Convex
 * import but are never sent. Missing values get the defaults the client used
 * to fill in itself.
 */
export function toUserResponse(user: User) {
  const {
    currentStreak: _currentStreak,
    longestStreak: _longestStreak,
    lastStudiedDate: _lastStudiedDate,
    lastTimezoneOffsetMinutes: _lastTimezoneOffsetMinutes,
    badges: _badges,
    dailyGoalMinutes: _dailyGoalMinutes,
    dailyGoalCards: _dailyGoalCards,
    ...rest
  } = user;
  return {
    ...rest,
    courses: rest.courses ?? [],
    enabledBlocks: rest.enabledBlocks ?? [],
    tourStep: rest.tourStep ?? 0,
  };
}

const shortText = (max: number) => z.string().trim().min(1).max(max);

const onboardingBody = z.object({
  major: shortText(100),
  semester: shortText(50),
  courses: z
    .array(
      z.object({
        // The onboarding page makes these up and files already point at them.
        id: shortText(64),
        name: shortText(200),
        code: z.string().trim().max(50),
        defaultNoteStyle: noteStyle.optional(),
      }),
    )
    .max(50)
    .refine((courses) => new Set(courses.map((c) => c.id)).size === courses.length, {
      message: "Course ids must be unique",
    }),
  noteStyle,
  theme: shortText(50).optional(),
  enabledBlocks: z.array(shortText(50)).max(100),
});

const tourBody = z.object({
  completed: z.boolean().optional(),
  step: z.number().int().min(0).max(1000).optional(),
});

const preferencesBody = z.object({
  major: shortText(100).optional(),
  noteStyle: noteStyle.optional(),
  theme: shortText(50).optional(),
});

/** Port of the profile half of convex/users.ts. Courses live in ./courses.ts. */
export function createUsersRouter(db: Db) {
  const router = Router();

  async function update(user: User, patch: Partial<typeof users.$inferInsert>) {
    if (Object.keys(patch).length === 0) return user;
    const [updated] = await db.update(users).set(patch).where(eq(users.id, user.id)).returning();
    return updated;
  }

  // getUser
  router.get("/me", (_req, res) => {
    res.json(toUserResponse(currentUser(res)));
  });

  // completeOnboarding. Running it again replaces the course list, as Convex did.
  router.post("/me/onboarding", async (req, res) => {
    const body = parse(onboardingBody, req.body);
    const updated = await update(currentUser(res), {
      ...body,
      courses: body.courses.map((c) => ({ ...c, modules: [] })),
      onboardingComplete: true,
    });
    res.json(toUserResponse(updated));
  });

  // updateTourProgress
  router.patch("/me/tour", async (req, res) => {
    const { completed, step } = parse(tourBody, req.body);
    const updated = await update(currentUser(res), {
      ...(completed !== undefined && { tourCompleted: completed }),
      ...(step !== undefined && { tourStep: step }),
    });
    res.json(toUserResponse(updated));
  });

  // updatePreferences
  router.patch("/me/preferences", async (req, res) => {
    const updated = await update(currentUser(res), parse(preferencesBody, req.body));
    res.json(toUserResponse(updated));
  });

  return router;
}
