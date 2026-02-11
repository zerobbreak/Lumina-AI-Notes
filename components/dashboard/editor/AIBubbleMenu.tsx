"use client";

import { Editor } from "@tiptap/react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
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
  const [isMounted, setIsMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isMouseDownRef = useRef(false);
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const simplifyText = useAction(api.ai.simplifyText);
  const expandText = useAction(api.ai.expandText);
  const continueText = useAction(api.ai.continueText);
  const generateFlashcards = useAction(api.ai.generateFlashcards);

  // Track mount state for portal rendering
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Calculate and show the menu at the right position
  const showMenuAtSelection = useCallback(() => {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, " ");

    if (selectedText.trim().length <= 3) {
      setIsVisible(false);
      return;
    }

    // Get the DOM coordinates of the selection
    const { view } = editor;
    try {
      const start = view.coordsAtPos(from);
      const end = view.coordsAtPos(to);

      // Center the menu above the selection
      let left = (start.left + end.left) / 2;
      const menuWidth = 380; // approximate menu width
      const menuHeight = 48; // approximate menu height
      const padding = 8;

      // Position above the selection
      let top = start.top - menuHeight - padding;

      // Clamp to viewport bounds
      if (top < padding) {
        // If not enough space above, show below the selection
        top = end.bottom + padding;
      }
      if (left - menuWidth / 2 < padding) {
        left = menuWidth / 2 + padding;
      }
      if (left + menuWidth / 2 > window.innerWidth - padding) {
        left = window.innerWidth - menuWidth / 2 - padding;
      }

      setPosition({ top, left });
      setIsVisible(true);
    } catch {
      // coordsAtPos can throw if the position is invalid
      setIsVisible(false);
    }
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      // Clear any pending show timeout
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
        showTimeoutRef.current = null;
      }

      // Don't show while actively dragging mouse
      if (isMouseDownRef.current) return;

      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to, " ");

      if (selectedText.trim().length <= 3) {
        setIsVisible(false);
        return;
      }

      // Show with a small delay to avoid flickering during keyboard selection
      showTimeoutRef.current = setTimeout(() => {
        showMenuAtSelection();
      }, 300);
    };

    const handleBlur = ({ event }: { event: FocusEvent }) => {
      // Don't hide if clicking on the bubble menu itself
      const relatedTarget = event.relatedTarget as HTMLElement;
      if (relatedTarget && relatedTarget.closest("[data-bubble-menu]")) {
        return;
      }
      // Delay hiding to allow button clicks to register
      setTimeout(() => setIsVisible(false), 200);
    };

    // Track mouse state on the editor DOM element
    const editorDom = editor.view.dom;

    const handleMouseDown = () => {
      isMouseDownRef.current = true;
      // Hide menu when starting a new selection
      setIsVisible(false);
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
        showTimeoutRef.current = null;
      }
    };

    const handleMouseUp = () => {
      isMouseDownRef.current = false;
      // After mouse release, check if we have a valid selection
      // Use a small delay to let TipTap process the selection first
      setTimeout(() => {
        showMenuAtSelection();
      }, 50);
    };

    editor.on("selectionUpdate", handleSelectionUpdate);
    editor.on("blur", handleBlur);
    editorDom.addEventListener("mousedown", handleMouseDown);
    // Listen on document for mouseup in case mouse is released outside the editor
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
      editor.off("blur", handleBlur);
      editorDom.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);

      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
      }
    };
  }, [editor, showMenuAtSelection]);

  const getSelectedText = () => {
    if (!editor) return "";
    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, " ");
  };

  const handleAction = async (
    action: "simplify" | "expand" | "continue" | "flashcards",
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
          queueMicrotask(() => {
            if (editor && !editor.isDestroyed) {
              editor
                .chain()
                .focus()
                .deleteSelection()
                .insertContent(result)
                .run();
            }
          });
          break;

        case "expand":
          result = await expandText({ text: selectedText });
          queueMicrotask(() => {
            if (editor && !editor.isDestroyed) {
              editor
                .chain()
                .focus()
                .deleteSelection()
                .insertContent(result)
                .run();
            }
          });
          break;

        case "continue":
          result = await continueText({
            text: selectedText,
            fullContext: editor.getText(),
          });
          queueMicrotask(() => {
            if (editor && !editor.isDestroyed) {
              const { to } = editor.state.selection;
              editor
                .chain()
                .focus()
                .insertContentAt(to, " " + result)
                .run();
            }
          });
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
            queueMicrotask(() => {
              if (editor && !editor.isDestroyed) {
                const { to } = editor.state.selection;
                editor
                  .chain()
                  .focus()
                  .insertContentAt(to, "<br/>" + flashcardHtml)
                  .run();
              }
            });
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

  if (!editor || !isMounted) return null;

  // Use a portal to render at document body level, escaping any overflow:hidden containers
  return createPortal(
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={menuRef}
          data-bubble-menu
          initial={{ opacity: 0, y: 5, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 5, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          style={{
            position: "fixed",
            top: position.top,
            left: position.left,
            transform: "translateX(-50%)",
            zIndex: 9999,
            pointerEvents: "auto",
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
                  e.stopPropagation();
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
                  e.stopPropagation();
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
                  e.stopPropagation();
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
                  e.stopPropagation();
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
    </AnimatePresence>,
    document.body,
  );
}
