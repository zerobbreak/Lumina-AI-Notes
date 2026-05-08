"use client";

import { useState } from "react";
import { Send, Brain, Workflow, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function NoteStudioView() {
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      role: "assistant", 
      text: "Welcome to your Note Studio. I am your Second Brain. I can access your notes, draw diagrams, and help synthesize your ideas. What are we exploring today?" 
    }
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { id: Date.now(), role: "user", text: input }]);
    setInput("");
    
    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        role: "assistant", 
        text: "I'm analyzing your notes on that topic. I can create a flowchart to visualize this. Would you like me to generate that now?" 
      }]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full w-full bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 px-6 py-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Note Studio
            </h1>
            <p className="text-xs text-muted-foreground font-medium">Your Second Brain</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Workflow className="w-4 h-4" />
              <span>Generate Canvas</span>
            </Button>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
        <div className="max-w-3xl mx-auto space-y-6 pb-20">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={cn(
                "flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div className={cn(
                "max-w-[85%] flex gap-3",
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              )}>
                {/* Avatar */}
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border mt-1 shadow-sm",
                  msg.role === "user" 
                    ? "bg-secondary text-secondary-foreground" 
                    : "bg-primary text-primary-foreground"
                )}>
                  {msg.role === "user" ? (
                    <span className="text-xs font-semibold">U</span>
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>

                {/* Message Bubble */}
                <div className={cn(
                  "px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted text-foreground rounded-tl-sm border"
                )}>
                  {msg.text}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Input Area */}
      <footer className="flex-shrink-0 p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          <div className="relative flex-1 flex items-center bg-muted/50 border rounded-xl overflow-hidden focus-within:ring-1 focus-within:ring-ring focus-within:border-primary transition-all">
            <textarea 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask your second brain..."
              className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none px-4 py-3 text-sm focus:outline-none resize-none"
              rows={1}
            />
          </div>
          <Button 
            onClick={handleSend}
            disabled={!input.trim()}
            size="icon"
            className="rounded-xl h-11 w-11 shrink-0 shadow-sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
