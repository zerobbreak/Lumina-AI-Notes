import { z } from "zod";
import { HttpError } from "../middleware/errors.js";

/**
 * Minutes from Date#getTimezoneOffset: UTC+14 is -840, UTC-12 is 720. Bounded
 * so a made-up offset can't shift "today" by days to game streaks.
 */
export const tzOffsetMinutes = z.number().int().min(-840).max(720);

/** Validates input against a zod schema, turning failures into a JSON 400. */
export function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new HttpError(400, result.error.issues[0]?.message ?? "Invalid request", "invalid_request");
  }
  return result.data;
}
