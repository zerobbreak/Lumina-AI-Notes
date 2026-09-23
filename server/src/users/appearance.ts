import { z } from "zod";

/**
 * A user's look: a world preset plus tweaks. Mirrors lib/appearance/model.ts
 * on the client — keep the two in step.
 */
export const WORLDS = ["paper", "observatory", "focus", "riso"] as const;
export const MODES = ["light", "dark", "system"] as const;
export const ACCENT_SWATCHES = [
  "red-pen",
  "indigo",
  "blue",
  "purple",
  "rose",
  "amber",
  "emerald",
  "green",
  "slate",
] as const;
export const UI_FONTS = ["geist", "plex-sans", "outfit", "instrument-sans"] as const;
export const READING_FONTS = ["newsreader", "literata", "atkinson", "lexend"] as const;
export const READING_WIDTHS = ["narrow", "medium", "wide"] as const;
export const DENSITIES = ["compact", "comfortable", "spacious"] as const;
export const RADII = ["sharp", "soft", "round"] as const;
export const MOTION = ["system", "reduce", "full"] as const;

export const accentSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("swatch"), id: z.enum(ACCENT_SWATCHES) }),
  z.object({
    kind: z.literal("custom"),
    l: z.number().min(0).max(1),
    c: z.number().min(0).max(0.4),
    h: z.number().min(0).max(360),
  }),
]);

export const DEFAULT_APPEARANCE = {
  world: "paper",
  mode: "system",
  accent: { kind: "swatch", id: "red-pen" },
  uiFont: "geist",
  readingFont: "newsreader",
  readingSize: 17,
  readingLineHeight: 1.65,
  readingWidth: "medium",
  density: "comfortable",
  radius: "soft",
  motion: "system",
} as const satisfies Appearance;

const fields = {
  world: z.enum(WORLDS),
  mode: z.enum(MODES),
  accent: accentSchema,
  uiFont: z.enum(UI_FONTS),
  readingFont: z.enum(READING_FONTS),
  /** px */
  readingSize: z.number().min(14).max(24),
  readingLineHeight: z.number().min(1.3).max(2.1),
  readingWidth: z.enum(READING_WIDTHS),
  density: z.enum(DENSITIES),
  radius: z.enum(RADII),
  motion: z.enum(MOTION),
};

export const appearanceSchema = z.object(fields);
export type Appearance = z.infer<typeof appearanceSchema>;

/** PATCH body: any subset of fields, unknown keys rejected. */
export const appearancePatchSchema = z.object(fields).partial().strict();
export type AppearancePatch = z.infer<typeof appearancePatchSchema>;

/**
 * Fills in defaults field by field, so a stored value from an older version
 * (or a hand-edited row) never breaks the whole look. Null means the user
 * never chose anything: they get the new-user defaults.
 */
export function normalizeAppearance(stored: unknown): Appearance {
  const source = stored && typeof stored === "object" ? (stored as Record<string, unknown>) : {};
  const out: Record<string, unknown> = {};
  for (const [key, schema] of Object.entries(fields)) {
    const parsed = schema.safeParse(source[key]);
    out[key] = parsed.success ? parsed.data : DEFAULT_APPEARANCE[key as keyof Appearance];
  }
  return out as Appearance;
}
