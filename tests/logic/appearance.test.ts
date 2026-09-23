import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyAppearance } from "@/lib/appearance/apply";
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

  it("turns a custom OKLCH accent into HSL tokens, and clears them for a swatch", () => {
    // oklch(0.628 0.2577 29.23) is sRGB red, hsl(0 100% 50%).
    applyAppearance(root, { ...look, accent: { kind: "custom", l: 0.628, c: 0.2577, h: 29.23 } }, false, false, false);
    expect(root.dataset.theme).toBe("custom");
    const [h, s, l] = root.style.getPropertyValue("--primary").split(" ").map(parseFloat);
    expect(Math.min(h!, 360 - h!)).toBeLessThan(1);
    expect(s).toBeGreaterThan(99);
    expect(l).toBeCloseTo(50, 0);

    applyAppearance(root, look, false, false, false);
    expect(root.dataset.theme).toBe("red-pen");
    expect(root.style.getPropertyValue("--primary")).toBe("");
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
  const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

  it.each(WORLDS.flatMap((world) => [[world, "light"], [world, "dark"]]))(
    "has a %s world in %s mode",
    (world, mode) => {
      expect(css).toContain(`[data-world="${world}"][data-mode="${mode}"]`);
    },
  );

  it.each([
    ...ACCENT_SWATCHES.map((id) => `[data-theme="${id}"]`),
    ...UI_FONTS.map((id) => `[data-ui-font="${id}"]`),
    ...READING_FONTS.map((id) => `[data-reading-font="${id}"]`),
    ...READING_WIDTHS.map((id) => `[data-reading-width="${id}"]`),
  ])("styles %s", (selector) => {
    expect(css).toContain(selector);
  });
});
