"use client";

import { useLayoutEffect, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { SlashCommandMenu } from "./SlashCommandMenu";
import type { SlashRegistryItem } from "./slashCommandRegistry";

type SlashCommandLayerProps = {
  editor: TiptapEditor;
};

export function SlashCommandLayer({ editor }: SlashCommandLayerProps) {
  const sc = editor.slashCommandProps;
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sc) return;
    const parent = editor.view.dom.parentElement;
    if (!parent) return;
    parent.setAttribute("data-slash-menu-open", "true");
    return () => parent.removeAttribute("data-slash-menu-open");
  }, [editor, sc]);

  const parentEl = editor.view.dom.parentElement;
  const parentRect = parentEl?.getBoundingClientRect();
  const cr = sc?.clientRect?.() ?? null;
  const top = sc
    ? cr
      ? cr.top -
        (parentRect?.top ?? 0) +
        (parentEl?.scrollTop ?? 0) +
        24
      : 0
    : 0;
  const left = sc && cr ? cr.left - (parentRect?.left ?? 0) : 0;

  useLayoutEffect(() => {
    if (!sc) return;
    const node = layerRef.current;
    if (!node) return;
    const pad = 12;
    const rect = node.getBoundingClientRect();
    let dx = 0;
    if (rect.right > window.innerWidth - pad) {
      dx = window.innerWidth - pad - rect.right;
    }
    if (rect.left + dx < pad) {
      dx = pad - rect.left;
    }
    node.style.transform = dx ? `translateX(${dx}px)` : "";
    return () => {
      node.style.transform = "";
    };
  }, [top, left, editor, sc]);

  if (!sc) return null;

  const slashQuery = typeof sc.query === "string" ? sc.query : "";

  return (
    <div
      ref={layerRef}
      className="absolute z-50"
      style={{ top, left }}
    >
      <motion.div
        initial={{ opacity: 0, y: -6, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <SlashCommandMenu
          editor={editor}
          range={sc.range}
          query={slashQuery}
          items={(sc.items as SlashRegistryItem[] | undefined) ?? []}
        />
      </motion.div>
    </div>
  );
}
