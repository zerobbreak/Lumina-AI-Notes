import {
  CODE_LANGUAGE_LABELS,
  type CodeLanguage,
} from "@/types/streaming";

/** Labels for highlight.js / lowlight ids not in `CODE_LANGUAGE_LABELS` */
const EXTRA_HLJS_LABELS: Record<string, string> = {
  arduino: "Arduino",
  diff: "Diff",
  graphql: "GraphQL",
  ini: "INI",
  less: "Less",
  lua: "Lua",
  makefile: "Makefile",
  objectivec: "Objective-C",
  perl: "Perl",
  "php-template": "PHP template",
  plaintext: "Plain text",
  "python-repl": "Python REPL",
  scss: "SCSS",
  shell: "Shell",
  vbnet: "VB.NET",
  wasm: "WebAssembly",
  xml: "XML",
  webmanifest: "Web manifest",
};

/** Human-readable label for a lowlight / highlight.js language id */
export function labelForHljsLanguage(id: string): string {
  if (id in CODE_LANGUAGE_LABELS) {
    return CODE_LANGUAGE_LABELS[id as CodeLanguage];
  }
  if (EXTRA_HLJS_LABELS[id]) {
    return EXTRA_HLJS_LABELS[id];
  }
  return id
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
