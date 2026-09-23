import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import type { Db } from "../db/client.js";
import { users } from "../db/schema/index.js";
import { toGamificationStats } from "../gamification/stats.js";
import { appearancePatchSchema, normalizeAppearance } from "../users/appearance.js";
import { updateStudyStreak } from "../gamification/streaks.js";
import { HttpError } from "../middleware/errors.js";
import { currentUser, type User } from "../middleware/user.js";
import { parse, tzOffsetMinutes } from "./validation.js";

export const NOTE_STYLES = ["standard", "outline", "mindmap"] as const;
export const noteStyle = z.enum(NOTE_STYLES);

/**
 * Profile fields for /users/me. Gamification lives under /users/me/gamification
 * so the main user payload stays stable for onboarding and settings.
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
    appearance: normalizeAppearance(rest.appearance),
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
  enabledBlocks: z.array(shortText(50)).max(100),
});

const tourBody = z.object({
  completed: z.boolean().optional(),
  step: z.number().int().min(0).max(1000).optional(),
});

const preferencesBody = z.object({
  major: shortText(100).optional(),
  noteStyle: noteStyle.optional(),
});

// No client timestamp: the server's clock decides what day it is, so a streak
// can't be built by replaying days that have passed.
const studyStreakBody = z.object({ tzOffsetMinutes });

/** Badges have no server-side rules yet, so at least keep them small and tidy. */
export const MAX_BADGES = 100;

const badgeBody = z.object({
  badgeId: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9_-]{0,63}$/i, "Badge ids are letters, numbers, - and _"),
});

const dailyGoalsBody = z.object({
  minutes: z.number().int().min(1).max(600),
  cards: z.number().int().min(1).max(500),
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

  // Merges into the stored look, so each control can save on its own.
  router.patch("/me/appearance", async (req, res) => {
    const user = currentUser(res);
    const patch = parse(appearancePatchSchema, req.body);
    const updated = await update(user, {
      appearance: { ...normalizeAppearance(user.appearance), ...patch },
    });
    res.json(toUserResponse(updated));
  });

  // getUserGamificationStats
  router.get("/me/gamification", (_req, res) => {
    res.json(toGamificationStats(currentUser(res)));
  });

  // updateStudyStreak
  router.post("/me/study-streak", async (req, res) => {
    const user = currentUser(res);
    const body = parse(studyStreakBody, req.body);
    const streak = await updateStudyStreak(db, user.id, body);
    res.json(streak);
  });

  // awardBadge
  router.post("/me/badges", async (req, res) => {
    const user = currentUser(res);
    const { badgeId } = parse(badgeBody, req.body);
    const badges = [...new Set([...(user.badges ?? []), badgeId])];
    if (badges.length > MAX_BADGES) {
      throw new HttpError(400, `You can hold at most ${MAX_BADGES} badges`, "too_many_badges");
    }
    await update(user, { badges });
    res.status(204).end();
  });

  // setDailyGoal
  router.patch("/me/daily-goals", async (req, res) => {
    const user = currentUser(res);
    const { minutes, cards } = parse(dailyGoalsBody, req.body);
    const updated = await update(user, { dailyGoalMinutes: minutes, dailyGoalCards: cards });
    res.json(toGamificationStats(updated));
  });

  return router;
}
