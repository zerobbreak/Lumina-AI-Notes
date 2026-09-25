/**
 * A user's look: a world preset plus tweaks. Mirrors
 * server/src/users/appearance.ts — keep the two in step.
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
export const CALENDAR_LAYOUTS = ["month", "week"] as const;

export type World = (typeof WORLDS)[number];
export type Mode = (typeof MODES)[number];
export type ResolvedMode = Exclude<Mode, "system">;
export type AccentSwatch = (typeof ACCENT_SWATCHES)[number];
export type Accent =
  | { kind: "swatch"; id: AccentSwatch }
  /** OKLCH: l 0–1, c 0–0.4, h 0–360 */
  | { kind: "custom"; l: number; c: number; h: number };

export type Appearance = {
  world: World;
  mode: Mode;
  accent: Accent;
  uiFont: (typeof UI_FONTS)[number];
  readingFont: (typeof READING_FONTS)[number];
  /** px */
  readingSize: number;
  readingLineHeight: number;
  readingWidth: (typeof READING_WIDTHS)[number];
  density: (typeof DENSITIES)[number];
  radius: (typeof RADII)[number];
  motion: (typeof MOTION)[number];
  /** Inside a course, the accent takes the course's colour (not saved as the accent). */
  accentFollowsCourse: boolean;
  /** What the calendar opens on: the month grid or the week planner. */
  calendarLayout: (typeof CALENDAR_LAYOUTS)[number];
};

export const DEFAULT_APPEARANCE: Appearance = {
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
  accentFollowsCourse: false,
  calendarLayout: "month",
};

/** Mirrors the look so the pre-paint script can apply it before React loads. */
export const APPEARANCE_COOKIE = "lumina-appearance";

const oneOf =
  <T extends string>(values: readonly T[]) =>
  (v: unknown): v is T =>
    typeof v === "string" && (values as readonly string[]).includes(v);

const inRange =
  (min: number, max: number) =>
  (v: unknown): v is number =>
    typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;

function isAccent(v: unknown): v is Accent {
  if (!v || typeof v !== "object") return false;
  const a = v as Record<string, unknown>;
  if (a.kind === "swatch") return oneOf(ACCENT_SWATCHES)(a.id);
  return a.kind === "custom" && inRange(0, 1)(a.l) && inRange(0, 0.4)(a.c) && inRange(0, 360)(a.h);
}

const CHECKS: { [K in keyof Appearance]: (v: unknown) => boolean } = {
  world: oneOf(WORLDS),
  mode: oneOf(MODES),
  accent: isAccent,
  uiFont: oneOf(UI_FONTS),
  readingFont: oneOf(READING_FONTS),
  readingSize: inRange(14, 24),
  readingLineHeight: inRange(1.3, 2.1),
  readingWidth: oneOf(READING_WIDTHS),
  density: oneOf(DENSITIES),
  radius: oneOf(RADII),
  motion: oneOf(MOTION),
  accentFollowsCourse: (v) => typeof v === "boolean",
  calendarLayout: oneOf(CALENDAR_LAYOUTS),
};

/** Keeps each valid field and falls back to the default for the rest. */
export function normalizeAppearance(value: unknown): Appearance {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const out: Record<string, unknown> = { ...DEFAULT_APPEARANCE };
  for (const key of Object.keys(CHECKS) as (keyof Appearance)[]) {
    if (CHECKS[key](source[key])) out[key] = source[key];
  }
  return out as Appearance;
}

export function resolveMode(mode: Mode, systemDark: boolean): ResolvedMode {
  return mode === "system" ? (systemDark ? "dark" : "light") : mode;
}

/** Marketing pages keep the fixed brand look whatever the visitor picked. */
export function isBrandRoute(pathname: string): boolean {
  return pathname === "/";
}
