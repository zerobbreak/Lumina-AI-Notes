import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyAppearance } from "@/lib/appearance/apply";
import { ACCENT_INFO, WORLD_INFO } from "@/lib/appearance/catalog";
import {
  ACCENT_SWATCHES,
  APPEARANCE_COOKIE,
  DEFAULT_APPEARANCE,
  READING_FONTS,
  READING_WIDTHS,
  UI_FONTS,
  WORLDS,
  normalizeAppearance,
  resolveMode,
  type Appearance,
} from "@/lib/appearance/model";
import { appearanceScript } from "@/lib/appearance/script";

const root = document.documentElement;
const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8").replace(/\r\n/g, "\n");
const applySource = readFileSync(join(process.cwd(), "lib/appearance/apply.ts"), "utf8");

/** The "H S% L%" value of `prop` inside the CSS block that starts with `selector`. */
function cssToken(selector: string, prop: string): string | undefined {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return undefined;
  const body = css.slice(start, css.indexOf("}", start));
  return body.match(new RegExp(`${prop}: ([^;]+);`))?.[1];
}
function cssTriple(selector: string, prop: string): number[] | undefined {
  return cssToken(selector, prop)?.split(" ").map(parseFloat);
}

/** A `var name = { key: [h, s, l], … }` table from inside applyAppearance. */
function applyTable(name: string): Record<string, number[]> {
  const body = applySource.match(new RegExp(`var ${name}[^{]*\\{([^}]*)\\}`))?.[1] ?? "";
  return Object.fromEntries(
    [...body.matchAll(/"?([\w-]+)"?: \[([^\]]+)\]/g)].map((m) => [
      m[1]!,
      m[2]!.split(",").map(Number),
    ]),
  );
}
const BACKGROUNDS = applyTable("backgrounds");
const SWATCHES = applyTable("swatches");

function contrast(a: number[], b: number[]): number {
  const lum = ([h, s, l]: number[]) => {
    const sat = s! / 100;
    const lig = l! / 100;
    const k = (n: number) => {
      const x = (n + h! / 30) % 12;
      const v = lig - sat * Math.min(lig, 1 - lig) * Math.max(-1, Math.min(x - 3, 9 - x, 1));
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * k(0) + 0.7152 * k(8) + 0.0722 * k(4);
  };
  const [y1, y2] = [lum(a), lum(b)];
  return (Math.max(y1, y2) + 0.05) / (Math.min(y1, y2) + 0.05);
}

function resetRoot() {
  for (const attr of [...root.attributes]) root.removeAttribute(attr.name);
}

function clearCookie() {
  document.cookie = `${APPEARANCE_COOKIE}=; Path=/; Max-Age=0`;
}

beforeEach(() => {
  resetRoot();
  clearCookie();
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("dark") }));
});
afterEach(() => vi.unstubAllGlobals());

describe("normalizeAppearance", () => {
  it("gives defaults for nothing", () => {
    expect(normalizeAppearance(null)).toEqual(DEFAULT_APPEARANCE);
  });

  it("keeps valid fields and repairs the rest one by one", () => {
    expect(
      normalizeAppearance({
        world: "riso",
        uiFont: "comic-sans",
        readingSize: 99,
        accent: { kind: "custom", l: 0.6, c: 0.1, h: 30 },
      }),
    ).toEqual({
      ...DEFAULT_APPEARANCE,
      world: "riso",
      accent: { kind: "custom", l: 0.6, c: 0.1, h: 30 },
    });
  });

  it("rejects an unknown swatch", () => {
    expect(normalizeAppearance({ accent: { kind: "swatch", id: "chartreuse" } }).accent).toEqual(
      DEFAULT_APPEARANCE.accent,
    );
  });
});

describe("resolveMode", () => {
  it("follows the OS only for system", () => {
    expect(resolveMode("system", true)).toBe("dark");
    expect(resolveMode("system", false)).toBe("light");
    expect(resolveMode("light", true)).toBe("light");
  });
});

describe("applyAppearance", () => {
  const look: Appearance = { ...DEFAULT_APPEARANCE, world: "observatory", mode: "dark" };

  it("writes the look onto <html>", () => {
    applyAppearance(root, look, false, true, false);
    expect(root.classList.contains("dark")).toBe(true);
    expect(root.dataset).toMatchObject({
      world: "observatory",
      mode: "dark",
      theme: "red-pen",
      uiFont: "geist",
      readingFont: "newsreader",
      density: "comfortable",
      motion: "reduce",
    });
    expect(root.style.getPropertyValue("--reading-size")).toBe("17px");
  });

  it("follows the OS for system mode", () => {
    applyAppearance(root, { ...look, mode: "system" }, false, false, false);
    expect(root.classList.contains("dark")).toBe(false);
    expect(root.dataset.mode).toBe("light");
  });

  it("turns a custom OKLCH accent into HSL tokens, and spreads chart hues from it", () => {
    // oklch(0.628 0.2577 29.23) is sRGB red, hsl(0 100% 50%).
    applyAppearance(
      root,
      { ...look, accent: { kind: "custom", l: 0.628, c: 0.2577, h: 29.23 } },
      false,
      false,
      false,
    );
    expect(root.dataset.theme).toBe("custom");
    const [h, s, l] = root.style.getPropertyValue("--primary").split(" ").map(parseFloat);
    expect(Math.min(h!, 360 - h!)).toBeLessThan(1);
    expect(s).toBeGreaterThan(99);
    expect(l).toBeCloseTo(50, 0);

    expect(root.style.getPropertyValue("--chart-3")).not.toBe("");

    // A swatch takes chart-2..5 from its [data-theme] block instead.
    applyAppearance(root, look, false, false, false);
    expect(root.dataset.theme).toBe("red-pen");
    expect(root.style.getPropertyValue("--primary")).toBe("4.0 74.0% 49.0%");
    expect(root.style.getPropertyValue("--chart-3")).toBe("");
  });

  it("leaves a legible accent alone", () => {
    const paper: Appearance = { ...DEFAULT_APPEARANCE, mode: "light" };
    expect(applyAppearance(root, paper, false, false, false).accentAdjusted).toBe(false);
  });

  it.each([
    ["darkens amber on Paper", "paper", "light", { kind: "swatch", id: "amber" }],
    [
      "lightens a deep blue on Observatory",
      "observatory",
      "dark",
      { kind: "custom", l: 0.35, c: 0.15, h: 260 },
    ],
  ] as const)("%s until it reaches 3:1", (_name, world, mode, accent) => {
    const applied = applyAppearance(
      root,
      { ...DEFAULT_APPEARANCE, world, mode, accent },
      false,
      false,
      false,
    );
    expect(applied.accentAdjusted).toBe(true);
    const bg = BACKGROUNDS[`${world}-${mode}`]!;
    const primary = root.style.getPropertyValue("--primary").split(" ").map(parseFloat);
    expect(contrast(primary, bg)).toBeGreaterThanOrEqual(3);
    // Only just: the nearest legible lightness, not a jump to black or white.
    const back = [primary[0]!, primary[1]!, primary[2]! - (mode === "light" ? -1 : 1)];
    expect(contrast(back, bg)).toBeLessThan(3);
  });

  it("picks button text that reads on the accent", () => {
    applyAppearance(
      root,
      { ...DEFAULT_APPEARANCE, mode: "dark", accent: { kind: "custom", l: 0.9, c: 0.1, h: 100 } },
      false,
      false,
      false,
    );
    expect(root.style.getPropertyValue("--primary-foreground")).toBe("240.0 6.0% 10.0%");
  });

  it("clears everything on brand routes", () => {
    applyAppearance(root, look, true, true, false);
    applyAppearance(root, look, true, true, true);
    expect(root.classList.contains("dark")).toBe(false);
    expect(root.dataset.world).toBeUndefined();
    expect(root.style.getPropertyValue("--radius")).toBe("");
  });
});

describe("appearanceScript", () => {
  // Runs the exact string the root layout inlines, so a helper sneaking into
  // applyAppearance (which the script can't see) fails here.
  const run = () => new Function(appearanceScript())();
  beforeEach(() => window.history.pushState({}, "", "/dashboard"));
  afterEach(() => window.history.pushState({}, "", "/"));

  it("leaves the landing page's brand look alone", () => {
    window.history.pushState({}, "", "/");
    run();
    expect(root.dataset.world).toBeUndefined();
  });

  it("applies the cookie's look", () => {
    const look = { ...DEFAULT_APPEARANCE, world: "focus", mode: "light" };
    document.cookie = `${APPEARANCE_COOKIE}=${encodeURIComponent(JSON.stringify(look))}; Path=/`;
    run();
    expect(root.dataset.world).toBe("focus");
    expect(root.classList.contains("dark")).toBe(false);
  });

  it("falls back to the defaults without a cookie or with a broken one", () => {
    run();
    expect(root.dataset.world).toBe("paper");
    // Default mode is system, and the stubbed OS prefers dark.
    expect(root.classList.contains("dark")).toBe(true);

    resetRoot();
    document.cookie = `${APPEARANCE_COOKIE}=%7Bnot-json; Path=/`;
    run();
    expect(root.dataset.world).toBe("paper");
  });
});

describe("globals.css", () => {
  // A value the model accepts but the stylesheet doesn't style would
  // silently fall back to the defaults.

  it.each(Object.entries(BACKGROUNDS))("apply.ts has the %s background", (key, hsl) => {
    const [world, mode] = key.split("-");
    expect(hsl).toEqual(cssTriple(`[data-world="${world}"][data-mode="${mode}"]`, "--background"));
  });

  it.each(Object.entries(SWATCHES))("apply.ts has the %s swatch", (id, hsl) => {
    expect(hsl).toEqual(cssTriple(`[data-theme="${id}"]`, "--primary"));
    expect(ACCENT_INFO.find((a) => a.id === id)?.swatch).toBe(
      cssToken(`[data-theme="${id}"]`, "--primary"),
    );
  });

  it.each(WORLD_INFO.flatMap((w) => (["light", "dark"] as const).map((m) => [w, m] as const)))(
    "the catalog previews %o in %s with its real colours",
    (w, mode) => {
      const block = `[data-world="${w.id}"][data-mode="${mode}"]`;
      const p = w.preview[mode];
      expect([p.background, p.sidebar, p.card, p.foreground, p.muted, p.border]).toEqual(
        [
          "--background",
          "--sidebar",
          "--card",
          "--foreground",
          "--muted-foreground",
          "--border",
        ].map((v) => cssToken(block, v)),
      );
    },
  );

  it.each(
    WORLDS.flatMap((world) => [
      [world, "light"],
      [world, "dark"],
    ]),
  )("has a %s world in %s mode", (world, mode) => {
    expect(css).toContain(`[data-world="${world}"][data-mode="${mode}"]`);
  });

  it.each([
    ...ACCENT_SWATCHES.map((id) => `[data-theme="${id}"]`),
    ...UI_FONTS.map((id) => `[data-ui-font="${id}"]`),
    ...READING_FONTS.map((id) => `[data-reading-font="${id}"]`),
    ...READING_WIDTHS.map((id) => `[data-reading-width="${id}"]`),
  ])("styles %s", (selector) => {
    expect(css).toContain(selector);
  });
});
