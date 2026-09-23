"use client";

import { Editor } from "@tiptap/react";
import { useAiActions } from "@/lib/hooks/ai/useAiActions";
import { useAppCommand } from "@/lib/appCommands";
import { formatShortcut } from "@/hooks/useKeyboardShortcut";
import { shortcutFor } from "@/constants/shortcuts";
import { useState, useEffect, useRef } from "react";
import { marked } from "marked";
import { toast } from "sonner";
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
  ChevronDown,
  Lightbulb,
  ListCollapse,
  ArrowUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BubbleMenu } from "@tiptap/react/menus";
import { cn } from "@/lib/utils";

interface AIBubbleMenuProps {
  editor: Editor | null;
}

type AiAction =
  | "simplify"
  | "expand"
  | "continue"
  | "explain"
  | "summarize"
  | "flashcards"
  | "ask";

const ACTIONS: {
  id: Exclude<AiAction, "ask">;
  label: string;
  hint: string;
  busy: string;
  icon: typeof Wand2;
}[] = [
  { id: "explain", label: "Explain", hint: "Adds an explanation below", busy: "Explaining", icon: Lightbulb },
  { id: "summarize", label: "Summarize", hint: "Adds a short summary below", busy: "Summarizing", icon: ListCollapse },
  { id: "simplify", label: "Simplify", hint: "Rewrites in plainer words", busy: "Simplifying", icon: Minimize2 },
  { id: "expand", label: "Expand", hint: "Rewrites with more detail", busy: "Expanding", icon: Maximize2 },
  { id: "continue", label: "Continue writing", hint: "Writes the next sentences", busy: "Writing", icon: Wand2 },
  { id: "flashcards", label: "Create flashcards", hint: "Adds Q&A cards below", busy: "Making flashcards", icon: Layers },
];

const PRESET_QUESTIONS: Partial<Record<AiAction, string>> = {
  explain: "Explain this clearly, as a tutor would to a student, with an example if it helps.",
  summarize: "Summarize this in a few short bullet points.",
};

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function markdownToHtml(md: string) {
  return String(await marked.parse(md.trim()));
}

/** Position just after the top-level block containing `pos`. */
function afterBlock(editor: Editor, pos: number) {
  const $pos = editor.state.doc.resolve(pos);
  return $pos.depth > 0 ? $pos.after(1) : pos;
}

function selectedText(editor: Editor) {
  const { from, to } = editor.state.selection;
  return { from, to, text: editor.state.doc.textBetween(from, to, " ") };
}

export function AIBubbleMenu({ editor }: AIBubbleMenuProps) {
  const [activeAction, setActiveAction] = useState<AiAction | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [question, setQuestion] = useState("");
  const questionRef = useRef<HTMLInputElement>(null);

  const { simplifyText, expandText, continueText, generateFlashcards, askAboutContext } =
    useAiActions();

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Close the AI panel once the selection it was opened for is gone.
  useEffect(() => {
    if (!editor) return;
    const onSelection = () => {
      if (editor.state.selection.empty) setShowAI(false);
    };
    editor.on("selectionUpdate", onSelection);
    return () => {
      editor.off("selectionUpdate", onSelection);
    };
  }, [editor]);

  useEffect(() => {
    if (showAI) questionRef.current?.focus();
  }, [showAI]);

  useAppCommand("editor:ask-ai", () => {
    if (!editor || editor.isDestroyed || !editor.isEditable) return;
    if (!selectedText(editor).text.trim()) {
      toast.error("Select some text in the note first, then ask AI about it.");
      return;
    }
    setShowAI(true);
  });

  const insertBelow = async (to: number, markdown: string) => {
    if (!editor) return;
    const html = await markdownToHtml(markdown);
    editor.chain().focus().insertContentAt(afterBlock(editor, to), html).run();
  };

  const runAction = async (action: AiAction, askText?: string) => {
    if (!editor || activeAction) return;
    const { from, to, text } = selectedText(editor);
    if (!text.trim() || from === to) {
      toast.error("Select some text first.");
      return;
    }

    setActiveAction(action);
    try {
      switch (action) {
        case "simplify":
        case "expand": {
          const result =
            action === "simplify"
              ? await simplifyText({ text })
              : await expandText({ text });
          editor.chain().focus().insertContentAt({ from, to }, result).run();
          break;
        }

        case "continue": {
          const result = await continueText({ text, fullContext: editor.getText() });
          editor.chain().focus().insertContentAt(to, " " + result).run();
          break;
        }

        case "explain":
        case "summarize":
        case "ask": {
          const q = action === "ask" ? askText! : PRESET_QUESTIONS[action]!;
          const answer = await askAboutContext({
            question: `${q}\n\nThe text in question:\n"""\n${text}\n"""`,
            context: editor.getText().slice(0, 8000),
            contextType: "note",
          });
          const heading = action === "ask" ? `**Q: ${q}**\n\n` : "";
          await insertBelow(to, `${heading}${answer}`);
          setQuestion("");
          break;
        }

        case "flashcards": {
          const cards = await generateFlashcards({ text });
          if (cards.length === 0) {
            toast.error("No flashcards could be made from that text.");
            break;
          }
          const items = cards
            .map(
              (card, i) =>
                `<li><strong>Q${i + 1}:</strong> ${escapeHtml(card.front)}<br/><em>A:</em> ${escapeHtml(card.back)}</li>`,
            )
            .join("");
          editor
            .chain()
            .focus()
            .insertContentAt(afterBlock(editor, to), `<h3>📚 Flashcards</h3><ul>${items}</ul>`)
            .run();
          break;
        }
      }
      setShowAI(false);
    } catch (error) {
      console.error(`AI ${action} error:`, error);
      toast.error(
        error instanceof Error && error.message
          ? `AI request failed: ${error.message}`
          : "AI request failed. Please try again.",
      );
    } finally {
      setActiveAction(null);
    }
  };

  if (!editor || !isMounted) return null;

  const formatButton = (active: boolean) =>
    cn(
      "h-8 w-8 p-0",
      active
        ? "bg-accent text-foreground"
        : "text-muted-foreground hover:text-foreground hover:bg-accent",
    );
  const askShortcut = shortcutFor("editor:ask-ai");
  const busyLabel =
    activeAction === "ask"
      ? "Thinking"
      : ACTIONS.find((a) => a.id === activeAction)?.busy;

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="aiBubbleMenu"
      // Replaces TipTap's default check, so it has to repeat it: only for a
      // real text selection, while the editor or this menu has focus.
      shouldShow={({ editor: ed, view, state, from, to, element }) => {
        if (!ed.isEditable || ed.isActive("codeBlock")) return false;
        if (state.selection.empty || !state.doc.textBetween(from, to).trim()) return false;
        return view.hasFocus() || element.contains(document.activeElement);
      }}
      options={{
        placement: "top",
        offset: 8,
      }}
      className="z-50"
    >
      <div className="flex max-w-none items-center gap-0.5 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md">
        {/* Formatting Tools */}
        <div className="flex items-center gap-0.5 pr-1 border-r border-border">
          <Button
            size="sm"
            variant="ghost"
            className={formatButton(editor.isActive("bold"))}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title={`Bold (${formatShortcut("mod+b")})`}
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={formatButton(editor.isActive("italic"))}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title={`Italic (${formatShortcut("mod+i")})`}
          >
            <Italic className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={formatButton(editor.isActive("strike"))}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title={`Strikethrough (${formatShortcut("mod+shift+s")})`}
          >
            <Strikethrough className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={formatButton(editor.isActive("code"))}
            onClick={() => editor.chain().focus().toggleCode().run()}
            title={`Inline code (${formatShortcut("mod+e")})`}
          >
            <Code className="w-4 h-4" />
          </Button>
        </div>

        {/* AI Tools Toggle */}
        <div className="flex items-center gap-0.5 pl-1">
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              "h-8 px-2 text-xs gap-1.5",
              showAI
                ? "bg-primary/15 text-primary"
                : "text-primary hover:bg-primary/10",
            )}
            onClick={() => setShowAI(!showAI)}
            title={askShortcut ? `Ask AI (${formatShortcut(askShortcut)})` : "Ask AI"}
            aria-expanded={showAI}
          >
            <Wand2 className="w-3.5 h-3.5" />
            Ask AI
            <ChevronDown
              className={`w-3 h-3 transition-transform ${showAI ? "rotate-180" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* AI actions, under the toolbar */}
      <AnimatePresence>
        {showAI && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-1 w-72 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-xl"
          >
            {activeAction ? (
              <div className="flex items-center gap-2 px-3 py-3 text-sm text-primary">
                <Loader2 className="w-4 h-4 animate-spin" />
                {busyLabel}…
              </div>
            ) : (
              <>
                <form
                  className="flex items-center gap-1 border-b border-border p-1 pb-2 mb-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (question.trim()) void runAction("ask", question.trim());
                  }}
                >
                  <input
                    ref={questionRef}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setShowAI(false);
                        editor.commands.focus();
                      }
                    }}
                    placeholder="Ask anything about the selection…"
                    className="h-8 min-w-0 flex-1 rounded-md bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    variant="ghost"
                    disabled={!question.trim()}
                    className="h-7 w-7 p-0 text-primary"
                    aria-label="Ask"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                </form>
                {ACTIONS.map(({ id, label, hint, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => void runAction(id)}
                    className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-accent"
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0 text-primary" />
                    <span className="min-w-0">
                      <span className="block text-xs font-medium">{label}</span>
                      <span className="block text-[11px] text-muted-foreground">{hint}</span>
                    </span>
                  </button>
                ))}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </BubbleMenu>
  );
}
