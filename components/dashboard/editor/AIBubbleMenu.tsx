"use client";

import { Editor } from "@tiptap/react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Minimize2,
  Maximize2,
  Wand2,
  Layers,
  Loader2,
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link as LinkIcon,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BubbleMenu } from "@tiptap/react/menus";

interface AIBubbleMenuProps {
  editor: Editor | null;
}

export function AIBubbleMenu({ editor }: AIBubbleMenuProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [showAI, setShowAI] = useState(false);

  const simplifyText = useAction(api.ai.simplifyText);
  const expandText = useAction(api.ai.expandText);
  const continueText = useAction(api.ai.continueText);
  const generateFlashcards = useAction(api.ai.generateFlashcards);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const handleAction = async (
    action: "simplify" | "expand" | "continue" | "flashcards",
  ) => {
    if (!editor) return;
    const { from: selectedFrom, to: selectedTo } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(
      selectedFrom,
      selectedTo,
      " ",
    );
    if (!selectedText.trim() || selectedFrom === selectedTo) return;

    setIsLoading(true);
    setActiveAction(action);

    try {
      let result: string;

      switch (action) {
        case "simplify":
          result = await simplifyText({ text: selectedText });
          editor
            .chain()
            .focus()
            .insertContentAt({ from: selectedFrom, to: selectedTo }, result)
            .run();
          break;

        case "expand":
          result = await expandText({ text: selectedText });
          editor
            .chain()
            .focus()
            .insertContentAt({ from: selectedFrom, to: selectedTo }, result)
            .run();
          break;

        case "continue":
          result = await continueText({
            text: selectedText,
            fullContext: editor.getText(),
          });
          editor.chain().focus().insertContentAt(selectedTo, " " + result).run();
          break;

        case "flashcards":
          const cards = await generateFlashcards({ text: selectedText });
          if (cards.length > 0) {
            let flashcardHtml = "<h3>📚 Flashcards</h3><ul>";
            cards.forEach(
              (card: { front: string; back: string }, i: number) => {
                flashcardHtml += `<li><strong>Q${i + 1}:</strong> ${card.front}<br/><em>A:</em> ${card.back}</li>`;
              },
            );
            flashcardHtml += "</ul>";
            editor
              .chain()
              .focus()
              .insertContentAt(selectedTo, "<br/>" + flashcardHtml)
              .run();
          }
          break;
      }
    } catch (error) {
      console.error(`AI ${action} error:`, error);
    } finally {
      setIsLoading(false);
      setActiveAction(null);
      setShowAI(false);
    }
  };

  if (!editor || !isMounted) return null;

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor: ed }) => !ed.isActive("codeBlock")}
      options={{
        placement: "top",
        offset: 8,
      }}
      className="flex max-w-none items-center gap-0.5 overflow-hidden rounded-lg border border-border bg-background/95 p-1 shadow-md backdrop-blur-sm"
    >
      {/* Formatting Tools */}
      <div className="flex items-center gap-0.5 pr-1 border-r border-white/10">
        <Button
          size="sm"
          variant="ghost"
          className={`h-8 w-8 p-0 ${editor.isActive("bold") ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className={`h-8 w-8 p-0 ${editor.isActive("italic") ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className={`h-8 w-8 p-0 ${editor.isActive("strike") ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className={`h-8 w-8 p-0 ${editor.isActive("code") ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code className="w-4 h-4" />
        </Button>
      </div>

      {/* AI Tools Toggle */}
      <div className="flex items-center gap-0.5 pl-1">
        <Button
          size="sm"
          variant="ghost"
          className={`h-8 px-2 text-xs gap-1.5 ${showAI ? "bg-purple-500/20 text-purple-300" : "text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"}`}
          onClick={() => setShowAI(!showAI)}
        >
          <Wand2 className="w-3.5 h-3.5" />
          Ask AI
          <ChevronDown
            className={`w-3 h-3 transition-transform ${showAI ? "rotate-180" : ""}`}
          />
        </Button>
      </div>

      {/* AI Actions Dropdown/Overlay */}
      <AnimatePresence>
        {showAI && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full left-0 right-0 mt-1 p-1 bg-zinc-900 border border-white/10 rounded-lg shadow-xl flex flex-col gap-0.5"
          >
            {isLoading ? (
              <div className="flex items-center gap-2 px-3 py-2 text-purple-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs capitalize">
                  {activeAction}ing...
                </span>
              </div>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 justify-start px-2 text-xs text-zinc-300 hover:text-white hover:bg-white/10"
                  onClick={() => handleAction("simplify")}
                >
                  <Minimize2 className="w-3.5 h-3.5 mr-2" />
                  Simplify
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 justify-start px-2 text-xs text-zinc-300 hover:text-white hover:bg-white/10"
                  onClick={() => handleAction("expand")}
                >
                  <Maximize2 className="w-3.5 h-3.5 mr-2" />
                  Expand
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 justify-start px-2 text-xs text-zinc-300 hover:text-white hover:bg-white/10"
                  onClick={() => handleAction("continue")}
                >
                  <Wand2 className="w-3.5 h-3.5 mr-2" />
                  Continue writing
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 justify-start px-2 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                  onClick={() => handleAction("flashcards")}
                >
                  <Layers className="w-3.5 h-3.5 mr-2" />
                  Create flashcards
                </Button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </BubbleMenu>
  );
}
