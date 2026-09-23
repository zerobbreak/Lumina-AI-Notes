/* eslint-disable no-var -- see the note on applyAppearance */
import type { Appearance } from "./model";

/**
 * Writes a look onto <html>. It is also stringified into the pre-paint script
 * (see appearanceScript), so it must stay self-contained: no imports, nothing
 * from outer scope, and plain ES5 so the compiler injects no helpers.
 *
 * `appearance` must already be normalized. `brand` clears everything so the
 * marketing pages keep their fixed look.
 */
export function applyAppearance(
  root: HTMLElement,
  appearance: Appearance,
  systemDark: boolean,
  systemReducedMotion: boolean,
  brand: boolean,
): void {
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
  // The first five are the custom-accent overrides.
  var vars = [
    "--primary",
    "--primary-foreground",
    "--ring",
    "--sidebar-primary",
    "--chart-1",
    "--radius",
    "--reading-size",
    "--reading-line-height",
  ];
  var i;
  if (brand) {
    for (i = 0; i < attrs.length; i++) root.removeAttribute(attrs[i]);
    for (i = 0; i < vars.length; i++) root.style.removeProperty(vars[i]);
    root.classList.remove("dark");
    root.style.colorScheme = "";
    return;
  }

  var a = appearance;
  var dark = a.mode === "system" ? systemDark : a.mode === "dark";
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  root.setAttribute("data-world", a.world);
  root.setAttribute("data-mode", dark ? "dark" : "light");
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

  var accent = a.accent;
  if (accent.kind === "swatch") {
    // Swatches are [data-theme] blocks in globals.css.
    root.setAttribute("data-theme", accent.id);
    for (i = 0; i < 5; i++) root.style.removeProperty(vars[i]);
    return;
  }

  // Custom accent: OKLCH -> linear sRGB -> sRGB -> HSL, because the tokens
  // are "H S% L%" triples consumed as hsl(var(--primary)).
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
  var hsl = hue.toFixed(1) + " " + (sat * 100).toFixed(1) + "% " + (light * 100).toFixed(1) + "%";
  root.style.setProperty("--primary", hsl);
  root.style.setProperty("--ring", hsl);
  root.style.setProperty("--sidebar-primary", hsl);
  root.style.setProperty("--chart-1", hsl);
  // Contrast-aware adjustment arrives with the accent picker; until then use
  // whichever of near-white / near-black text reads on the accent.
  root.style.setProperty("--primary-foreground", accent.l > 0.7 ? "240 6% 11%" : "0 0% 98%");
}
