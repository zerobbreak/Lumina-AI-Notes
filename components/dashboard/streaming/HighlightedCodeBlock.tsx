"use client";

import { CodeBlock } from "react-code-block";
import { themes } from "prism-react-renderer";
import { cn } from "@/lib/utils";

const LANGUAGE_ALIASES: Record<string, string> = {
  js: "javascript",
  jsx: "jsx",
  ts: "typescript",
  tsx: "tsx",
  py: "python",
  rb: "ruby",
  sh: "bash",
  shell: "bash",
  bash: "bash",
  zsh: "bash",
  yml: "yaml",
  md: "markdown",
  rs: "rust",
  cpp: "cpp",
  cs: "csharp",
  kt: "kotlin",
  swift: "swift",
  go: "go",
  text: "markdown",
  plaintext: "markdown",
  txt: "markdown",
  pseudocode: "markdown",
  other: "markdown",
  matlab: "matlab",
  r: "r",
  php: "php",
  sql: "sql",
};

/** Map common fence labels to Prism language ids (prism-react-renderer bundle). */
export function normalizePrismLanguage(raw: string): string {
  const key = raw.trim().toLowerCase() || "text";
  return LANGUAGE_ALIASES[key] ?? key;
}

interface HighlightedCodeBlockProps {
  code: string;
  language: string;
  className?: string;
  /** When set, constrains height (e.g. collapsed preview in sidebar). */
  maxHeightPx?: number;
  showLineNumbers?: boolean;
}

/** Match note editor / Notion-like card: dark shell, ~12px radius, comfortable padding */
const codeBaseClass =
  "m-0 min-w-0 overflow-x-auto rounded-[10px] border border-white/[0.1] bg-[#0b0d10] font-mono text-[11px] leading-[1.6] text-gray-200 shadow-[0_4px_24px_rgba(0,0,0,0.35)]";

/**
 * Syntax-highlighted code block (react-code-block + prism-react-renderer).
 * @see https://react-code-block.netlify.app/
 */
export function HighlightedCodeBlock({
  code,
  language,
  className,
  maxHeightPx,
  showLineNumbers = true,
}: HighlightedCodeBlockProps) {
  const lang = normalizePrismLanguage(language);
  const normalized = code.replace(/\u00a0/g, " ");

  const style = maxHeightPx
    ? ({ maxHeight: maxHeightPx, overflow: "hidden" } as const)
    : undefined;

  return (
    <CodeBlock code={normalized} language={lang} theme={themes.nightOwl}>
      {showLineNumbers ? (
        <CodeBlock.Code
          as="div"
          className={cn(
            codeBaseClass,
            "table w-full border-collapse px-4 py-4",
            className,
          )}
          style={style}
        >
          {({ isLineHighlighted }: { isLineHighlighted: boolean }) => (
            <div
              className={cn(
                "table-row",
                isLineHighlighted && "bg-cyan-500/10",
              )}
            >
              <CodeBlock.LineNumber className="table-cell w-9 select-none border-r border-white/5 py-0.5 pr-2 text-right align-top text-[10px] text-gray-500" />
              <CodeBlock.LineContent className="table-cell min-w-0 py-0.5 pl-2">
                <CodeBlock.Token />
              </CodeBlock.LineContent>
            </div>
          )}
        </CodeBlock.Code>
      ) : (
        <CodeBlock.Code
          as="div"
          className={cn(codeBaseClass, "px-4 py-4", className)}
          style={style}
        >
          <CodeBlock.LineContent>
            <CodeBlock.Token />
          </CodeBlock.LineContent>
        </CodeBlock.Code>
      )}
    </CodeBlock>
  );
}
