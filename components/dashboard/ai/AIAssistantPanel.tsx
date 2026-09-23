"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  Sparkles,
  Bot,
  Loader2,
  FileText,
  Brain,
  HelpCircle,
  ListChecks,
  Info,
  Copy,
  Check,
  PenLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAiActions } from "@/lib/hooks/ai/useAiActions";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

interface AIAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  context?: string;
  contextType?: "note" | "transcript" | "general";
  contextTitle?: string;
  onInsertToNote?: (content: string) => void;
}

interface Message {
  role: "user" | "ai";
  content: string;
  contextUsed?: string;
  copied?: boolean;
}

const STARTER_PROMPTS = [
  {
    icon: FileText,
    label: "Summarize this",
    prompt: "Summarize the key points from this content in a concise format.",
  },
  {
    icon: Brain,
    label: "Key concepts",
    prompt: "Extract and explain the main concepts from this content.",
  },
  {
    icon: ListChecks,
    label: "Study questions",
    prompt: "Create 5 study questions based on this content to help me review.",
  },
  {
    icon: HelpCircle,
    label: "Explain simply",
    prompt: "Explain the main ideas from this content in simple terms.",
  },
];

export function AIAssistantPanel({
  isOpen,
  onClose,
  context,
  contextType = "general",
  contextTitle,
  onInsertToNote,
}: AIAssistantPanelProps) {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showStarterPrompts, setShowStarterPrompts] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { askAboutContext } = useAiActions();

  // Copy to clipboard
  const handleCopy = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  // Insert content into note
  const handleInsertToNote = (content: string) => {
    if (onInsertToNote) {
      onInsertToNote(content);
      toast.success("Inserted into note");
    } else {
      toast.error("Open a note first to insert content");
    }
  };

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset state when panel closes
  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
      setInputValue("");
      setShowStarterPrompts(true);
    }
  }, [isOpen]);

  const handleSubmit = async (question: string) => {
    if (!question.trim() || isLoading) return;

    setShowStarterPrompts(false);
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await askAboutContext({
        question: question,
        context:
          context ||
          "No specific context provided. Answer based on general knowledge.",
        contextType: contextType,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: response,
          contextUsed: context
            ? contextTitle || "Current page content"
            : undefined,
        },
      ]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content:
            "Sorry, I encountered an error processing your request. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit(inputValue);
  };

  const handleStarterPrompt = (prompt: string) => {
    handleSubmit(prompt);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Popup Card */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-16 right-0 w-[380px] max-h-[600px] h-[70vh] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-linear-to-r from-primary to-primary-alt flex items-center justify-center shadow-lg shadow-primary/20">
                  <Sparkles className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Lumina AI</h3>
                  <p className="text-xs text-muted-foreground">
                    Context-aware assistant
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-foreground/5 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Context Indicator */}
            {context && (
              <div className="px-6 py-3 bg-primary/5 border-b border-border/60">
                <div className="flex items-center gap-2 text-xs text-primary">
                  <Info className="w-3.5 h-3.5" />
                  <span>
                    Using context from:{" "}
                    <span className="font-medium text-primary">
                      {contextTitle || "Current page"}
                    </span>
                  </span>
                </div>
              </div>
            )}

            {/* Content Area */}
            <ScrollArea className="flex-1 p-6">
              {showStarterPrompts && messages.length === 0 ? (
                // Starter Prompts View
                <div className="h-full flex flex-col">
                  {/* Welcome */}
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-linear-to-br from-primary to-primary-alt flex items-center justify-center shadow-xl shadow-primary/30">
                      <Sparkles className="w-8 h-8 text-foreground" />
                    </div>
                    <h4 className="text-lg font-medium text-foreground mb-2">
                      How can I help?
                    </h4>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                      {context
                        ? "I've analyzed your content. Choose an action or ask your own question."
                        : contextTitle
                          ? "I see your note is empty. Start writing or ask me for ideas."
                          : "Ask me anything about your notes or studies."}
                    </p>
                  </div>

                  {/* Starter Prompt Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    {STARTER_PROMPTS.map((item) => (
                      <button
                        key={item.label}
                        onClick={() => handleStarterPrompt(item.prompt)}
                        disabled={!context && !contextTitle} // Only disable if truly no context (e.g. dashboard home)
                        className="group p-4 rounded-xl bg-foreground/5 border border-border/60 hover:bg-foreground/10 hover:border-primary/30 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                          <item.icon className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>

                  {!context && !contextTitle && (
                    <p className="text-xs text-center text-muted-foreground/80 mt-6">
                      Open a note to enable context-aware prompts
                    </p>
                  )}
                  {!context && contextTitle && (
                    <p className="text-xs text-center text-muted-foreground/80 mt-6">
                      Type some notes to get specific summaries and questions.
                    </p>
                  )}
                </div>
              ) : (
                // Messages View
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 ${
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      {message.role === "ai" && (
                        <div className="w-8 h-8 rounded-lg bg-linear-to-r from-cyan-500 to-blue-500 flex items-center justify-center shrink-0">
                          <Bot className="w-4 h-4 text-foreground" />
                        </div>
                      )}
                      <div className="flex flex-col gap-1 max-w-[85%]">
                        <div
                          className={`px-4 py-3 rounded-2xl text-sm ${
                            message.role === "user"
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-foreground/5 text-foreground/90 border border-border/60 rounded-bl-md"
                          }`}
                        >
                          <div className="whitespace-pre-wrap prose prose-invert prose-sm reading-surface-compact max-w-none">
                            {message.role === "ai" ? (
                              <ReactMarkdown>{message.content}</ReactMarkdown>
                            ) : (
                              message.content
                            )}
                          </div>
                        </div>
                        
                        {/* Action buttons for AI messages */}
                        {message.role === "ai" && (
                          <div className="flex items-center gap-1 px-2 mt-1">
                            <button
                              onClick={() => handleCopy(message.content, index)}
                              className="flex items-center gap-1 text-[10px] text-muted-foreground/80 hover:text-foreground/80 transition-colors px-2 py-1 rounded hover:bg-foreground/5"
                              title="Copy to clipboard"
                            >
                              {copiedIndex === index ? (
                                <>
                                  <Check className="w-3 h-3 text-green-400" />
                                  <span className="text-green-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                            
                            {onInsertToNote && (
                              <button
                                onClick={() => handleInsertToNote(message.content)}
                                className="flex items-center gap-1 text-[10px] text-muted-foreground/80 hover:text-primary transition-colors px-2 py-1 rounded hover:bg-primary/10"
                                title="Insert into current note"
                              >
                                <PenLine className="w-3 h-3" />
                                <span>Insert to Note</span>
                              </button>
                            )}
                            
                            {message.contextUsed && (
                              <span className="text-[10px] text-muted-foreground/60 ml-auto">
                                Used: {message.contextUsed}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Loading Indicator */}
                  {isLoading && (
                    <div className="flex gap-3 items-start">
                      <div className="w-8 h-8 rounded-lg bg-linear-to-r from-cyan-500 to-blue-500 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-foreground" />
                      </div>
                      <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-foreground/5 border border-border/60">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Input Area */}
            <form
              onSubmit={handleFormSubmit}
              className="p-4 border-t border-border/60 bg-inset"
            >
              <div className="flex items-center gap-2">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask Lumina anything..."
                  className="flex-1 bg-foreground/5 border-border text-foreground placeholder:text-muted-foreground/80 focus-visible:ring-primary"
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
