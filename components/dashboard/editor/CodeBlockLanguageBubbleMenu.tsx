"use client";

import { useCallback, useId, useMemo } from "react";
import { BubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/react";
import { findParentNode } from "@tiptap/core";
import type { VirtualElement } from "@floating-ui/dom";
import { Code2 } from "lucide-react";
import { editorLowlight } from "@/lib/editorLowlight";
import { labelForHljsLanguage } from "@/lib/hljsLanguageLabels";
import { cn } from "@/lib/utils";

interface CodeBlockLanguageBubbleMenuProps {
  editor: Editor | null;
}

function getCodeBlockDom(editor: Editor): HTMLElement | null {
  const found = findParentNode((n) => n.type.name === "codeBlock")(
    editor.state.selection,
  );
  if (!found) return null;
  const dom = editor.view.nodeDOM(found.pos);
  return dom instanceof HTMLElement ? dom : null;
}

/**
 * Floating toolbar when the caret is inside a code block: pick highlight.js language.
 * Positioned at the top-end of the code block (same anchor as the block). Styling uses
 * theme tokens so it matches the note surface (`background`, `border`, `muted`).
 */
export function CodeBlockLanguageBubbleMenu({
  editor,
}: CodeBlockLanguageBubbleMenuProps) {
  const languages = useMemo(() => {
    const list = editorLowlight.listLanguages();
    return [...list].sort((a, b) =>
      labelForHljsLanguage(a).localeCompare(labelForHljsLanguage(b)),
    );
  }, []);

  const selectId = useId();

  const getReferencedVirtualElement = useCallback((): VirtualElement | null => {
    if (!editor || editor.isDestroyed) return null;
    const el = getCodeBlockDom(editor);
    if (!el) return null;
    return {
      getBoundingClientRect: () => el.getBoundingClientRect(),
      getClientRects: () => el.getClientRects(),
      contextElement: el,
    };
  }, [editor]);

  if (!editor) return null;

  const raw = editor.getAttributes("codeBlock").language as string | null;
  const currentLang =
    raw && languages.includes(raw) ? raw : "javascript";

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="codeBlockLanguageMenu"
      shouldShow={({ editor: ed }) => ed.isActive("codeBlock")}
      getReferencedVirtualElement={getReferencedVirtualElement}
      options={{
        placement: "top-end",
        offset: 8,
      }}
      className={cn(
        "z-50 flex max-w-[min(100vw-1rem,20rem)] items-center gap-2 rounded-md border border-border",
        "bg-background/95 px-2 py-1 text-foreground shadow-md backdrop-blur-sm",
      )}
    >
      <Code2
        className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
        aria-hidden
      />
      <label
        htmlFor={selectId}
        className="text-[11px] font-medium text-muted-foreground"
      >
        Language
      </label>
      <select
        id={selectId}
        value={currentLang}
        onChange={(e) => {
          editor
            .chain()
            .focus()
            .updateAttributes("codeBlock", { language: e.target.value })
            .run();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className={cn(
          "h-7 min-w-[7.5rem] max-w-[12rem] cursor-pointer rounded-md border border-border",
          "bg-muted px-2 text-xs font-medium text-foreground",
          "outline-none transition-colors hover:bg-muted/80",
          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
        )}
      >
        {languages.map((lang) => (
          <option key={lang} value={lang}>
            {labelForHljsLanguage(lang)}
          </option>
        ))}
      </select>
    </BubbleMenu>
  );
}
