import type { z } from "zod";
import { HttpError } from "../middleware/errors.js";

/** Validates input against a zod schema, turning failures into a JSON 400. */
export function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new HttpError(400, result.error.issues[0]?.message ?? "Invalid request", "invalid_request");
  }
  return result.data;
}
