"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Copy, Send, Loader2, FileText } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChipChatProps {
  fileId: Id<"files">;
  fileName: string;
  onCopyToNote?: (content: string) => void;
}

export function ChipChat({ fileId, fileName, onCopyToNote }: ChipChatProps) {
  const askAboutFile = useAction(api.ai.askAboutFile);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const result = await askAboutFile({
        fileId,
        question: userMessage,
      });

      if (result.success && result.answer) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: result.answer! },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: result.error || "Failed to get a response.",
          },
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "An error occurred. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (content: string) => {
    if (onCopyToNote) {
      onCopyToNote(content);
    }
  };

  return (
    <div className="w-80 max-h-96 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-white/10">
        <FileText className="w-4 h-4 text-indigo-400" />
        <h4 className="text-xs font-semibold text-gray-400 uppercase truncate flex-1">
          Asking {fileName}
        </h4>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-2 space-y-3 min-h-[60px] max-h-60">
        {messages.length === 0 && !isLoading && (
          <p className="text-xs text-gray-500 text-center py-4">
            Ask a question about this document
          </p>
        )}

        {messages.map((message, index) => (
          <div key={index} className="space-y-1">
            <div
              className={`text-xs font-medium ${
                message.role === "user" ? "text-indigo-300" : "text-gray-400"
              }`}
            >
              {message.role === "user" ? "You" : "Lumina"}
            </div>
            <div
              className={`text-sm ${
                message.role === "user" ? "text-white" : "text-gray-300"
              }`}
            >
              {message.content}
            </div>
            {message.role === "assistant" && onCopyToNote && (
              <button
                onClick={() => handleCopy(message.content)}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors mt-1"
              >
                <Copy className="w-3 h-3" />
                Copy to Note
              </button>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="pt-2 border-t border-white/10">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            disabled={isLoading}
            className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="p-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded transition-colors"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
