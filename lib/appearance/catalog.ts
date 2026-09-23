import type {
  AccentSwatch,
  Appearance,
  DENSITIES,
  MOTION,
  RADII,
  READING_FONTS,
  READING_WIDTHS,
  ResolvedMode,
  UI_FONTS,
  World,
} from "./model";

/**
 * Names and previews for the appearance controls. Preview colours are the
 * world's own tokens from app/globals.css ("H S% L%"), because a card has to
 * show a world other than the one on screen.
 */
type WorldPreview = {
  background: string;
  sidebar: string;
  card: string;
  foreground: string;
  muted: string;
  border: string;
};

export type WorldInfo = {
  id: World;
  label: string;
  blurb: string;
  /** The mode the world was designed in; the other is its alternate. */
  native: ResolvedMode;
  /** Name of each mode, e.g. Paper / Paper Night. */
  names: Record<ResolvedMode, string>;
  preview: Record<ResolvedMode, WorldPreview>;
};

export const WORLD_INFO: WorldInfo[] = [
  {
    id: "paper",
    label: "Paper",
    blurb: "Warm stock, ink and a faint grain.",
    native: "light",
    names: { light: "Paper", dark: "Paper Night" },
    preview: {
      light: {
        background: "40 33% 96%",
        sidebar: "38 28% 93.5%",
        card: "40 40% 98.5%",
        foreground: "30 12% 14%",
        muted: "30 8% 36%",
        border: "36 18% 83%",
      },
      dark: {
        background: "30 8% 10%",
        sidebar: "30 8% 8.5%",
        card: "30 8% 12%",
        foreground: "38 20% 88%",
        muted: "35 8% 62%",
        border: "30 6% 20%",
      },
    },
  },
  {
    id: "observatory",
    label: "Observatory",
    blurb: "Deep navy night sky, a scatter of stars.",
    native: "dark",
    names: { light: "Observatory Day", dark: "Observatory" },
    preview: {
      light: {
        background: "214 30% 96%",
        sidebar: "214 30% 93.5%",
        card: "0 0% 100%",
        foreground: "222 40% 12%",
        muted: "218 14% 36%",
        border: "214 20% 84%",
      },
      dark: {
        background: "222 60% 5%",
        sidebar: "222 55% 6.5%",
        card: "222 47% 8.5%",
        foreground: "214 32% 91%",
        muted: "215 16% 62%",
        border: "220 25% 15%",
      },
    },
  },
  {
    id: "focus",
    label: "Focus",
    blurb: "Neutral and quiet. Nothing but the work.",
    native: "light",
    names: { light: "Focus", dark: "Focus Dark" },
    preview: {
      light: {
        background: "0 0% 100%",
        sidebar: "240 5% 98%",
        card: "0 0% 100%",
        foreground: "240 6% 10%",
        muted: "240 4% 38%",
        border: "240 6% 90%",
      },
      dark: {
        background: "0 0% 9%",
        sidebar: "0 0% 11%",
        card: "0 0% 10.5%",
        foreground: "0 0% 91%",
        muted: "240 5% 64.9%",
        border: "240 3.7% 17%",
      },
    },
  },
  {
    id: "riso",
    label: "Riso",
    blurb: "Newsprint cream, blue-black ink, halftone.",
    native: "light",
    names: { light: "Riso", dark: "Riso Dark" },
    preview: {
      light: {
        background: "45 45% 93%",
        sidebar: "45 40% 90%",
        card: "45 50% 96%",
        foreground: "230 45% 18%",
        muted: "230 15% 36%",
        border: "45 22% 78%",
      },
      dark: {
        background: "232 30% 11%",
        sidebar: "232 32% 9%",
        card: "232 28% 14%",
        foreground: "45 40% 88%",
        muted: "45 12% 64%",
        border: "232 20% 22%",
      },
    },
  },
];

export function worldInfo(id: World): WorldInfo {
  return WORLD_INFO.find((w) => w.id === id) ?? WORLD_INFO[0]!;
}

/** Accent swatches with their [data-theme] --primary, for the chips. */
export const ACCENT_INFO: {
  id: AccentSwatch;
  label: string;
  swatch: string;
}[] = [
  { id: "red-pen", label: "Red Pen", swatch: "4 74% 49%" },
  { id: "indigo", label: "Indigo", swatch: "239 84% 67%" },
  { id: "blue", label: "Ocean", swatch: "221.2 83.2% 53.3%" },
  { id: "purple", label: "Violet", swatch: "262.1 83.3% 57.8%" },
  { id: "rose", label: "Rose", swatch: "346.8 77.2% 49.8%" },
  { id: "amber", label: "Amber", swatch: "38 92% 50%" },
  { id: "emerald", label: "Emerald", swatch: "158 64% 52%" },
  { id: "green", label: "Moss", swatch: "142 71% 45%" },
  { id: "slate", label: "Slate", swatch: "215 25% 55%" },
];

type Option<T extends string> = { id: T; label: string };

export const UI_FONT_INFO: (Option<(typeof UI_FONTS)[number]> & {
  family: string;
})[] = [
  { id: "geist", label: "Geist", family: "var(--font-geist)" },
  { id: "plex-sans", label: "IBM Plex Sans", family: "var(--font-plex-sans)" },
  { id: "outfit", label: "Outfit", family: "var(--font-outfit)" },
  {
    id: "instrument-sans",
    label: "Instrument Sans",
    family: "var(--font-instrument-sans)",
  },
];

export const READING_FONT_INFO: (Option<(typeof READING_FONTS)[number]> & {
  family: string;
  note: string;
})[] = [
  {
    id: "newsreader",
    label: "Newsreader",
    family: "var(--font-newsreader)",
    note: "Bookish serif",
  },
  {
    id: "literata",
    label: "Literata",
    family: "var(--font-literata)",
    note: "Made for long reads",
  },
  {
    id: "atkinson",
    label: "Atkinson Hyperlegible",
    family: "var(--font-atkinson)",
    note: "Built for low vision",
  },
  {
    id: "lexend",
    label: "Lexend",
    family: "var(--font-lexend)",
    note: "Eases reading fatigue",
  },
];

export const READING_WIDTH_INFO: Option<(typeof READING_WIDTHS)[number]>[] = [
  { id: "narrow", label: "Narrow" },
  { id: "medium", label: "Medium" },
  { id: "wide", label: "Wide" },
];

export const DENSITY_INFO: Option<(typeof DENSITIES)[number]>[] = [
  { id: "compact", label: "Compact" },
  { id: "comfortable", label: "Comfortable" },
  { id: "spacious", label: "Spacious" },
];

export const RADIUS_INFO: Option<(typeof RADII)[number]>[] = [
  { id: "sharp", label: "Sharp" },
  { id: "soft", label: "Soft" },
  { id: "round", label: "Round" },
];

export const MOTION_INFO: Option<(typeof MOTION)[number]>[] = [
  { id: "system", label: "Match system" },
  { id: "reduce", label: "Reduced" },
  { id: "full", label: "Full" },
];

export const MODE_INFO: Option<Appearance["mode"]>[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
];
