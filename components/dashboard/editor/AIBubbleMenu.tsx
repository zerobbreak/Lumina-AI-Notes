"use client";

import { Editor } from "@tiptap/react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minimize2, Maximize2, Wand2, Layers, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AIBubbleMenuProps {
  editor: Editor | null;
}

export function AIBubbleMenu({ editor }: AIBubbleMenuProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const simplifyText = useAction(api.ai.simplifyText);
  const expandText = useAction(api.ai.expandText);
  const continueText = useAction(api.ai.continueText);
  const generateFlashcards = useAction(api.ai.generateFlashcards);

  useEffect(() => {
    if (!editor) return;

    const updatePosition = () => {
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to, " ");

      if (selectedText.trim().length > 3) {
        // Get the DOM coordinates of the selection
        const { view } = editor;
        const start = view.coordsAtPos(from);
        const end = view.coordsAtPos(to);

        // Center the menu above the selection
        const left = (start.left + end.left) / 2;
        const top = start.top - 50;

        setPosition({ top, left });
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    editor.on("selectionUpdate", updatePosition);
    editor.on("blur", () => setIsVisible(false));

    return () => {
      editor.off("selectionUpdate", updatePosition);
      editor.off("blur", () => setIsVisible(false));
    };
  }, [editor]);

  const getSelectedText = () => {
    if (!editor) return "";
    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, " ");
  };

  const handleAction = async (
    action: "simplify" | "expand" | "continue" | "flashcards"
  ) => {
    if (!editor) return;
    const selectedText = getSelectedText();
    if (!selectedText.trim()) return;

    setIsLoading(true);
    setActiveAction(action);

    try {
      let result: string;

      switch (action) {
        case "simplify":
          result = await simplifyText({ text: selectedText });
          editor.chain().focus().deleteSelection().insertContent(result).run();
          break;

        case "expand":
          result = await expandText({ text: selectedText });
          editor.chain().focus().deleteSelection().insertContent(result).run();
          break;

        case "continue":
          result = await continueText({
            text: selectedText,
            fullContext: editor.getText(),
          });
          const { to } = editor.state.selection;
          editor
            .chain()
            .focus()
            .insertContentAt(to, " " + result)
            .run();
          break;

        case "flashcards":
          const cards = await generateFlashcards({ text: selectedText });
          if (cards.length > 0) {
            let flashcardHtml = "<h3>📚 Flashcards</h3><ul>";
            cards.forEach(
              (card: { front: string; back: string }, i: number) => {
                flashcardHtml += `<li><strong>Q${i + 1}:</strong> ${card.front}<br/><em>A:</em> ${card.back}</li>`;
              }
            );
            flashcardHtml += "</ul>";
            const { to } = editor.state.selection;
            editor
              .chain()
              .focus()
              .insertContentAt(to, "<br/>" + flashcardHtml)
              .run();
          }
          break;
      }
    } catch (error) {
      console.error(`AI ${action} error:`, error);
    } finally {
      setIsLoading(false);
      setActiveAction(null);
      setIsVisible(false);
    }
  };

  if (!editor) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          style={{
            position: "fixed",
            top: position.top,
            left: position.left,
            transform: "translateX(-50%)",
            zIndex: 50,
          }}
          className="flex items-center gap-1 p-1.5 bg-zinc-900/95 backdrop-blur-sm border border-white/10 rounded-lg shadow-xl"
        >
          {isLoading ? (
            <div className="flex items-center gap-2 px-3 py-1.5 text-purple-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs capitalize">{activeAction}ing...</span>
            </div>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs text-zinc-300 hover:text-white hover:bg-white/10"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleAction("simplify");
                }}
                title="Simplify selected text"
              >
                <Minimize2 className="w-3.5 h-3.5 mr-1" />
                Simplify
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs text-zinc-300 hover:text-white hover:bg-white/10"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleAction("expand");
                }}
                title="Expand with more detail"
              >
                <Maximize2 className="w-3.5 h-3.5 mr-1" />
                Expand
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs text-zinc-300 hover:text-white hover:bg-white/10"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleAction("continue");
                }}
                title="Continue writing"
              >
                <Wand2 className="w-3.5 h-3.5 mr-1" />
                Continue
              </Button>
              <div className="w-px h-5 bg-white/10" />
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleAction("flashcards");
                }}
                title="Create flashcards"
              >
                <Layers className="w-3.5 h-3.5 mr-1" />
                Flashcards
              </Button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
