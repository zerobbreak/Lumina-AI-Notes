/* eslint-disable no-var -- see the note on applyAppearance */
import type { Appearance } from "./model";

export type AppliedAppearance = {
  /** The accent was lightened or darkened to stay legible on this world. */
  accentAdjusted: boolean;
};

/**
 * Writes a look onto <html>. It is also stringified into the pre-paint script
 * (see appearanceScript), so it must stay self-contained: no imports, nothing
 * from outer scope, and plain ES5 so the compiler injects no helpers.
 *
 * `appearance` must already be normalized. `brand` clears everything so the
 * marketing pages keep their fixed look.
 *
 * The accent is always written inline, fitted to the world: its lightness is
 * moved away from the background until it reaches 3:1 contrast. The tables
 * below mirror app/globals.css; tests/logic/appearance.test.ts checks them.
 */
export function applyAppearance(
  root: HTMLElement,
  appearance: Appearance,
  systemDark: boolean,
  systemReducedMotion: boolean,
  brand: boolean,
): AppliedAppearance {
  var attrs = [
    "data-world",
    "data-mode",
    "data-theme",
    "data-ui-font",
    "data-reading-font",
    "data-reading-width",
    "data-density",
    "data-motion",
  ];
  // The first nine are the accent.
  var vars = [
    "--primary",
    "--primary-foreground",
    "--ring",
    "--sidebar-primary",
    "--chart-1",
    "--chart-2",
    "--chart-3",
    "--chart-4",
    "--chart-5",
    "--radius",
    "--reading-size",
    "--reading-line-height",
  ];
  // [data-world][data-mode] --background, as H S L.
  var backgrounds: Record<string, number[]> = {
    "paper-light": [40, 33, 96],
    "paper-dark": [30, 8, 10],
    "observatory-light": [214, 30, 96],
    "observatory-dark": [222, 60, 5],
    "focus-light": [0, 0, 100],
    "focus-dark": [0, 0, 9],
    "riso-light": [45, 45, 93],
    "riso-dark": [232, 30, 11],
  };
  // [data-theme] --primary, as H S L.
  var swatches: Record<string, number[]> = {
    "red-pen": [4, 74, 49],
    indigo: [239, 84, 67],
    blue: [221.2, 83.2, 53.3],
    purple: [262.1, 83.3, 57.8],
    rose: [346.8, 77.2, 49.8],
    amber: [38, 92, 50],
    emerald: [158, 64, 52],
    green: [142, 71, 45],
    slate: [215, 25, 55],
  };
  var i;
  if (brand) {
    for (i = 0; i < attrs.length; i++) root.removeAttribute(attrs[i]);
    for (i = 0; i < vars.length; i++) root.style.removeProperty(vars[i]);
    root.classList.remove("dark");
    root.style.colorScheme = "";
    return { accentAdjusted: false };
  }

  var a = appearance;
  var dark = a.mode === "system" ? systemDark : a.mode === "dark";
  var mode = dark ? "dark" : "light";
  root.classList.toggle("dark", dark);
  root.style.colorScheme = mode;
  root.setAttribute("data-world", a.world);
  root.setAttribute("data-mode", mode);
  root.setAttribute("data-ui-font", a.uiFont);
  root.setAttribute("data-reading-font", a.readingFont);
  root.setAttribute("data-reading-width", a.readingWidth);
  root.setAttribute("data-density", a.density);
  root.setAttribute(
    "data-motion",
    a.motion === "system" ? (systemReducedMotion ? "reduce" : "full") : a.motion,
  );
  root.style.setProperty(
    "--radius",
    a.radius === "sharp" ? "0.25rem" : a.radius === "round" ? "0.875rem" : "0.5rem",
  );
  root.style.setProperty("--reading-size", a.readingSize + "px");
  root.style.setProperty("--reading-line-height", String(a.readingLineHeight));

  function channel(v: number) {
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }
  function luminance(hsl: number[]) {
    var s = hsl[1] / 100;
    var l = hsl[2] / 100;
    var k = function (n: number) {
      var x = (n + hsl[0] / 30) % 12;
      return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(x - 3, 9 - x, 1));
    };
    return 0.2126 * channel(k(0)) + 0.7152 * channel(k(8)) + 0.0722 * channel(k(4));
  }
  function contrast(y1: number, y2: number) {
    return (Math.max(y1, y2) + 0.05) / (Math.min(y1, y2) + 0.05);
  }
  function fmt(hsl: number[]) {
    return hsl[0].toFixed(1) + " " + hsl[1].toFixed(1) + "% " + hsl[2].toFixed(1) + "%";
  }

  var accent = a.accent;
  var base: number[];
  if (accent.kind === "swatch") {
    // The [data-theme] block still supplies chart-2..5.
    root.setAttribute("data-theme", accent.id);
    base = swatches[accent.id].slice();
  } else {
    // OKLCH -> linear sRGB -> sRGB -> HSL, because the tokens are "H S% L%"
    // triples consumed as hsl(var(--primary)).
    root.setAttribute("data-theme", "custom");
    var hr = (accent.h * Math.PI) / 180;
    var oa = accent.c * Math.cos(hr);
    var ob = accent.c * Math.sin(hr);
    var lc = Math.pow(accent.l + 0.3963377774 * oa + 0.2158037573 * ob, 3);
    var mc = Math.pow(accent.l - 0.1055613458 * oa - 0.0638541728 * ob, 3);
    var sc = Math.pow(accent.l - 0.0894841775 * oa - 1.291485548 * ob, 3);
    var lin = [
      4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc,
      -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc,
      -0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc,
    ];
    var rgb = [0, 0, 0];
    for (i = 0; i < 3; i++) {
      var x = lin[i];
      x = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
      rgb[i] = Math.min(1, Math.max(0, x));
    }
    var max = Math.max(rgb[0], rgb[1], rgb[2]);
    var min = Math.min(rgb[0], rgb[1], rgb[2]);
    var light = (max + min) / 2;
    var d = max - min;
    var hue = 0;
    var sat = 0;
    if (d > 0) {
      sat = d / (1 - Math.abs(2 * light - 1));
      if (max === rgb[0]) hue = ((rgb[1] - rgb[2]) / d) % 6;
      else if (max === rgb[1]) hue = (rgb[2] - rgb[0]) / d + 2;
      else hue = (rgb[0] - rgb[1]) / d + 4;
      hue = hue * 60;
      if (hue < 0) hue += 360;
    }
    base = [hue, sat * 100, light * 100];
  }

  // Walk lightness away from the background until the accent reads on it.
  var bg = luminance(backgrounds[a.world + "-" + mode]);
  var step = dark ? 1 : -1;
  var fitted = base.slice();
  while (contrast(luminance(fitted), bg) < 3 && fitted[2] > 0 && fitted[2] < 100) {
    fitted[2] = Math.max(0, Math.min(100, fitted[2] + step));
  }
  var primary = fmt(fitted);
  root.style.setProperty("--primary", primary);
  root.style.setProperty("--ring", primary);
  root.style.setProperty("--sidebar-primary", primary);
  root.style.setProperty("--chart-1", primary);

  // Button text: whichever of near-white / near-black reads better.
  var y = luminance(fitted);
  var white = [0, 0, 98];
  var ink = [240, 6, 10];
  root.style.setProperty(
    "--primary-foreground",
    fmt(contrast(y, luminance(white)) >= contrast(y, luminance(ink)) ? white : ink),
  );

  if (accent.kind === "custom") {
    // No [data-theme] block for a custom hue: spread the chart hues from it.
    for (i = 2; i <= 5; i++) {
      root.style.setProperty(
        "--chart-" + i,
        fmt([(fitted[0] + (i - 1) * 55) % 360, Math.max(45, fitted[1] * 0.85), fitted[2]]),
      );
    }
  } else {
    for (i = 5; i < 9; i++) root.style.removeProperty(vars[i]);
  }

  return { accentAdjusted: Math.abs(fitted[2] - base[2]) > 0.001 };
}
