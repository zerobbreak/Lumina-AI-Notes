import { and, count, eq, gte } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import type { Db } from "../db/client.js";
import { feedback } from "../db/schema/index.js";
import { parseFormPrefillUrl, submitToGoogleForm } from "../feedback/googleForm.js";
import { HttpError } from "../middleware/errors.js";
import { currentUser } from "../middleware/user.js";
import { parse } from "./validation.js";

export const FEEDBACK_KINDS = ["bug", "idea", "more", "praise", "other"] as const;

/** Plenty for real feedback; stops a script filling the owner's inbox. */
export const MAX_FEEDBACK_PER_DAY = 20;

const KIND_LABELS: Record<(typeof FEEDBACK_KINDS)[number], string> = {
  bug: "Bug",
  idea: "Idea",
  more: "Needs higher limits",
  praise: "Praise",
  other: "Other",
};

const feedbackBody = z.object({
  kind: z.enum(FEEDBACK_KINDS),
  message: z.string().trim().min(1).max(4000),
  rating: z.number().int().min(1).max(5).optional(),
  page: z.string().max(300).optional(),
  limitCode: z.string().max(64).optional(),
  app: z.string().max(200).optional(),
});

/**
 * In-app feedback. Stored first, then sent to the Google Form in the
 * background: the student gets their "thanks" straight away, and a form
 * that's down or misconfigured never loses what they wrote.
 */
export function createFeedbackRouter(db: Db, formUrl: string | undefined) {
  const router = Router();
  const form = formUrl ? parseFormPrefillUrl(formUrl) : null;

  router.post("/", async (req, res) => {
    const user = currentUser(res);
    const body = parse(feedbackBody, req.body);

    const [{ sent }] = await db
      .select({ sent: count() })
      .from(feedback)
      .where(and(eq(feedback.userId, user.id), gte(feedback.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))));
    if (sent >= MAX_FEEDBACK_PER_DAY) {
      throw new HttpError(429, "Thanks for all the feedback! You can send more tomorrow.", "feedback_limit");
    }

    const [row] = await db
      .insert(feedback)
      .values({ userId: user.id, ...body })
      .returning({ id: feedback.id });
    res.status(201).json({ id: row.id });

    if (!form) return;
    submitToGoogleForm(form, {
      type: KIND_LABELS[body.kind],
      message: body.message,
      rating: body.rating ? String(body.rating) : undefined,
      email: user.email,
      name: user.name ?? undefined,
      userId: user.id,
      page: body.page,
      limit: body.limitCode,
      app: body.app,
    })
      .then(() => db.update(feedback).set({ forwardedAt: new Date() }).where(eq(feedback.id, row.id)))
      .catch((error: unknown) => console.error(`[feedback] ${row.id} not sent to the Google Form:`, (error as Error).message));
  });

  return router;
}
