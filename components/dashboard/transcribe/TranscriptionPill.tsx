"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { useAction, useMutation, useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  Check,
  FileAudio,
  Mic,
  RotateCcw,
  Search,
  Sparkles,
  Square,
  X,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { splitHighlightSegments } from "@/convex/shared/keywordSearch";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/hooks/useDashboard";
import { useDebounce } from "@/hooks/useDebounce";
import { useMicLevels } from "@/hooks/useMicLevels";
import { useCreateNoteFlow } from "@/hooks/useCreateNoteFlow";
import type { StructuredNotes } from "@/components/dashboard/DashboardContext";
import { PillWaveform } from "./PillWaveform";
import { ThinkingSequence } from "./ThinkingSequence";
import {
  formatElapsed,
  idleWaveform,
  mirrorLevels,
  phaseLabel,
  resolvePhase,
} from "./pillPhases";

/** Analyser bands sampled; mirrored to twice this many bars. */
const BANDS = 11;

/**
 * Length of an audio file in seconds, read from its metadata.
 *
 * The backend meters audio-minute usage from this value, so an import must
 * report its real duration rather than defaulting to zero. Resolves to 0 only
 * when the browser cannot decode the file at all.
 */
function readAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    const done = (value: number) => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(value) ? value : 0);
    };
    audio.onloadedmetadata = () => done(audio.duration);
    audio.onerror = () => done(0);
  });
}

/**
 * Per-phase accent. Every value is either a theme token or a light/dark pair,
 * so the pill stays legible under system, light, and dark themes alike.
 */
const PHASE_ACCENT: Record<string, string> = {
  idle: "text-muted-foreground",
  listening: "text-rose-600 dark:text-rose-400",
  paused: "text-amber-600 dark:text-amber-400",
  thinking: "text-primary",
  ready: "text-emerald-600 dark:text-emerald-400",
  searching: "text-foreground",
};

export function TranscriptionPill() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openNoteId = searchParams.get("noteId");

  const [mounted, setMounted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [chunks, setChunks] = useState<string[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [notes, setNotes] = useState<StructuredNotes | null>(null);
  const [isInserting, setIsInserting] = useState(false);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [rawQuery, setRawQuery] = useState("");
  const query = useDebounce(rawQuery, 250);

  const sessionIdRef = useRef<string>("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const { levels, start: startMeter, stop: stopMeter } = useMicLevels(BANDS);
  const { transcript, resetTranscript } = useSpeechRecognition();
  const {
    setPendingNotes,
    activeContext,
    referenceUrls,
    sessionToLoad,
    clearLoadedSession,
  } = useDashboard();
  const { createNoteFlow } = useCreateNoteFlow();

  /** Set when replaying a session from the sidebar, so notes link back to it. */
  const [sourceRecordingId, setSourceRecordingId] =
    useState<Id<"recordings"> | null>(null);

  const userData = useQuery(api.users.getUser);
  const upsertDraft = useMutation(api.recordings.upsertRecordingDraft);
  const generateStructuredNotes = useAction(api.ai.generateStructuredNotes);
  const generateFromPinnedAudio = useAction(api.notes.generateFromPinnedAudio);
  const generateUploadUrl = useMutation(api.recordings.generateUploadUrl);
  const saveUploadedRecording = useMutation(
    api.recordings.saveUploadedRecording,
  );
  const transcribeAudio = useAction(api.ai.transcribeAudio);

  const matches = useQuery(
    api.search.searchNoteContent,
    isSearchOpen && query.trim().length >= 2 ? { query, limit: 6 } : "skip",
  );

  useEffect(() => {
    setMounted(true);
    sessionIdRef.current = crypto.randomUUID();
  }, []);

  // Elapsed clock runs only while the mic is actually open.
  useEffect(() => {
    if (!isRecording) return;
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  useEffect(() => stopMeter, [stopMeter]);

  // A session picked in the sidebar replaces whatever the pill was holding and
  // drops it straight into the "paused" face, ready to generate.
  useEffect(() => {
    if (!sessionToLoad) return;
    SpeechRecognition.stopListening();
    stopMeter();
    setIsRecording(false);
    resetTranscript();
    setChunks([sessionToLoad.transcript]);
    setSourceRecordingId(sessionToLoad.recordingId);
    setNotes(null);
    setElapsed(0);
    clearLoadedSession();
  }, [sessionToLoad, stopMeter, resetTranscript, clearLoadedSession]);

  const fullTranscript = useMemo(
    () => [...chunks, transcript.trim()].filter(Boolean).join(" ").trim(),
    [chunks, transcript],
  );

  const wordCount = useMemo(
    () => (fullTranscript ? fullTranscript.split(/\s+/).length : 0),
    [fullTranscript],
  );

  const phase = resolvePhase({
    isRecording,
    isThinking,
    isSearchOpen,
    hasTranscript: fullTranscript.length > 0,
    hasNotes: notes !== null,
  });

  const displayLevels = useMemo(
    () => (isRecording ? mirrorLevels(levels) : idleWaveform(BANDS * 2)),
    [isRecording, levels],
  );

  const stopListening = useCallback(() => {
    SpeechRecognition.stopListening();
    stopMeter();
    setIsRecording(false);
  }, [stopMeter]);

  const handleToggleRecording = useCallback(async () => {
    if (isRecording) {
      // Fold the in-flight utterance into the session before closing the mic,
      // otherwise resetTranscript() would discard it.
      const pending = transcript.trim();
      if (pending) setChunks((prev) => [...prev, pending]);
      resetTranscript();
      stopListening();
      return;
    }

    try {
      await SpeechRecognition.startListening({
        continuous: true,
        language: "en-US",
      });
      void startMeter();
      setIsRecording(true);
    } catch (e) {
      console.error("[TranscriptionPill] failed to start listening:", e);
      toast.error("Couldn't start recording", {
        description: "Check that this site is allowed to use your microphone.",
      });
    }
  }, [isRecording, transcript, resetTranscript, stopListening, startMeter]);

  const handleReset = useCallback(() => {
    stopListening();
    resetTranscript();
    setChunks([]);
    setElapsed(0);
    setNotes(null);
    setSourceRecordingId(null);
    sessionIdRef.current = crypto.randomUUID();
  }, [resetTranscript, stopListening]);

  const handleGenerate = useCallback(async () => {
    if (isRecording) stopListening();
    if (!fullTranscript) return;

    setIsThinking(true);
    const title = `Session ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;

    // Replaying a saved session must not fork a duplicate draft of it.
    if (!sourceRecordingId) {
      // Save first: a failed generation should never cost the user the audio.
      try {
        await upsertDraft({
          sessionId: sessionIdRef.current,
          title,
          duration: elapsed,
          transcript: JSON.stringify([
            {
              text: fullTranscript,
              enhancedText: fullTranscript,
              timestamp: formatElapsed(elapsed),
              isImportant: false,
              concepts: [],
            },
          ]),
        });
      } catch (e) {
        console.warn("[TranscriptionPill] session autosave failed:", e);
      }
    }

    const urls = referenceUrls.length > 0 ? referenceUrls : undefined;

    try {
      // A pinned document routes through the context-aware action so the notes
      // are grounded in that source rather than the transcript alone.
      const generated =
        activeContext?.type === "file"
          ? await generateFromPinnedAudio({
              transcript: fullTranscript,
              pinnedFileId: activeContext.id,
              referenceUrls: urls,
            })
          : await generateStructuredNotes({
              transcript: fullTranscript,
              title,
              referenceUrls: urls,
            });
      setNotes(generated);
    } catch (e) {
      console.error("[TranscriptionPill] note generation failed:", e);
      toast.error("Couldn't generate notes", {
        description: "Your transcript is saved — try again in a moment.",
      });
    } finally {
      setIsThinking(false);
    }
  }, [
    isRecording,
    stopListening,
    fullTranscript,
    elapsed,
    upsertDraft,
    generateStructuredNotes,
    generateFromPinnedAudio,
    activeContext,
    referenceUrls,
    sourceRecordingId,
  ]);

  const handleInsert = useCallback(async () => {
    if (!notes) return;
    setIsInserting(true);
    try {
      if (openNoteId) {
        setPendingNotes(notes, openNoteId as Id<"notes">);
        toast.success("Notes added to this page");
      } else {
        const result = await createNoteFlow({
          title: "Session notes",
          major: userData?.major || "general",
          // Links the note back to its recording so the session can later be
          // re-generated against the note it already produced.
          ...(sourceRecordingId
            ? { sourceRecordingId: sourceRecordingId }
            : {}),
        });
        if (!result?.noteId) return;
        setPendingNotes(notes, result.noteId);
        router.push(`/dashboard?noteId=${result.noteId}`);
        toast.success("Created a note from your session");
      }
      handleReset();
    } catch (e) {
      console.error("[TranscriptionPill] insert failed:", e);
      toast.error("Couldn't insert notes");
    } finally {
      setIsInserting(false);
    }
  }, [
    notes,
    openNoteId,
    setPendingNotes,
    createNoteFlow,
    userData?.major,
    router,
    handleReset,
    sourceRecordingId,
  ]);

  const handleAudioImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;

      if (file.size > 50 * 1024 * 1024) {
        toast.error("That file is too large", { description: "50MB maximum." });
        return;
      }

      setIsThinking(true);
      try {
        const duration = await readAudioDuration(file);
        const uploadUrl = await generateUploadUrl();
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!res.ok) throw new Error("upload failed");
        const { storageId } = await res.json();

        await saveUploadedRecording({
          title: file.name.replace(/\.[^/.]+$/, "") || "Imported audio",
          storageId,
          duration,
          tzOffsetMinutes: new Date().getTimezoneOffset(),
          sessionId: sessionIdRef.current,
        });

        const result = await transcribeAudio({
          storageId: storageId as Id<"_storage">,
          mimeType: file.type || "audio/mpeg",
          courseContext: userData?.major || undefined,
        });

        if (result.success && result.transcript) {
          setChunks([result.transcript]);
          toast.success("Audio transcribed");
        } else {
          toast.error("Couldn't transcribe that file");
        }
      } catch (e) {
        console.error("[TranscriptionPill] audio import failed:", e);
        toast.error("Couldn't import that audio file");
      } finally {
        setIsThinking(false);
      }
    },
    [
      generateUploadUrl,
      saveUploadedRecording,
      transcribeAudio,
      userData?.major,
    ],
  );

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
    setRawQuery("");
  }, []);

  // Cmd/Ctrl+Shift+K focuses the pill's content search from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
        requestAnimationFrame(() => searchInputRef.current?.focus());
      }
      if (e.key === "Escape" && isSearchOpen) closeSearch();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isSearchOpen, closeSearch]);

  if (!mounted) return null;

  const accent = PHASE_ACCENT[phase] ?? PHASE_ACCENT.idle;
  const keywords = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

  return (
    // Extra right padding below `sm` keeps the pill clear of the floating
    // action button in that corner; centring is relative to what's left.
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 max-sm:pr-24">
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleAudioImport}
        aria-hidden
      />

      <div className="pointer-events-auto flex w-full max-w-[min(560px,100%)] flex-col items-center gap-2">
        {/* Results surface — rises above the pill so the pill never moves. */}
        <AnimatePresence>
          {isSearchOpen && query.trim().length >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="w-full overflow-hidden rounded-2xl border border-border bg-background/95 shadow-xl ring-1 ring-foreground/5 backdrop-blur-xl"
            >
              {matches === undefined ? (
                <p className="px-4 py-5 text-center text-xs text-muted-foreground">
                  Searching your notes…
                </p>
              ) : matches.matches.length === 0 ? (
                <p className="px-4 py-5 text-center text-xs text-muted-foreground">
                  No note mentions “{query.trim()}”.
                </p>
              ) : (
                <ul className="max-h-72 overflow-y-auto py-1.5">
                  {matches.matches.map((m) => (
                    <li key={m.noteId}>
                      <button
                        type="button"
                        onClick={() => {
                          router.push(m.url);
                          closeSearch();
                        }}
                        className="group flex w-full flex-col gap-1 px-4 py-2.5 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                      >
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[13px] font-medium text-foreground">
                            {m.title || "Untitled"}
                          </span>
                          <ArrowRight
                            className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                            aria-hidden
                          />
                        </span>
                        <span className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                          {splitHighlightSegments(m.snippet, keywords).map(
                            (seg, i) =>
                              seg.match ? (
                                <mark
                                  key={i}
                                  className="rounded-[3px] bg-primary/15 px-0.5 text-foreground"
                                >
                                  {seg.text}
                                </mark>
                              ) : (
                                <span key={i}>{seg.text}</span>
                              ),
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* The pill */}
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className={cn(
            "relative flex items-center gap-2.5 rounded-full border border-border",
            "bg-background/85 px-2 py-2 shadow-lg ring-1 ring-foreground/5 backdrop-blur-xl",
            isSearchOpen && "w-full",
          )}
        >
          {/* Breathing halo — only while the mic is genuinely open. */}
          {phase === "listening" && (
            <span
              className="animate-pill-breathe pointer-events-none absolute inset-0 -z-10 rounded-full bg-rose-500/15 blur-md"
              aria-hidden
            />
          )}

          {isSearchOpen ? (
            <>
              <Search
                className="ml-2 h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <input
                ref={searchInputRef}
                autoFocus
                value={rawQuery}
                onChange={(e) => setRawQuery(e.target.value)}
                placeholder="Find a keyword across your notes…"
                aria-label="Search note content by keyword"
                className="h-8 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <PillIconButton label="Close search" onClick={closeSearch}>
                <X className="h-4 w-4" />
              </PillIconButton>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void handleToggleRecording()}
                disabled={isThinking}
                aria-label={
                  isRecording ? "Stop recording" : "Start recording this session"
                }
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  isRecording
                    ? "bg-rose-500 text-white hover:bg-rose-600"
                    : "bg-foreground text-background hover:opacity-90",
                )}
              >
                {isRecording ? (
                  <Square className="h-3.5 w-3.5 fill-current" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </button>

              <div className={cn("flex min-w-0 items-center gap-2.5", accent)}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={phase}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="flex min-w-0 items-center gap-2.5"
                  >
                    {phase === "listening" && (
                      <>
                        <PillWaveform levels={displayLevels} active />
                        <span className="font-mono text-xs tabular-nums">
                          {formatElapsed(elapsed)}
                        </span>
                      </>
                    )}

                    {phase === "thinking" && (
                      <ThinkingSequence className="w-[188px]" />
                    )}

                    {phase === "paused" && (
                      <span className="whitespace-nowrap text-xs">
                        <span className="font-mono tabular-nums">
                          {formatElapsed(elapsed)}
                        </span>
                        <span className="mx-1.5 opacity-40">·</span>
                        {wordCount} {wordCount === 1 ? "word" : "words"}
                      </span>
                    )}

                    {phase === "ready" && (
                      <span className="flex items-center gap-1.5 whitespace-nowrap text-xs font-medium">
                        <Check className="h-3.5 w-3.5" aria-hidden />
                        Notes ready
                      </span>
                    )}

                    {phase === "idle" && (
                      <>
                        <PillWaveform
                          levels={displayLevels}
                          active={false}
                          className="hidden sm:flex"
                        />
                        <span className="whitespace-nowrap text-xs">
                          Transcribe session
                        </span>
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="ml-auto flex shrink-0 items-center gap-1 pl-1">
                {phase === "paused" && (
                  <Button
                    size="sm"
                    onClick={() => void handleGenerate()}
                    className="h-8 rounded-full px-3 text-xs"
                  >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                    Generate
                  </Button>
                )}

                {phase === "ready" && (
                  <Button
                    size="sm"
                    onClick={() => void handleInsert()}
                    disabled={isInserting}
                    className="h-8 rounded-full px-3 text-xs"
                  >
                    {isInserting ? "Inserting…" : "Insert"}
                  </Button>
                )}

                {(phase === "paused" || phase === "ready") && (
                  <PillIconButton label="Discard session" onClick={handleReset}>
                    <RotateCcw className="h-3.5 w-3.5" />
                  </PillIconButton>
                )}

                {phase === "idle" && (
                  <PillIconButton
                    label="Import an audio file"
                    onClick={() => audioInputRef.current?.click()}
                  >
                    <FileAudio className="h-4 w-4" />
                  </PillIconButton>
                )}

                {phase !== "thinking" && (
                  <PillIconButton
                    label="Search note content by keyword"
                    onClick={() => setIsSearchOpen(true)}
                  >
                    <Search className="h-4 w-4" />
                  </PillIconButton>
                )}
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Phase changes announced once, not on every waveform tick. */}
      <span className="sr-only" role="status">
        {phaseLabel(phase)}
      </span>
    </div>
  );
}

function PillIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground",
        "transition-colors hover:bg-accent hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      {children}
    </button>
  );
}
