"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send,
  Brain,
  Workflow,
  Bot,
  Plus,
  MessageSquare,
  X,
  AtSign,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

import { useRouter } from "next/navigation";

type NoteRef = { _id: Id<"notes">; title: string };
type SelectedNote = NoteRef;

type MessageNote = { id: Id<"notes">; title: string };

type ChatMode =
  | "explain"
  | "synthesize"
  | "compare"
  | "apply"
  | "quiz"
  | "fill_gaps";

const MODE_LABELS: Record<ChatMode, string> = {
  explain: "Explain",
  synthesize: "Synthesize",
  compare: "Compare",
  apply: "Apply",
  quiz: "Quiz me",
  fill_gaps: "Fill gaps",
};

function AssistantMarkdown({
  content,
  notes,
  onOpenNote,
}: {
  content: string;
  notes?: MessageNote[];
  onOpenNote: (noteId: Id<"notes">) => void;
}) {
  // Convert [#1] citations into special links we can render as chips.
  const withCitations = content.replace(/\[#(\d+)\]/g, (_m, nStr) => {
    const n = Number(nStr);
    if (!Number.isFinite(n) || n < 1) return `[#${nStr}]`;
    return `[[#${n}]](note-cite:${n})`;
  });

  return (
    <div className="prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-p:my-2 prose-li:my-1 prose-ul:my-2 prose-ol:my-2 prose-hr:my-4 prose-hr:border-border/60 prose-blockquote:border-l-primary/40 prose-blockquote:text-muted-foreground prose-pre:bg-background/60 prose-pre:border prose-pre:border-border/60 prose-pre:rounded-xl prose-pre:px-3 prose-pre:py-2 prose-code:bg-muted/40 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:before:content-none prose-code:after:content-none max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          a: ({ href, children }) => {
            if (href?.startsWith("note-cite:")) {
              const idx = Number(href.slice("note-cite:".length));
              const note = notes?.[idx - 1];
              if (!note) {
                return (
                  <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
                    {children}
                  </span>
                );
              }
              return (
                <button
                  type="button"
                  onClick={() => onOpenNote(note.id)}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/15 transition-colors align-baseline"
                  title={note.title}
                >
                  {children}
                  <span className="max-w-[18ch] truncate">· {note.title}</span>
                </button>
              );
            }
            return (
              <a
                href={href}
                className="text-primary underline underline-offset-4 hover:opacity-90"
                target="_blank"
                rel="noreferrer"
              >
                {children}
              </a>
            );
          },
          code: ({ className, children }) => {
            const isBlock = typeof className === "string" && className.includes("language-");
            if (!isBlock) {
              return (
                <code className="rounded bg-muted/40 px-1 py-0.5 text-[0.9em]">
                  {children}
                </code>
              );
            }
            return <code className={className}>{children}</code>;
          },
        }}
      >
        {withCitations}
      </ReactMarkdown>
    </div>
  );
}

export default function NoteStudioView() {
  const router = useRouter();
  const sessions = useQuery(api.chats.getSessions) || [];
  const recentNotes = useQuery(api.notes.getRecentNotes) || [];
  
  const [activeSessionId, setActiveSessionId] = useState<Id<"chatSessions"> | null>(null);
  const [input, setInput] = useState("");
  const isCreatingFallbackSessionRef = useRef(false);
  
  // @ Mention State
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [selectedNotes, setSelectedNotes] = useState<SelectedNote[]>([]);
  const [mentionActiveIndex, setMentionActiveIndex] = useState(0);
  
  const createSession = useMutation(api.chats.createSession);
  const sendMessage = useMutation(api.chats.sendMessage);
  const deleteSession = useMutation(api.chats.deleteSession);
  const generateAssistantReply = useAction(api.chatsAi.generateAssistantReply);
  const pinNotesToSession = useMutation(api.chats.pinNotesToSession);
  const unpinNoteFromSession = useMutation(api.chats.unpinNoteFromSession);
  const setSessionMode = useMutation(api.chats.setSessionMode);
  const [isThinking, setIsThinking] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (sessions.length > 0 && !activeSessionId) {
      setActiveSessionId(sessions[0]._id);
    }
  }, [sessions, activeSessionId]);

  // If the active session disappears (deleted elsewhere / stale URL / etc),
  // automatically spin up a fresh chat like the "first message" flow.
  useEffect(() => {
    const activeMissing =
      activeSessionId !== null && !sessions.some((s) => s._id === activeSessionId);
    if (!activeMissing) return;
    if (isCreatingFallbackSessionRef.current) return;
    isCreatingFallbackSessionRef.current = true;

    void (async () => {
      try {
        const newSessionId = await createSession({ title: "New Chat" });
        setActiveSessionId(newSessionId);
        setInput("");
        setSelectedNotes([]);
      } finally {
        isCreatingFallbackSessionRef.current = false;
      }
    })();
  }, [activeSessionId, sessions, createSession]);

  const messages = useQuery(
    api.chats.getMessages,
    activeSessionId ? { sessionId: activeSessionId } : "skip",
  );
  const activeSession = useQuery(
    api.chats.getSession,
    activeSessionId ? { sessionId: activeSessionId } : "skip",
  );
  const pinnedNotes = useQuery(
    api.chats.getContextNotes,
    activeSession?.pinnedNoteIds && activeSession.pinnedNoteIds.length > 0
      ? { noteIds: activeSession.pinnedNoteIds as Id<"notes">[] }
      : { noteIds: [] },
  );
  const mode = (activeSession?.mode as ChatMode | undefined) ?? "explain";

  // Scroll to bottom on new messages
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  const handleNewChat = async () => {
    const newSessionId = await createSession({ title: "New Chat" });
    setActiveSessionId(newSessionId);
    setInput("");
    setSelectedNotes([]);
  };

  const handleDeleteSession = async (
    e: React.MouseEvent,
    sessionId: Id<"chatSessions">,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const ok = window.confirm("Delete this chat? This cannot be undone.");
    if (!ok) return;

    if (activeSessionId === sessionId) {
      // Prevent `getMessages` from firing while deletion is in-flight.
      setActiveSessionId(null);
    }

    await deleteSession({ sessionId });

    const remaining = sessions.filter((s) => s._id !== sessionId);
    if (remaining.length > 0) {
      // If we deleted the active session, move to the next one.
      if (activeSessionId === sessionId) {
        setActiveSessionId(remaining[0]!._id);
      }
      return;
    }

    // No chats left — auto-spin up a new one.
    const newSessionId = await createSession({ title: "New Chat" });
    setActiveSessionId(newSessionId);
    setInput("");
    setSelectedNotes([]);
  };

  const handleSend = async () => {
    if (!input.trim() && selectedNotes.length === 0) return;
    
    let targetSessionId = activeSessionId;
    const question = input;
    
    // Create a new session on the fly if none exists
    if (!targetSessionId) {
      targetSessionId = await createSession({ title: input.slice(0, 30) || "New Chat" });
      setActiveSessionId(targetSessionId);
    }

    const contextNoteIds = selectedNotes.map((n) => n._id);
    const pinnedIds =
      activeSession?.pinnedNoteIds && Array.isArray(activeSession.pinnedNoteIds)
        ? (activeSession.pinnedNoteIds as Id<"notes">[])
        : [];
    const mergedContextIds = Array.from(new Set([...pinnedIds, ...contextNoteIds]));
    
    // Send User Message
    await sendMessage({
      sessionId: targetSessionId,
      role: "user",
      content: input,
      contextNoteIds: mergedContextIds.length > 0 ? mergedContextIds : undefined,
    });

    // Sticky context: if user referenced notes, pin them to the session.
    if (contextNoteIds.length > 0) {
      void pinNotesToSession({ sessionId: targetSessionId, noteIds: contextNoteIds });
    }
    
    setInput("");
    setSelectedNotes([]);
    setShowMentions(false);
    
    setIsThinking(true);

    try {
      await generateAssistantReply({
        sessionId: targetSessionId,
        question,
        contextNoteIds: contextNoteIds.length > 0 ? contextNoteIds : undefined,
      });
    } finally {
      setIsThinking(false);
    }
  };

  const handleTogglePinned = async (noteId: Id<"notes">) => {
    if (!activeSessionId) return;
    await unpinNoteFromSession({ sessionId: activeSessionId, noteId });
  };

  const handleSetMode = async (next: ChatMode) => {
    if (!activeSessionId) return;
    await setSessionMode({ sessionId: activeSessionId, mode: next });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);

    // Naive mention detection
    const lastAtIdx = val.lastIndexOf("@");
    if (lastAtIdx !== -1) {
      const textAfterAt = val.slice(lastAtIdx + 1);
      if (!textAfterAt.includes(" ")) {
        setMentionFilter(textAfterAt.toLowerCase());
        setShowMentions(true);
        return;
      }
    }
    setShowMentions(false);
  };

  const handleSelectNote = (note: NoteRef) => {
    if (!selectedNotes.find(n => n._id === note._id)) {
      setSelectedNotes([...selectedNotes, note]);
    }
    
    // Remove the typed @query
    const lastAtIdx = input.lastIndexOf("@");
    if (lastAtIdx !== -1) {
      setInput(input.slice(0, lastAtIdx));
    }
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const removeNote = (noteId: Id<"notes">) => {
    setSelectedNotes(selectedNotes.filter(n => n._id !== noteId));
  };

  const filteredNotes = (recentNotes as NoteRef[]).filter((n) =>
    n.title.toLowerCase().includes(mentionFilter),
  );
  const hasMentionResults = showMentions && filteredNotes.length > 0;

  useEffect(() => {
    setMentionActiveIndex(0);
  }, [mentionFilter, showMentions]);

  return (
    <div className="flex h-full w-full bg-background text-foreground overflow-hidden">
      
      {/* Sidebar - Chat Sessions */}
      <div className="w-64 border-r bg-muted/20 flex flex-col hidden md:flex">
        <div className="p-4 border-b">
          <Button onClick={handleNewChat} className="w-full gap-2 justify-start" variant="outline">
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.map((session) => (
            <div
              key={session._id}
              className={cn(
                "group flex w-full items-center gap-0 rounded-lg text-sm transition-colors",
                activeSessionId === session._id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <button
                type="button"
                onClick={() => setActiveSessionId(session._id)}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{session.title}</span>
              </button>
              <div className="shrink-0 pr-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => void handleDeleteSession(e, session._id)}
                  aria-label="Delete chat"
                  title="Delete chat"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex-shrink-0 px-6 py-4 border-b bg-background/95 backdrop-blur z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Note Studio</h1>
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

        <main ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-3xl mx-auto space-y-6 pb-20">
            {/* Empty State */}
            {(!messages || messages.length === 0) && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 mt-20">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Brain className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold">How can I help you synthesize?</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Type <kbd className="px-1.5 py-0.5 bg-muted rounded-md text-xs font-mono">@</kbd> to reference specific notes in your conversation.
                  </p>
                </div>
              </div>
            )}

            {/* Messages */}
            {messages?.map((msg) => (
              <div 
                key={msg._id} 
                className={cn(
                  "flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div className={cn(
                  "max-w-[85%] flex gap-3",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                )}>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border mt-1 shadow-sm",
                    msg.role === "user" 
                      ? "bg-secondary text-secondary-foreground" 
                      : "bg-primary text-primary-foreground"
                  )}>
                    {msg.role === "user" ? <span className="text-xs font-semibold">U</span> : <Bot className="w-4 h-4" />}
                  </div>

                  <div className="flex flex-col gap-1 min-w-0">
                    <div className={cn(
                      "px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted/60 text-foreground rounded-tl-sm border border-border/70 backdrop-blur-sm"
                    )}>
                      {msg.role === "assistant" ? (
                        <AssistantMarkdown
                          content={msg.content}
                          notes={msg.notes as MessageNote[] | undefined}
                          onOpenNote={(noteId) =>
                            router.push(`/dashboard?noteId=${noteId}`)
                          }
                        />
                      ) : (
                        msg.content
                      )}
                    </div>
                    {/* Render mentioned notes in message history */}
                    {msg.contextNoteIds && msg.contextNoteIds.length > 0 && (
                      <div className={cn(
                        "flex flex-wrap gap-1 mt-1",
                        msg.role === "user" ? "justify-end" : "justify-start"
                      )}>
                        {msg.notes?.map((note, idx) => (
                           <button 
                             key={idx} 
                             onClick={() => router.push(`/dashboard?noteId=${note.id}`)}
                             className="flex items-center gap-1 text-[10px] bg-primary/10 hover:bg-primary/20 transition-colors px-2 py-0.5 rounded-full border border-primary/20 text-primary font-medium"
                           >
                             <AtSign className="w-3 h-3" /> {note.title}
                           </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {/* Thinking Indicator */}
            {isThinking && (
              <div className="flex w-full justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex gap-3 flex-row">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 border mt-1 shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="bg-muted text-foreground px-4 py-3 rounded-2xl rounded-tl-sm border shadow-sm flex items-center gap-1.5 min-w-[60px]">
                      <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce"></span>
                    </div>
                    <span className="text-[10px] text-muted-foreground ml-1 font-medium italic animate-pulse">
                      Synthesizing your second brain...
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        <footer className="flex-shrink-0 p-4 pt-0">
          <div className="max-w-3xl mx-auto relative">
            {/* Session mode + pinned context */}
            {activeSessionId && (
              <div className="mb-2 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Mode
                  </span>
                  <div className="h-px flex-1 bg-border/60" />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {(Object.keys(MODE_LABELS) as ChatMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => void handleSetMode(m)}
                      className={cn(
                        "shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                        m === mode
                          ? "bg-primary/12 text-primary border-primary/30 shadow-[0_0_0_1px_rgba(0,0,0,0.02)]"
                          : "bg-background/60 text-muted-foreground border-border/60 hover:bg-muted/40 hover:text-foreground",
                      )}
                      title={`Mode: ${MODE_LABELS[m]}`}
                    >
                      {MODE_LABELS[m]}
                    </button>
                  ))}
                </div>

                {pinnedNotes && pinnedNotes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {pinnedNotes.map((n: { id: Id<"notes">; title: string }) => (
                      <div
                        key={n.id}
                        className="flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-1 rounded-md font-medium border border-primary/20"
                      >
                        <button
                          type="button"
                          onClick={() => router.push(`/dashboard?noteId=${n.id}`)}
                          className="hover:underline underline-offset-2"
                          title="Open pinned note"
                        >
                          @{n.title}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleTogglePinned(n.id)}
                          className="hover:bg-primary/20 rounded-full p-0.5"
                          aria-label="Unpin note"
                          title="Unpin note"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Mentions Dropdown */}
            {showMentions && (
              <div className="absolute bottom-full left-0 mb-2 w-64 bg-background border rounded-lg shadow-xl max-h-60 overflow-y-auto z-50 p-1 animate-in fade-in slide-in-from-bottom-2">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Select Note
                </div>
                {filteredNotes.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-center text-muted-foreground">
                    No notes found.
                  </div>
                ) : (
                  filteredNotes.map((note, idx) => (
                    <button
                      key={note._id}
                      onClick={() => handleSelectNote(note)}
                      onMouseEnter={() => setMentionActiveIndex(idx)}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm rounded-md outline-none transition-colors truncate flex items-center gap-2",
                        idx === mentionActiveIndex ? "bg-muted" : "hover:bg-muted",
                      )}
                    >
                      <AtSign className="w-3 h-3 text-primary shrink-0" />
                      {note.title}
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Input Box */}
            <div className="relative flex flex-col bg-muted/50 border rounded-2xl overflow-hidden focus-within:ring-1 focus-within:ring-ring focus-within:border-primary transition-all shadow-sm">
              
              {/* Selected Pills Area */}
              {selectedNotes.length > 0 && (
                <div className="flex flex-wrap gap-2 px-4 pt-3 pb-1">
                  {selectedNotes.map((n) => (
                     <div key={n._id} className="flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-1 rounded-md font-medium border border-primary/20">
                        <span>@{n.title}</span>
                        <button onClick={() => removeNote(n._id)} className="hover:bg-primary/20 rounded-full p-0.5">
                          <X className="w-3 h-3" />
                        </button>
                     </div>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2 p-2">
                <textarea 
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (showMentions) {
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setShowMentions(false);
                        return;
                      }
                      if (
                        hasMentionResults &&
                        (e.key === "ArrowDown" || e.key === "ArrowUp")
                      ) {
                        e.preventDefault();
                        setMentionActiveIndex((prev) => {
                          const delta = e.key === "ArrowDown" ? 1 : -1;
                          return (
                            (prev + delta + filteredNotes.length) %
                            filteredNotes.length
                          );
                        });
                        return;
                      }
                      if (hasMentionResults && e.key === "Enter") {
                        e.preventDefault();
                        const picked = filteredNotes[mentionActiveIndex];
                        if (picked) handleSelectNote(picked);
                        return;
                      }
                    }
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask your second brain... (Type @ to mention notes)"
                  className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none px-3 py-3 text-sm focus:outline-none resize-none"
                  rows={1}
                />
                <Button 
                  onClick={handleSend}
                  disabled={!input.trim() && selectedNotes.length === 0}
                  size="icon"
                  className="rounded-xl h-10 w-10 shrink-0 shadow-sm mb-1 mr-1"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
