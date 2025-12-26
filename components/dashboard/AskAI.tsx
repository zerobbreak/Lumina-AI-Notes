"use client";

import { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  X,
  Sparkles,
  Loader2,
  Mic,
  RefreshCw,
  Grid3X3,
  Lightbulb,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AskAIProps {
  context?: string;
  onClose?: () => void;
}

export function AskAI({ context, onClose }: AskAIProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<
    { role: "user" | "ai"; content: string }[]
  >([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const userMessage = query.trim();
    setQuery("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);
    setIsExpanded(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: `This is a simulated response to: "${userMessage}". In production, this would connect to an AI API.`,
        },
      ]);
      setIsLoading(false);
    }, 1500);
  };

  const handleClose = () => {
    setIsExpanded(false);
    setMessages([]);
    onClose?.();
  };

  return (
    <>
      {/* Floating Center Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        {/* Expanded Chat Panel */}
        {isExpanded && messages.length > 0 && (
          <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-[500px] max-h-[400px] rounded-2xl border border-white/10 bg-[#0A0A0A]/90 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-linear-to-r from-cyan-500 to-blue-500 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-white">
                  Lumina AI
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-gray-400 hover:text-white rounded-full"
                onClick={handleClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Messages */}
            <div className="max-h-[300px] overflow-y-auto p-4 space-y-3">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex gap-2",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "ai" && (
                    <div className="w-6 h-6 rounded-md bg-linear-to-r from-cyan-500 to-blue-500 flex items-center justify-center shrink-0">
                      <Bot className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[350px] px-3 py-2 rounded-xl text-sm",
                      message.role === "user"
                        ? "bg-cyan-500 text-black rounded-br-sm"
                        : "bg-white/5 text-gray-200 border border-white/5 rounded-bl-sm"
                    )}
                  >
                    {message.content}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-md bg-linear-to-r from-cyan-500 to-blue-500 flex items-center justify-center shrink-0">
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                  <div className="px-3 py-2 rounded-xl text-sm bg-white/5 border border-white/5 rounded-bl-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span className="text-xs">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Main Input Bar */}
        <div className="flex items-center gap-2">
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-[#111]/80 backdrop-blur-xl border border-white/10 shadow-xl shadow-black/30 hover:border-white/20 transition-colors"
          >
            {/* Ask Button */}
            <button
              type="button"
              onClick={() => inputRef.current?.focus()}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-linear-to-r from-purple-600 to-violet-600 text-white text-sm font-medium hover:from-purple-500 hover:to-violet-500 transition-all shadow-lg shadow-purple-500/20"
            >
              <Sparkles className="w-4 h-4" />
              Ask Lumina
            </button>

            {/* Input */}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about the lecture..."
              className="w-64 bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none"
            />

            {/* Action Icons */}
            <div className="flex items-center gap-1 border-l border-white/10 pl-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10 rounded-full"
                title="Refine"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10 rounded-full"
                title="Record"
              >
                <Mic className="w-4 h-4" />
              </Button>
            </div>

            {/* Send Button */}
            {query.trim() && (
              <Button
                type="submit"
                disabled={isLoading}
                size="icon"
                className="h-8 w-8 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            )}
          </form>
        </div>
      </div>
    </>
  );
}
