/**
 * Bans hard-coded neutral/accent Tailwind colours in themed app surfaces, so
 * every world and accent keeps working. Use tokens instead:
 *   text-white -> text-foreground, text-gray-400 -> text-muted-foreground,
 *   bg-white/5 -> bg-foreground/5, border-white/10 -> border-border,
 *   bg-black/30 (input well) -> bg-inset, indigo/violet/purple -> primary
 *   (gradient ends -> primary-alt).
 *
 * Allowed on purpose:
 *   - bg-black/NN scrims, black/NN gradient stops over images, ring-black/N and
 *     shadow-black/N
 *   - text-white / bg-white in a class string that also has a solid chromatic
 *     fill (bg-red-500, bg-rose-500 …) or a scrim, where white is the right ink
 *   - strings that are the value of a `color`, `swatch` or `value` property,
 *     which are user-pickable palettes rather than UI chrome
 */

const NEUTRAL = "(?:zinc|gray|slate|neutral|stone)";
const ACCENT = "(?:indigo|violet|purple)";
const CHROMA =
  "(?:red|green|emerald|amber|blue|rose|orange|sky|cyan|teal|yellow|lime|pink|fuchsia)";
const UTIL = "(?:text|bg|border|ring|from|to|via|divide|shadow|outline|placeholder|fill|stroke|decoration|caret|accent)";
const B = "(?<=^|[\\s:\"'`])";
const E = "(?=$|[\\s\"'`/])";

const BANNED = [
  new RegExp(`${B}${UTIL}-${NEUTRAL}-\\d{2,3}${E}`, "g"),
  new RegExp(`${B}${UTIL}-${ACCENT}-\\d{2,3}${E}`, "g"),
  new RegExp(`${B}${UTIL}-\\[#[0-9a-fA-F]{3,8}\\]`, "g"),
  new RegExp(`${B}(?:text|bg|border|ring|from|to|via)-(?:white|black)${E}`, "g"),
];

const ALWAYS_OK = /^(?:(?:bg|from|via|to)-black\/|ring-black\/|shadow-black\/)/;
const WHITE_INK = /^(?:text-white|bg-white)(?:\/|$)/;
const HAS_SOLID_FILL = new RegExp(
  `(?:^|[\\s:])(?:(?:bg|from)-${CHROMA}-[4-9]00(?=$|[\\s"'\`])|bg-black\\/[4-9]0|bg-destructive)`,
);
const PALETTE_KEYS = new Set(["color", "swatch", "value"]);

function offenders(text) {
  const found = [];
  for (const re of BANNED) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      // Include any "/opacity" suffix so the allowlist can see it.
      const rest = text.slice(m.index + m[0].length).match(/^\/[\w.[\]]+/);
      const cls = m[0] + (rest ? rest[0] : "");
      if (ALWAYS_OK.test(cls)) continue;
      if (WHITE_INK.test(cls) && HAS_SOLID_FILL.test(text)) continue;
      found.push(cls);
    }
  }
  return found;
}

function isPaletteValue(node) {
  const parent = node.parent;
  return (
    parent?.type === "Property" &&
    parent.value === node &&
    PALETTE_KEYS.has(parent.key?.name ?? parent.key?.value)
  );
}

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
  meta: {
    type: "problem",
    docs: { description: "Disallow hard-coded colours that bypass theme tokens" },
    messages: {
      raw: "'{{cls}}' bypasses the theme. Use a token (foreground, muted-foreground, border, inset, primary, primary-alt …).",
    },
    schema: [],
  },
  create(context) {
    function check(node, text) {
      if (typeof text !== "string" || isPaletteValue(node)) return;
      for (const cls of offenders(text)) {
        context.report({ node, messageId: "raw", data: { cls } });
      }
    }
    return {
      Literal(node) {
        check(node, node.value);
      },
      TemplateElement(node) {
        check(node, node.value.cooked);
      },
    };
  },
};

export const _offenders = offenders;
export default { rules: { "no-raw-colors": rule } };
