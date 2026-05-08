"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useId,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mic,
  Play,
  RotateCcw,
  Save,
  Sparkles,
  Loader2,
  ChevronDown,
  Trash2,
  FileAudio,
  FileText,
  Radio,
  PenLine,
  BookOpen,
  History,
  Code2,
  Zap,
  PanelRightClose,
  PanelRightOpen,
  Link2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useDashboard } from "@/hooks/useDashboard";
import { StructuredNotes } from "@/components/dashboard/DashboardContext";
import { ContextDeck } from "@/components/dashboard/ContextDeck";
import { useDropzone } from "react-dropzone";
import { useCreateNoteFlow } from "@/hooks/useCreateNoteFlow";
import { useNotesStream } from "@/hooks/useNotesStream";
import { StreamingNotesDisplay } from "@/components/dashboard/streaming/StreamingNotesDisplay";
import { CodeBlockPanel } from "@/components/dashboard/streaming/CodeBlockPanel";
import { CodeExtractorDialog } from "@/components/dashboard/dialogs/CodeExtractorDialog";
import type { CodeBlock, CodeLanguage } from "@/types/streaming";

// Enhanced transcript chunk with AI analysis
interface EnhancedChunk {
  text: string;
  enhancedText: string;
  timestamp: string;
  isImportant: boolean;
  concepts: string[];
}

type RecordingDraft = {
  version: 1;
  savedAt: number;
  liveSessionId: string;
  elapsedTime: number;
  recordingTitle: string;
  sessionTranscript: EnhancedChunk[];
  liveTranscript: string;
};

const RECORDING_DRAFT_STORAGE_KEY = "lumina:right-sidebar:recording-draft:v1";

const WAVEFORM_BARS = 16;

// Sidebar modes for dynamic UI adaptation
type SidebarMode =
  | "idle" // Default - show quick import, record button, history
  | "recording" // Live recording - show waveform, transcript preview
  | "uploading" // Uploading file - show progress
  | "transcribing" // AI processing - show transcription progress
  | "ready"; // Content ready - show generate notes button

// Helper to get audio duration
const getAudioDuration = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const audio = new Audio(URL.createObjectURL(file));
    audio.onloadedmetadata = () => {
      resolve(audio.duration);
    };
    audio.onerror = () => {
      resolve(0);
    };
  });
};

export function RightSidebar() {
  // Handle hydration mismatch
  const [isMounted, setIsMounted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [sessionTranscript, setSessionTranscript] = useState<EnhancedChunk[]>(
    [],
  );
  const [, setPermissionState] = useState<
    "prompt" | "granted" | "denied" | "unknown"
  >("unknown");
  const [, setIsAnalyzing] = useState(false);

  // Save Modal State
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSavingSession, setIsSavingSession] = useState(false);
  /** True while creating a note and navigating after Insert Notes (from recording flow). */
  const [isOpeningNoteFromRecording, setIsOpeningNoteFromRecording] =
    useState(false);
  const [recordingTitle, setRecordingTitle] = useState("");

  // AI Generate Notes State
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [generatedNotes, setGeneratedNotes] = useState<StructuredNotes | null>(
    null,
  );

  // Streaming Notes State
  const [useStreamingMode, setUseStreamingMode] = useState(true);
  const streamingNotes = useNotesStream();

  // Code Block Extraction State
  const [codeBlocks, setCodeBlocks] = useState<CodeBlock[]>([]);
  const [selectedText, setSelectedText] = useState("");
  const [isCodeExtractorOpen, setIsCodeExtractorOpen] = useState(false);

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isUploadingTextbook, setIsUploadingTextbook] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [selectedSession, setSelectedSession] =
    useState<Id<"recordings"> | null>(null);
  const [improveFromPriorNotes, setImproveFromPriorNotes] = useState(true);
  const improvePriorNotesId = useId();
  const [usedContextName, setUsedContextName] = useState<string | null>(null);
  /** Public http(s) URLs — fetched server-side and passed into note generation */
  const [referenceUrlInput, setReferenceUrlInput] = useState("");
  const [referenceUrls, setReferenceUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textbookInputRef = useRef<HTMLInputElement>(null);
  const showTranscriptPreview = false;
  const restoredDraftRef = useRef(false);
  const liveSessionIdRef = useRef<string>(crypto.randomUUID());

  /** Real-time mic levels for the recording waveform (Web Speech API has no audio API). */
  const micStreamRef = useRef<MediaStream | null>(null);
  const micAudioContextRef = useRef<AudioContext | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const micRafRef = useRef<number | null>(null);
  const [waveformLevels, setWaveformLevels] = useState<number[]>(() =>
    Array(WAVEFORM_BARS).fill(0),
  );

  const stopMicMonitor = useCallback(() => {
    if (micRafRef.current != null) {
      cancelAnimationFrame(micRafRef.current);
      micRafRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (micAudioContextRef.current) {
      void micAudioContextRef.current.close();
      micAudioContextRef.current = null;
    }
    micAnalyserRef.current = null;
    setWaveformLevels(Array(WAVEFORM_BARS).fill(0));
  }, []);

  const startMicMonitor = useCallback(async () => {
    stopMicMonitor();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const ctx = new AudioContext();
      micAudioContextRef.current = ctx;
      await ctx.resume();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.72;
      analyser.minDecibels = -85;
      analyser.maxDecibels = -22;
      source.connect(analyser);
      micAnalyserRef.current = analyser;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let frameCount = 0;

      const tick = () => {
        const a = micAnalyserRef.current;
        if (!a) return;
        a.getByteFrequencyData(dataArray);
        const step = Math.max(1, Math.floor(bufferLength / WAVEFORM_BARS));
        const next: number[] = [];
        for (let i = 0; i < WAVEFORM_BARS; i++) {
          let sum = 0;
          const start = i * step;
          const end = Math.min(start + step, bufferLength);
          for (let j = start; j < end; j++) sum += dataArray[j] ?? 0;
          const denom = Math.max(1, end - start) * 255;
          const avg = sum / denom;
          next.push(Math.min(1, Math.pow(avg * 2.8, 0.62)));
        }
        frameCount += 1;
        if (frameCount % 2 === 0) {
          setWaveformLevels(next);
        }
        micRafRef.current = requestAnimationFrame(tick);
      };
      micRafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      console.warn("[RightSidebar] Mic level monitor failed:", e);
    }
  }, [stopMicMonitor]);

  // Router and Search Params
  const router = useRouter();
  const searchParams = useSearchParams();

  // API Hooks
  const upsertRecordingDraft = useMutation(api.recordings.upsertRecordingDraft);
  const generateStructuredNotes = useAction(api.ai.generateStructuredNotes);
  const analyzeChunk = useAction(api.ai.analyzeChunk);
  const generateRecordingUploadUrl = useMutation(
    api.recordings.generateUploadUrl,
  );
  const saveUploadedRecording = useMutation(
    api.recordings.saveUploadedRecording,
  );
  const generateFileUploadUrl = useMutation(api.files.generateUploadUrl);
  const uploadFile = useMutation(api.files.uploadFile);
  const updateRecordingTranscript = useMutation(
    api.recordings.updateRecordingTranscript,
  );
  const transcribeAudio = useAction(api.ai.transcribeAudio);
  const deleteRecording = useMutation(api.recordings.deleteRecording);
  const cleanupOrphanedRecordings = useMutation(
    api.recordings.cleanupOrphanedRecordings,
  );
  const deleteFile = useMutation(api.files.deleteFile);
  const pastRecordings = useQuery(api.recordings.getRecordings);
  const files = useQuery(api.files.getFiles);
  const userData = useQuery(api.users.getUser);
  const { createNoteFlow } = useCreateNoteFlow();
  const updateNote = useMutation(api.notes.updateNote);

  // Get dashboard context for pending notes and active context
  const {
    setPendingNotes,
    activeContext,
    setActiveContext,
    rightSidebarState,
    toggleRightSidebar,
    setRightSidebarState,
  } = useDashboard();

  const isRightCompact = rightSidebarState === "compact";
  const isRightOpen = rightSidebarState === "open";
  const isRightClosed = rightSidebarState === "closed";
  const generateFromPinnedAudio = useAction(api.notes.generateFromPinnedAudio);

  const { transcript, resetTranscript } = useSpeechRecognition();

  const hasDraftTranscript =
    sessionTranscript.length > 0 || transcript.trim().length > 0;

  // Computed sidebar mode based on current state
  // Priority: recording > transcribing > uploading > ready > idle
  const sidebarMode: SidebarMode = useMemo(() => {
    if (isRecording) return "recording";
    if (isTranscribing) return "transcribing"; // AI processing takes priority
    if (isUploading) return "uploading";
    if (hasDraftTranscript || generatedNotes) return "ready";
    return "idle";
  }, [
    isRecording,
    isUploading,
    isTranscribing,
    hasDraftTranscript,
    generatedNotes,
  ]);

  // Full-width Studio when recording / upload / AI — compact strip is too small
  useEffect(() => {
    if (sidebarMode !== "idle" && rightSidebarState === "compact") {
      setRightSidebarState("open");
    }
  }, [sidebarMode, rightSidebarState, setRightSidebarState]);

  // Validate active context file still exists
  const contextFile = useQuery(
    api.files.getFile,
    activeContext && activeContext.type === "file"
      ? { fileId: activeContext.id as Id<"files"> }
      : "skip",
  ); // New Phase 2 Action

  const priorNoteForSession = useQuery(
    api.notes.getPriorNoteContentForRecording,
    selectedSession ? { recordingId: selectedSession } : "skip",
  );

  useEffect(() => {
    setImproveFromPriorNotes(true);
  }, [selectedSession]);

  const previousNotesForGeneration = useMemo(() => {
    if (
      !selectedSession ||
      !priorNoteForSession?.content ||
      !improveFromPriorNotes
    ) {
      return undefined;
    }
    return priorNoteForSession.content;
  }, [
    selectedSession,
    priorNoteForSession?.content,
    improveFromPriorNotes,
  ]);

  // Phase 4: Magnetic Drop Zone Logic
  // Note: useDropzone is primarily for file drops. For sidebar drag integration, we use native handlers.
  useDropzone({
    noClick: true,
    noKeyboard: true,
    onDragEnter: () => {},
    onDragOver: (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    },
  });

  // Custom native drop handler for the Sidebar integration
  const handleNativeDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const resourceId = e.dataTransfer.getData("application/lumina-resource-id");
    const resourceName = e.dataTransfer.getData(
      "application/lumina-resource-name",
    );

    if (resourceId && resourceName) {
      setActiveContext({ id: resourceId, name: resourceName, type: "file" });
    }
  };

  const handleNativeDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  // Format seconds to HH:MM:SS (moved up for hoisting)
  const formatTime = useCallback((seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, []);

  const clearRecordingDraft = useCallback(() => {
    try {
      localStorage.removeItem(RECORDING_DRAFT_STORAGE_KEY);
    } catch (error) {
      console.warn("[recording-draft] failed to clear local draft:", error);
    }
  }, []);

  const buildFinalChunks = useMemo(() => {
    const chunks = [...sessionTranscript];
    const liveText = transcript.trim();
    if (liveText) {
      chunks.push({
        text: liveText,
        enhancedText: liveText,
        timestamp: formatTime(elapsedTime),
        isImportant: false,
        concepts: [],
      });
    }
    return chunks;
  }, [sessionTranscript, transcript, elapsedTime, formatTime]);

  const addReferenceUrlsFromInput = useCallback(() => {
    const raw = referenceUrlInput.trim();
    if (!raw) return;
    const tokens = raw.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
    setReferenceUrls((prev) => {
      const next = [...prev];
      for (const tok of tokens) {
        if (next.length >= 5) {
          toast.message("Up to 5 reference links", {
            description: "Remove one to add another.",
          });
          break;
        }
        try {
          const href = /^https?:\/\//i.test(tok) ? tok : `https://${tok}`;
          const u = new URL(href);
          if (u.protocol !== "http:" && u.protocol !== "https:") continue;
          if (!next.includes(u.href)) next.push(u.href);
        } catch {
          toast.error("Invalid URL", { description: tok });
        }
      }
      return next;
    });
    setReferenceUrlInput("");
  }, [referenceUrlInput]);

  // Reset handler (moved up for hoisting)
  const handleReset = (showToast = false) => {
    SpeechRecognition.stopListening();
    stopMicMonitor();
    setIsRecording(false);
    setElapsedTime(0);
    resetTranscript();
    setSessionTranscript([]);
    setGeneratedNotes(null);
    setSelectedSession(null);
    setActiveContext(null);
    setUsedContextName(null);
    setReferenceUrlInput("");
    setReferenceUrls([]);
    liveSessionIdRef.current = crypto.randomUUID();
    clearRecordingDraft();
    if (showToast) {
      toast.success("Session reset", { duration: 2000 });
    }
  };

  // Restore local draft after reload/deploy interruption.
  useEffect(() => {
    if (!isMounted || restoredDraftRef.current) return;
    restoredDraftRef.current = true;

    try {
      const rawDraft = localStorage.getItem(RECORDING_DRAFT_STORAGE_KEY);
      if (!rawDraft) return;

      const parsed = JSON.parse(rawDraft) as Partial<RecordingDraft>;
      const recoveredChunks = Array.isArray(parsed.sessionTranscript)
        ? [...parsed.sessionTranscript]
        : [];

      const liveTranscript = String(parsed.liveTranscript || "").trim();
      const draftElapsed = Number(parsed.elapsedTime || 0);
      if (parsed.liveSessionId && parsed.liveSessionId.trim().length > 0) {
        liveSessionIdRef.current = parsed.liveSessionId;
      }

      if (liveTranscript) {
        recoveredChunks.push({
          text: liveTranscript,
          enhancedText: liveTranscript,
          timestamp: formatTime(draftElapsed),
          isImportant: false,
          concepts: [],
        });
      }

      if (recoveredChunks.length === 0) return;

      setSessionTranscript(recoveredChunks);
      setElapsedTime(draftElapsed);
      if (parsed.recordingTitle) {
        setRecordingTitle(parsed.recordingTitle);
      }

      toast.info("Recovered unsaved recording draft", {
        description: "Your interrupted recording has been restored locally.",
        duration: 4000,
      });
    } catch (error) {
      console.warn("[recording-draft] failed to restore local draft:", error);
      clearRecordingDraft();
    }
  }, [isMounted, formatTime, clearRecordingDraft]);

  // Persist in-progress recording locally to survive refresh/redeploy.
  useEffect(() => {
    if (!isMounted) return;
    if (selectedSession || generatedNotes) return;

    const hasDraftData =
      sessionTranscript.length > 0 || transcript.trim().length > 0;

    if (!hasDraftData) {
      clearRecordingDraft();
      return;
    }

    const draft: RecordingDraft = {
      version: 1,
      savedAt: Date.now(),
      liveSessionId: liveSessionIdRef.current,
      elapsedTime,
      recordingTitle,
      sessionTranscript,
      liveTranscript: transcript.trim(),
    };

    try {
      localStorage.setItem(RECORDING_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch (error) {
      console.warn("[recording-draft] failed to save local draft:", error);
    }
  }, [
    isMounted,
    selectedSession,
    generatedNotes,
    sessionTranscript,
    transcript,
    elapsedTime,
    recordingTitle,
    clearRecordingDraft,
  ]);

  // Autosave in-progress sessions to backend so power loss doesn't drop content.
  useEffect(() => {
    if (!isMounted) return;
    if (selectedSession || generatedNotes) return;
    if (!buildFinalChunks.length) return;

    const timeoutId = setTimeout(async () => {
      try {
        await upsertRecordingDraft({
          sessionId: liveSessionIdRef.current,
          title:
            recordingTitle ||
            `Session ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
          transcript: JSON.stringify(buildFinalChunks),
        });
      } catch (error) {
        console.warn("[recording-draft] backend autosave failed:", error);
      }
    }, 2500);

    return () => clearTimeout(timeoutId);
  }, [
    isMounted,
    selectedSession,
    generatedNotes,
    buildFinalChunks,
    recordingTitle,
    upsertRecordingDraft,
  ]);

  const handleSaveClick = () => {
    // 1. Validate content
    const currentText = transcript.trim();
    const hasExistingChunks = sessionTranscript.length > 0;

    if (!currentText && !hasExistingChunks) {
      toast.warning("Cannot save empty recording", {
        description: "Please speak to record something first.",
      });
      return;
    }

    // 2. Pause recording if active
    if (isRecording) {
      SpeechRecognition.stopListening();
      stopMicMonitor();
      setIsRecording(false);
    }

    // 3. Prepare data for preview (add current transcript to chunks temporarily for view if needed,
    // but better to just keep it separate until confirmation)

    // 4. Open modal
    setRecordingTitle(
      `Session ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
    );
    setIsSaveModalOpen(true);
  };

  const handleConfirmSave = async () => {
    if (buildFinalChunks.length === 0) {
      toast.warning("Cannot save empty recording");
      return;
    }

    setIsSavingSession(true);
    try {
      await upsertRecordingDraft({
        sessionId: liveSessionIdRef.current,
        title: recordingTitle || `Untitled Session`,
        transcript: JSON.stringify(buildFinalChunks),
      });

      toast.success("Session saved successfully!");
      handleReset();
      setIsSaveModalOpen(false);
    } catch (e) {
      console.error("Failed to save transcript", e);
      toast.error("Failed to save session", {
        description: "Please check your connection and try again.",
      });
    } finally {
      setIsSavingSession(false);
    }
  };

  const handleGenerateNotes = async () => {
    // Stop recording if still active
    if (isRecording) {
      SpeechRecognition.stopListening();
      stopMicMonitor();
      setIsRecording(false);
    }

    if (buildFinalChunks.length === 0) {
      toast.warning("No transcript available", {
        description: "Please record something first to generate notes.",
      });
      return;
    }

    setIsGeneratingNotes(true);

    // Auto-save the session first (only for new recordings, not loaded past sessions)
    if (!selectedSession) {
      try {
        const autoTitle =
          recordingTitle ||
          `Session ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;

        const savedId = await upsertRecordingDraft({
          sessionId: liveSessionIdRef.current,
          title: autoTitle,
          transcript: JSON.stringify(buildFinalChunks),
        });

        setSelectedSession(savedId);
        setRecordingTitle(autoTitle);
        toast.success("Session auto-saved", {
          description: "Your recording is saved. Generating notes now...",
          duration: 3000,
        });
      } catch (saveError) {
        console.error("Auto-save failed:", saveError);
        // Don't block note generation if save fails — just warn
        toast.warning("Could not auto-save session", {
          description:
            "Your recording wasn't saved, but note generation will continue.",
        });
      }
    }

    // Track if we're using context for this generation
    const usingContext = activeContext && activeContext.type === "file";

    try {
      if (usingContext) {
        // Validate context file exists before generating
        if (contextFile === null) {
          toast.error("Context file not found", {
            description:
              "The pinned document no longer exists. Please select another.",
          });
          setActiveContext(null);
          setIsGeneratingNotes(false);
          return;
        }

        // Generate notes with pinned document context
        const notes = await generateFromPinnedAudio({
          transcript: JSON.stringify(buildFinalChunks),
          pinnedFileId: activeContext.id,
          previousNotesContent: previousNotesForGeneration,
          referenceUrls:
            referenceUrls.length > 0 ? referenceUrls : undefined,
        });
        setGeneratedNotes(notes);
        setUsedContextName(activeContext.name);
      } else {
        // Standard generation without context
        const notes = await generateStructuredNotes({
          transcript: JSON.stringify(buildFinalChunks),
          title: recordingTitle || "Recording",
          previousNotesContent: previousNotesForGeneration,
          referenceUrls:
            referenceUrls.length > 0 ? referenceUrls : undefined,
        });
        setGeneratedNotes(notes);
        setUsedContextName(null);
      }
    } catch (e: unknown) {
      console.error("Failed to generate notes", e);

      const errorMessage = e instanceof Error ? e.message : "";
      if (
        usingContext &&
        (errorMessage.includes("not found") || errorMessage.includes("File"))
      ) {
        toast.error("Context file error", {
          description: "There was an issue accessing the pinned document.",
        });
      } else {
        toast.error("Failed to generate notes", {
          description:
            "Your session is saved. You can retry generating notes from your history.",
        });
      }
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  // Streaming notes: generate with animated typing effect
  const handleGenerateStreamingNotes = async () => {
    if (isRecording) {
      SpeechRecognition.stopListening();
      stopMicMonitor();
      setIsRecording(false);
    }

    if (buildFinalChunks.length === 0) {
      toast.warning("No transcript available", {
        description: "Please record something first to generate notes.",
      });
      return;
    }

    // Auto-save session first (same as structured)
    if (!selectedSession) {
      try {
        const autoTitle =
          recordingTitle ||
          `Session ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
        const savedId = await upsertRecordingDraft({
          sessionId: liveSessionIdRef.current,
          title: autoTitle,
          transcript: JSON.stringify(buildFinalChunks),
        });
        setSelectedSession(savedId);
        setRecordingTitle(autoTitle);
      } catch {
        toast.warning("Could not auto-save session");
      }
    }

    streamingNotes.startGeneration({
      transcript: JSON.stringify(buildFinalChunks),
      title: recordingTitle || undefined,
      codeBlocks: codeBlocks.length > 0 ? codeBlocks : undefined,
      previousNotesContent: previousNotesForGeneration,
      referenceUrls:
        referenceUrls.length > 0 ? referenceUrls : undefined,
    });
  };

  // Handle streaming notes insertion into the editor
  const handleInsertStreamingNotes = async (markdownContent: string) => {
    const currentNoteId = searchParams.get("noteId");
    // Wrap markdown in a StructuredNotes shape for compatibility
    const wrappedNotes: StructuredNotes = {
      summary: markdownContent,
      sections: [],
      actionItems: [],
      reviewQuestions: [],
    };

    if (!currentNoteId) {
      setIsOpeningNoteFromRecording(true);
      try {
        const title = recordingTitle
          ? `Notes from ${recordingTitle}`
          : "Generated Notes";
        const result = await createNoteFlow({
          title,
          major: userData?.major || "general",
          ...(selectedSession ? { sourceRecordingId: selectedSession } : {}),
        });
        if (!result?.noteId) return;
        setPendingNotes(wrappedNotes, result.noteId);
        streamingNotes.reset();
        router.push(`/dashboard?noteId=${result.noteId}`);
        toast.success("Created new note with generated content");
      } catch (error) {
        console.error("Failed to create note:", error);
        toast.error("Failed to create note. Please try again.");
      } finally {
        setIsOpeningNoteFromRecording(false);
      }
    } else {
      if (selectedSession) {
        updateNote({
          noteId: currentNoteId as Id<"notes">,
          sourceRecordingId: selectedSession,
        }).catch(() => {});
      }
      setPendingNotes(wrappedNotes, currentNoteId as Id<"notes">);
      streamingNotes.reset();
      toast.success("Content ready to insert");
    }
  };

  const handleInsertNotes = async () => {
    const currentNoteId = searchParams.get("noteId");

    if (!currentNoteId && generatedNotes) {
      // No note is open - create a new one
      setIsOpeningNoteFromRecording(true);
      try {
        const title =
          recordingTitle || usedContextName
            ? `Notes from ${usedContextName || recordingTitle || "Recording"}`
            : "Generated Notes";

        const result = await createNoteFlow({
          title,
          major: userData?.major || "general",
          ...(selectedSession ? { sourceRecordingId: selectedSession } : {}),
        });
        if (!result?.noteId) return;

        // Set pending notes and navigate to the new note
        setPendingNotes(generatedNotes, result.noteId);
        setGeneratedNotes(null);
        router.push(`/dashboard?noteId=${result.noteId}`);
        toast.success("Created new note with generated content");
      } catch (error) {
        console.error("Failed to create note:", error);
        toast.error("Failed to create note. Please try again.");
      } finally {
        setIsOpeningNoteFromRecording(false);
      }
    } else if (generatedNotes) {
      // Note is already open - just set pending notes
      if (selectedSession && currentNoteId) {
        updateNote({
          noteId: currentNoteId as Id<"notes">,
          sourceRecordingId: selectedSession,
        }).catch(() => {});
      }
      setPendingNotes(generatedNotes, currentNoteId as Id<"notes">);
      setGeneratedNotes(null);
      toast.success("Content ready to insert");
    }
  };

  // Code block extraction handlers
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString()?.trim();
    if (text && text.length > 5) {
      setSelectedText(text);
    }
  }, []);

  const handleExtractCode = useCallback(
    (language: CodeLanguage, label?: string) => {
      const newBlock: CodeBlock = {
        id: crypto.randomUUID(),
        language,
        content: selectedText,
        startIndex: 0,
        endIndex: selectedText.length,
        label,
      };
      setCodeBlocks((prev) => [...prev, newBlock]);
      setSelectedText("");
      toast.success(`Code block extracted (${language})`);
    },
    [selectedText],
  );

  const handleRemoveCodeBlock = useCallback((id: string) => {
    setCodeBlocks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const handleClearCodeBlocks = useCallback(() => {
    setCodeBlocks([]);
  }, []);

  const handleCodeBlockLanguageChange = useCallback(
    (id: string, language: CodeLanguage) => {
      setCodeBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, language } : b)),
      );
    },
    [],
  );

  // Timer Ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check microphone permission
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.permissions) {
      navigator.permissions
        .query({ name: "microphone" as PermissionName })
        .then((result) => {
          setPermissionState(result.state as "prompt" | "granted" | "denied");
          result.onchange = () => {
            setPermissionState(result.state as "prompt" | "granted" | "denied");
          };
        })
        .catch(() => {
          // Permission API not supported, we'll find out when we try to record
          setPermissionState("prompt");
        });
    } else {
      setPermissionState("prompt");
    }
  }, [isMounted]);

  // Timer effect - separate from speech recognition
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  useEffect(() => {
    return () => {
      stopMicMonitor();
    };
  }, [stopMicMonitor]);

  // Clear context if file no longer exists
  useEffect(() => {
    if (
      activeContext &&
      activeContext.type === "file" &&
      contextFile === null
    ) {
      toast.warning("Context file no longer exists", {
        description: `"${activeContext.name}" was removed. Context cleared.`,
      });
      setActiveContext(null);
    }
  }, [contextFile, activeContext, setActiveContext]);

  const handleToggleRecording = async () => {
    if (!isRecording) {
      // Starting recording
      setIsRecording(true);
      try {
        await SpeechRecognition.startListening({
          continuous: true,
          language: "en-US",
        });
        void startMicMonitor();
      } catch (error) {
        console.error("Failed to start speech recognition:", error);
        stopMicMonitor();
        setIsRecording(false);
        alert(
          "Failed to start speech recognition. Please check microphone permissions.",
        );
      }
    } else {
      // Pausing - save and analyze current transcript chunk
      SpeechRecognition.stopListening();
      stopMicMonitor();
      const currentText = transcript.trim();
      if (currentText) {
        const timestamp = formatTime(elapsedTime);

        // Add raw chunk immediately for responsiveness
        setSessionTranscript((prev) => [
          ...prev,
          {
            text: currentText,
            enhancedText: currentText, // Placeholder until analysis completes
            timestamp,
            isImportant: false,
            concepts: [],
          },
        ]);
        resetTranscript();

        // Analyze in background and update
        setIsAnalyzing(true);
        try {
          const analysis = await analyzeChunk({ text: currentText });
          // Update the last chunk with enhanced data
          setSessionTranscript((prev) => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            if (lastIndex >= 0 && updated[lastIndex].text === currentText) {
              updated[lastIndex] = {
                ...updated[lastIndex],
                enhancedText: analysis.enhancedText,
                isImportant: analysis.isImportant,
                concepts: analysis.concepts,
              };
            }
            return updated;
          });
        } catch (error) {
          console.error("Failed to analyze chunk:", error);
          // Keep raw text on error
        } finally {
          setIsAnalyzing(false);
        }
      }
      setIsRecording(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (process.env.NODE_ENV === "development") console.log(
      `[upload] Start: name=${file.name}, sizeMB=${(file.size / 1024 / 1024).toFixed(2)}, type=${file.type || "unknown"}`,
    );

    // Validate file type
    const validTypes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/m4a",
      "audio/mp4",
      "audio/ogg",
      "audio/flac",
      "audio/webm",
    ];
    if (!validTypes.some((type) => file.type.includes(type.split("/")[1]))) {
      alert(
        "Please upload a valid audio file (MP3, WAV, M4A, OGG, FLAC, or WebM)",
      );
      return;
    }

    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert("File size must be less than 50MB");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploadStartMs = Date.now();
      // Step 1: Read file as base64 for transcription
      setUploadProgress(10);

      // Determine mime type
      let mimeType = file.type || "audio/mpeg";
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith(".mp3")) mimeType = "audio/mpeg";
      else if (fileName.endsWith(".wav")) mimeType = "audio/wav";
      else if (fileName.endsWith(".m4a")) mimeType = "audio/mp4";
      else if (fileName.endsWith(".ogg")) mimeType = "audio/ogg";
      else if (fileName.endsWith(".flac")) mimeType = "audio/flac";
      else if (fileName.endsWith(".webm")) mimeType = "audio/webm";

      // Get duration
      const duration = await getAudioDuration(file);

      // Step 2: Upload to Convex storage
      setUploadProgress(30);
      const uploadUrl = await generateRecordingUploadUrl();
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      const { storageId } = await uploadResponse.json();
      if (process.env.NODE_ENV === "development") console.log(
        `[upload] Storage upload complete in ${Date.now() - uploadStartMs}ms, storageId=${storageId}`,
      );
      setUploadProgress(50);

      // Step 3: Save recording record
      const title = file.name.replace(/\.[^/.]+$/, "") || "Uploaded Recording";
      const recordingId = await saveUploadedRecording({
        title,
        storageId,
        duration,
        tzOffsetMinutes: new Date().getTimezoneOffset(),
      });
      if (process.env.NODE_ENV === "development") console.log(
        `[upload] Recording saved: id=${recordingId}, durationSec=${duration}`,
      );
      setUploadProgress(60);

      // Step 4: Transcribe using AI (fetches audio from storage server-side)
      // Upload is complete, now we're transcribing
      setIsUploading(false);
      setIsTranscribing(true);
      setUploadProgress(70);

      try {
        const transcribeStartMs = Date.now();
        const transcriptionResult = await transcribeAudio({
          storageId: storageId as Id<"_storage">,
          mimeType,
          courseContext: userData?.major || undefined,
        });
        if (process.env.NODE_ENV === "development") console.log(
          `[upload] Transcription call returned in ${Date.now() - transcribeStartMs}ms, success=${transcriptionResult.success}`,
        );

        setUploadProgress(90);

        if (transcriptionResult.success && transcriptionResult.transcript) {
          // Update the recording with the transcript
          await updateRecordingTranscript({
            recordingId,
            transcript: transcriptionResult.transcript,
          });

          // Load the transcript into the session
          setSessionTranscript([
            {
              text: transcriptionResult.transcript,
              enhancedText: transcriptionResult.transcript,
              timestamp: "00:00:00",
              isImportant: false,
              concepts: transcriptionResult.keyTopics || [],
            },
          ]);

          setSelectedSession(recordingId);
          toast.success("Recording uploaded and transcribed successfully!");
        } else {
          console.warn(
            "[upload] Transcription failed response:",
            transcriptionResult.error || "Unknown error",
          );
          // Transcription failed - delete the orphaned recording
          await deleteRecording({ recordingId });

          const errorMsg =
            "error" in transcriptionResult
              ? transcriptionResult.error
              : "Unknown error";

          toast.error("Transcription failed", {
            description:
              errorMsg ||
              "The AI couldn't process this audio file. Please try a different file or format.",
          });
        }
      } catch (transcriptionError) {
        console.error("Transcription error:", transcriptionError);
        // Delete the orphaned recording since transcription failed
        try {
          await deleteRecording({ recordingId });
        } catch {
          // Ignore delete errors
        }

        // Check for specific error types
        const errorMessage =
          transcriptionError instanceof Error
            ? transcriptionError.message
            : String(transcriptionError);

        if (
          errorMessage.includes("Connection lost") ||
          errorMessage.includes("in flight") ||
          errorMessage.includes("timed out")
        ) {
          toast.error("Request timed out", {
            description:
              "The transcription took too long. Try a shorter audio file or try again.",
          });
        } else {
          toast.error("Transcription failed", {
            description:
              "The AI service is currently unavailable. Please try again later.",
          });
        }
      }

      setUploadProgress(100);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload recording", {
        description: "Please check your connection and try again.",
      });
    } finally {
      setIsUploading(false);
      setIsTranscribing(false);
      setUploadProgress(0);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle textbook (PDF/PPT) upload
  const handleTextbookUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    const allowed = ["pdf", "ppt", "pptx", "doc", "docx"];
    if (!ext || !allowed.includes(ext)) {
      toast.error("Please upload a PDF, PPT, or DOC file.");
      return;
    }

    setIsUploadingTextbook(true);
    try {
      const postUrl = await generateFileUploadUrl();
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!result.ok) throw new Error("Upload failed");
      const { storageId } = await result.json();

      await uploadFile({
        name: file.name,
        type: "pdf",
        storageId,
      });
      toast.success("Textbook uploaded successfully.");
    } catch (e) {
      console.error("Textbook upload error:", e);
      toast.error("Failed to upload file. Please try again.");
    } finally {
      setIsUploadingTextbook(false);
      if (textbookInputRef.current) textbookInputRef.current.value = "";
    }
  };

  // Load a past session's transcript
  const handleLoadPastSession = (
    recording: typeof pastRecordings extends (infer T)[] | undefined
      ? T
      : never,
  ) => {
    if (!recording) return;
    clearRecordingDraft();
    liveSessionIdRef.current = crypto.randomUUID();

    setSelectedSession(recording._id);

    // Parse the transcript if it's JSON, otherwise use it directly
    let chunks: EnhancedChunk[] = [];
    try {
      const parsed = JSON.parse(recording.transcript);
      if (Array.isArray(parsed)) {
        chunks = parsed;
      } else {
        chunks = [
          {
            text: recording.transcript,
            enhancedText: recording.transcript,
            timestamp: "00:00:00",
            isImportant: false,
            concepts: [],
          },
        ];
      }
    } catch {
      chunks = [
        {
          text: recording.transcript,
          enhancedText: recording.transcript,
          timestamp: "00:00:00",
          isImportant: false,
          concepts: [],
        },
      ];
    }

    setSessionTranscript(chunks);
    setGeneratedNotes(null);
  };

  // Delete a recording
  const handleDeleteRecording = async (recordingId: Id<"recordings">) => {
    try {
      await deleteRecording({ recordingId });
      if (selectedSession === recordingId) {
        handleReset();
      }
    } catch (e) {
      console.error("Failed to delete recording", e);
      alert("Failed to delete recording.");
    }
  };

  // Don't render until mounted (hydration fix)
  if (!isMounted) return null;

  return (
    <>
    <motion.div
      initial={false}
      animate={{
        width: isRightOpen ? 320 : isRightCompact ? 72 : 0,
        opacity: isRightClosed ? 0 : 1,
        x: isRightClosed ? 320 : 0,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "group/right-sidebar h-screen bg-sidebar border-l border-sidebar-border flex flex-col shrink-0 z-50 overflow-hidden",
        isRightClosed && "pointer-events-none border-transparent",
        activeContext && "border-l-primary/30",
      )}
      onDrop={handleNativeDrop}
      onDragOver={handleNativeDragOver}
      onMouseUp={handleTextSelection}
    >
      <div className="w-full h-full flex flex-col shrink-0 min-w-0">
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileUpload}
          className="hidden"
          aria-hidden
        />
        <input
          ref={textbookInputRef}
          type="file"
          accept=".pdf,.ppt,.pptx,.doc,.docx"
          onChange={handleTextbookUpload}
          className="hidden"
          aria-hidden
        />
        <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-3 border-b border-sidebar-border">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-md text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              onClick={toggleRightSidebar}
              aria-label={isRightOpen ? "Hide Lumina Studio" : "Show Lumina Studio"}
              title={isRightOpen ? "Hide Lumina Studio" : "Show Lumina Studio"}
            >
              <PanelRightClose className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-md bg-sidebar-accent flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              {!isRightCompact && (
                <div className="min-w-0 flex flex-col gap-0">
                  <span className="font-medium text-sm text-sidebar-foreground truncate leading-tight">
                    Studio
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Capture & transcribe
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        {isRightCompact ? (
          <div className="flex-1 flex flex-col items-stretch gap-1 py-3 px-1.5 overflow-y-auto min-h-0">
            <p className="text-[9px] text-muted-foreground text-center px-0.5 pb-1.5">
              Quick
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-full rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors disabled:opacity-40"
              title="Import audio"
              disabled={isUploading || isTranscribing}
              onClick={() =>
                !isUploading &&
                !isTranscribing &&
                fileInputRef.current?.click()
              }
            >
              <FileAudio className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-full rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors disabled:opacity-40"
              title="Import file"
              disabled={isUploadingTextbook}
              onClick={() =>
                !isUploadingTextbook && textbookInputRef.current?.click()
              }
            >
              <BookOpen className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "h-9 w-full rounded-md transition-colors",
                isRecording
                  ? "text-red-500 bg-red-500/10 hover:bg-red-500/15"
                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent",
              )}
              title={isRecording ? "Pause recording" : "Start recording"}
              onClick={() => void handleToggleRecording()}
            >
              <Mic className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-full rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
              title="Upload & recording history"
              onClick={() => setShowHistory((h) => !h)}
            >
              <History className="w-4 h-4" />
            </Button>
          </div>
        ) : (
        <ScrollArea className="flex-1 min-h-0">
        {/* Top: Upload & Recording */}
        <div className="p-4 flex flex-col gap-3 relative overflow-hidden">
          <ContextDeck />

          {/* Dynamic Mode Indicator Header */}
          <div className="flex items-center justify-between gap-2 min-h-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={sidebarMode}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                {sidebarMode === "recording" && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="font-medium text-foreground">{formatTime(elapsedTime)}</span>
                  </>
                )}
                {sidebarMode === "uploading" && (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading {uploadProgress}%</span>
                  </>
                )}
                {sidebarMode === "transcribing" && (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                )}
                {sidebarMode === "ready" && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span>Ready</span>
                  </>
                )}
                {sidebarMode === "idle" && (
                  <>
                    <Radio className="w-3.5 h-3.5" />
                    <span>Capture</span>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {sidebarMode === "recording" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                onClick={() => handleReset(false)}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset
              </Button>
            )}
          </div>

          {/* Subtle top indicator based on mode */}
          {sidebarMode !== "idle" && (
            <div
              className={cn(
                "absolute top-0 left-0 w-full h-0.5 transition-colors duration-300",
                sidebarMode === "recording" && "bg-red-500",
                (sidebarMode === "uploading" || sidebarMode === "transcribing") && "bg-muted-foreground",
                sidebarMode === "ready" && "bg-green-500",
              )}
            />
          )}

          {/* Quick Import Actions - Only show in idle mode */}
          <AnimatePresence>
            {sidebarMode === "idle" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() =>
                      !isUploading &&
                      !isTranscribing &&
                      fileInputRef.current?.click()
                    }
                    className="group/import flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-sidebar-border bg-background hover:bg-sidebar-accent transition-colors"
                  >
                    <div className="rounded-md bg-sidebar-accent p-2 group-hover/import:bg-background transition-colors">
                      <FileAudio className="w-4 h-4 text-muted-foreground group-hover/import:text-foreground transition-colors" />
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground group-hover/import:text-foreground transition-colors">
                      Import Audio
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      !isUploadingTextbook && textbookInputRef.current?.click()
                    }
                    className="group/import flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-sidebar-border bg-background hover:bg-sidebar-accent transition-colors"
                  >
                    <div className="rounded-md bg-sidebar-accent p-2 group-hover/import:bg-background transition-colors">
                      <BookOpen className="w-4 h-4 text-muted-foreground group-hover/import:text-foreground transition-colors" />
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground group-hover/import:text-foreground transition-colors">
                      Import File
                    </span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recording Card - Mode Aware */}
          <div
            className={cn(
              "rounded-lg p-4 flex flex-col items-center gap-4 relative overflow-hidden transition-colors duration-200 border",
              "bg-sidebar-accent/50 border-sidebar-border",
            )}
          >

            {/* Mode-specific content */}
            <AnimatePresence mode="wait">
              {/* READY MODE - Show transcript preview and generate button */}
              {sidebarMode === "ready" && (
                <motion.div
                  key="ready-mode"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full flex flex-col gap-3"
                >
                  {/* Code Block Panel */}
                  {codeBlocks.length > 0 && (
                    <CodeBlockPanel
                      codeBlocks={codeBlocks}
                      onRemove={handleRemoveCodeBlock}
                      onClear={handleClearCodeBlocks}
                      onLanguageChange={handleCodeBlockLanguageChange}
                    />
                  )}

                  {/* Optional web URLs — fetched server-side and merged into the AI prompt */}
                  <div className="w-full rounded-md border border-sidebar-border bg-background/70 px-2.5 py-2 space-y-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                      <Link2 className="w-3 h-3 shrink-0" />
                      Reference links
                    </div>
                    <p className="text-[10px] text-muted-foreground/90 leading-snug">
                      Add public pages (syllabus, docs, articles). We fetch the
                      text and use it alongside your transcript when generating
                      notes. Up to 5 links.
                    </p>
                    <div className="flex gap-1.5">
                      <Input
                        value={referenceUrlInput}
                        onChange={(e) => setReferenceUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addReferenceUrlsFromInput();
                          }
                        }}
                        placeholder="https://…"
                        className="h-8 text-xs"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-8 shrink-0 px-2.5 text-xs"
                        onClick={addReferenceUrlsFromInput}
                        disabled={referenceUrls.length >= 5}
                      >
                        Add
                      </Button>
                    </div>
                    {referenceUrls.length > 0 ? (
                      <ul className="flex flex-col gap-1 max-h-28 overflow-y-auto">
                        {referenceUrls.map((u) => (
                          <li
                            key={u}
                            className="flex items-start gap-1.5 rounded border border-border/50 bg-muted/20 px-1.5 py-1"
                          >
                            <span
                              className="flex-1 min-w-0 text-[10px] text-muted-foreground break-all"
                              title={u}
                            >
                              {u}
                            </span>
                            <button
                              type="button"
                              className="shrink-0 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                              onClick={() =>
                                setReferenceUrls((prev) =>
                                  prev.filter((x) => x !== u),
                                )
                              }
                              aria-label="Remove link"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>

                  {/* Extract Code Button — shown when text is selected */}
                  {selectedText && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsCodeExtractorOpen(true)}
                      className="w-full h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent border border-sidebar-border"
                    >
                      <Code2 className="w-3.5 h-3.5 mr-1.5" />
                      Extract Selection as Code Block
                    </Button>
                  )}

                  {/* Streaming Notes Display */}
                  {streamingNotes.state.phase !== "idle" &&
                    useStreamingMode && (
                      <StreamingNotesDisplay
                        state={streamingNotes.state}
                        onInsert={handleInsertStreamingNotes}
                        onCancel={() => streamingNotes.cancel()}
                        onSkip={() => streamingNotes.skipAnimation()}
                      />
                    )}

                  {/* Show Generated Notes Preview if notes are ready (structured mode) */}
                  {generatedNotes && streamingNotes.state.phase === "idle" ? (
                    <div className="rounded-md p-3 border border-sidebar-border bg-background">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <span className="text-xs font-medium text-foreground">
                          Notes ready
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {recordingTitle || "AI-generated notes are ready"}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {generatedNotes.sections?.length || 0} sections
                      </p>
                    </div>
                  ) : showTranscriptPreview &&
                    sessionTranscript.length > 0 &&
                    streamingNotes.state.phase === "idle" ? (
                    /* Transcript Preview */
                    <div className="rounded-md p-3 border border-sidebar-border bg-background">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium text-foreground">
                            Transcript ready
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {sessionTranscript.reduce(
                            (acc, chunk) => acc + chunk.text.split(" ").length,
                            0,
                          )}{" "}
                          words
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {sessionTranscript[0]?.text?.slice(0, 200) ||
                          "No transcript available"}
                        {(sessionTranscript[0]?.text?.length || 0) > 200 &&
                          "..."}
                      </p>
                    </div>
                  ) : null}

                  {/* Mode toggle: Streaming vs Structured */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setUseStreamingMode(!useStreamingMode)}
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium transition-colors",
                        useStreamingMode
                          ? "bg-sidebar-accent text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Zap className="w-3 h-3" />
                      {useStreamingMode ? "Streaming" : "Structured"}
                    </button>
                    <span className="text-[10px] text-muted-foreground">
                      {useStreamingMode
                        ? "Animated output"
                        : "Section-based"}
                    </span>
                  </div>

                  {priorNoteForSession &&
                    selectedSession &&
                    !generatedNotes && (
                      <div className="w-full flex items-start gap-2 rounded-md border border-border/60 bg-muted/30 px-2.5 py-2">
                        <Checkbox
                          id={improvePriorNotesId}
                          checked={improveFromPriorNotes}
                          onCheckedChange={(checked) =>
                            setImproveFromPriorNotes(checked === true)
                          }
                          className="mt-0.5"
                        />
                        <Label
                          htmlFor={improvePriorNotesId}
                          className="text-[10px] leading-snug text-muted-foreground font-normal cursor-pointer"
                        >
                          Improve existing note &quot;
                          {priorNoteForSession.noteTitle.length > 44
                            ? `${priorNoteForSession.noteTitle.slice(0, 44)}…`
                            : priorNoteForSession.noteTitle}
                          &quot; using this transcript
                          {priorNoteForSession.truncated ? (
                            <span className="mt-1 block text-amber-700/90 dark:text-amber-400/90">
                              Part of a very long note was trimmed for the AI
                              context limit.
                            </span>
                          ) : null}
                        </Label>
                      </div>
                    )}

                  {/* Generate Notes Button - Clean primary action */}
                  <Button
                    className="w-full h-10 font-medium"
                    onClick={
                      generatedNotes
                        ? handleInsertNotes
                        : useStreamingMode
                          ? handleGenerateStreamingNotes
                          : handleGenerateNotes
                    }
                    disabled={
                      isGeneratingNotes ||
                      streamingNotes.state.isStreaming ||
                      isOpeningNoteFromRecording
                    }
                  >
                    {isOpeningNoteFromRecording ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 shrink-0 animate-spin" />
                        Opening note…
                      </>
                    ) : isGeneratingNotes || streamingNotes.state.isStreaming ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 shrink-0 animate-spin" />
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.span
                            key={
                              useStreamingMode &&
                              streamingNotes.state.phase === "animating"
                                ? "formatting"
                                : "generating"
                            }
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{
                              duration: 0.22,
                              ease: [0.22, 1, 0.36, 1],
                            }}
                            className="inline-block"
                          >
                            {useStreamingMode &&
                            streamingNotes.state.phase === "animating"
                              ? "Formatting..."
                              : "Generating..."}
                          </motion.span>
                        </AnimatePresence>
                      </>
                    ) : generatedNotes ? (
                      <>
                        <PenLine className="w-4 h-4 mr-2" />
                        Insert Notes
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Notes
                      </>
                    )}
                  </Button>

                  {/* Secondary actions */}
                  <div className="flex gap-2">
                    {!generatedNotes && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                        onClick={handleToggleRecording}
                      >
                        <Play className="w-3 h-3 mr-1.5" />
                        Resume
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                      onClick={handleSaveClick}
                    >
                      <Save className="w-3 h-3 mr-1.5" />
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                      onClick={() => handleReset(false)}
                    >
                      <RotateCcw className="w-3 h-3 mr-1.5" />
                      Reset
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* IDLE/RECORDING MODE - Show standard recording interface */}
              {(sidebarMode === "idle" || sidebarMode === "recording") && (
                <motion.div
                  key="recording-mode"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full flex flex-col items-center gap-4"
                >
                  {/* Header Status */}
                  <div className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-md flex items-center justify-center transition-colors",
                          isRecording
                            ? "bg-red-500/10 text-red-500"
                            : "bg-sidebar-accent text-muted-foreground",
                        )}
                      >
                        <Mic className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">
                          {isRecording ? "Recording" : "Ready"}
                        </span>
                        <span className="font-mono text-sm font-medium text-foreground tabular-nums">
                          {formatTime(elapsedTime)}
                        </span>
                      </div>
                    </div>

                    {/* Quick Reset (only visible if content exists) */}
                    {(elapsedTime > 0 || sessionTranscript.length > 0) && (
                      <button
                        onClick={() => handleReset(true)}
                        className="w-7 h-7 rounded-md hover:bg-sidebar-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Mic-level waveform (AnalyserNode); not random — reflects live input */}
                  <div className="w-full h-10 flex items-end justify-center gap-0.5 my-1">
                    {waveformLevels.map((level, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-1 rounded-full transition-[height,opacity] duration-75 ease-out",
                          isRecording ? "bg-red-400" : "bg-muted-foreground/30",
                        )}
                        style={{
                          height: isRecording
                            ? `${4 + level * 28}px`
                            : 4,
                          opacity: isRecording
                            ? 0.35 + level * 0.6
                            : 0.2,
                        }}
                      />
                    ))}
                  </div>

                  {/* Main Action Button */}
                  <Button
                    onClick={handleToggleRecording}
                    variant={isRecording ? "outline" : "default"}
                    className={cn(
                      "w-full h-10 font-medium transition-colors",
                      isRecording && "border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-500",
                    )}
                  >
                    {isRecording
                      ? "Pause"
                      : hasDraftTranscript
                        ? "Resume"
                        : "Start Recording"}
                  </Button>
                </motion.div>
              )}

              {/* UPLOADING/TRANSCRIBING MODE - Show progress */}
              {(sidebarMode === "uploading" ||
                sidebarMode === "transcribing") && (
                <motion.div
                  key="uploading-mode"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full flex flex-col items-center gap-3 py-3"
                >
                  <div className="w-12 h-12 rounded-md bg-sidebar-accent flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">
                      {sidebarMode === "uploading"
                        ? "Uploading..."
                        : "Processing..."}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {sidebarMode === "uploading"
                        ? `${uploadProgress}% complete`
                        : "Transcribing audio"}
                    </p>
                  </div>
                  {sidebarMode === "uploading" && (
                    <div className="w-full h-1 bg-sidebar-accent rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Upload & Recording History */}
          <div className="pt-2">
            <button
              className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
              onClick={() => setShowHistory(!showHistory)}
            >
              <span className="flex items-center gap-2 text-xs font-medium">
                <History className="w-3.5 h-3.5" />
                History
                {(pastRecordings?.filter(
                  (r) => r.transcript && r.transcript.trim().length > 0,
                )?.length ?? 0) +
                  (files?.length ?? 0) >
                  0 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-sidebar-accent text-muted-foreground">
                    {(pastRecordings?.filter(
                      (r) => r.transcript && r.transcript.trim().length > 0,
                    )?.length ?? 0) + (files?.length ?? 0)}
                  </span>
                )}
              </span>
              <motion.div
                animate={{ rotate: showHistory ? 180 : 0 }}
                transition={{ duration: 0.15 }}
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </motion.div>
            </button>

            {/* Cleanup button - shows if there are orphaned recordings */}
            {pastRecordings &&
              pastRecordings.filter(
                (r) => !r.transcript || r.transcript.trim().length === 0,
              ).length > 0 && (
                <button
                  className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 mt-1 rounded-md text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/15 text-xs transition-colors"
                  onClick={async () => {
                    try {
                      const result = await cleanupOrphanedRecordings();
                      toast.success(
                        `Cleaned up ${result.deletedCount} failed recording(s)`,
                      );
                    } catch (error) {
                      console.error("Cleanup error:", error);
                      toast.error("Failed to cleanup recordings");
                    }
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                  Clean up{" "}
                  {
                    pastRecordings.filter(
                      (r) => !r.transcript || r.transcript.trim().length === 0,
                    ).length
                  }{" "}
                  failed
                </button>
              )}

            {/* History List */}
            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <ScrollArea className="mt-2 max-h-52">
                    <div className="space-y-1 pr-2">
                      {/* Processing placeholder removed as it is now shown in the main card */}

                      {[
                        ...(pastRecordings ?? [])
                          .filter(
                            (r) =>
                              r.transcript && r.transcript.trim().length > 0,
                          )
                          .map((r) => ({
                            type: "recording" as const,
                            id: r._id,
                            title: r.title,
                            subtitle: r.duration
                              ? `${Math.floor(r.duration / 60)}:${String(Math.floor(r.duration % 60)).padStart(2, "0")}`
                              : "Audio",
                            createdAt: r.createdAt,
                            status:
                              selectedSession === r._id
                                ? ("Active" as const)
                                : ("Completed" as const),
                          })),
                        ...(files ?? []).map((f) => ({
                          type: "file" as const,
                          id: f._id,
                          title: f.name,
                          subtitle: undefined,
                          createdAt: f.createdAt,
                          status:
                            activeContext?.type === "file" &&
                            activeContext.id === f._id
                              ? ("Active" as const)
                              : f.processingStatus === "pending" ||
                                  f.processingStatus === "processing"
                                ? ("Processing" as const)
                                : ("Completed" as const),
                        })),
                      ]
                        .sort((a, b) => b.createdAt - a.createdAt)
                        .map((item) => (
                          <motion.div
                            key={item.type + item.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={cn(
                              "group relative flex items-center gap-2.5 px-2 py-2 rounded-md cursor-pointer transition-colors",
                              item.status === "Active"
                                ? "bg-sidebar-accent"
                                : "hover:bg-sidebar-accent",
                            )}
                            onClick={() => {
                              if (item.type === "recording") {
                                const r = pastRecordings?.find(
                                  (x) => x._id === item.id,
                                );
                                if (r) handleLoadPastSession(r);
                              } else {
                                setActiveContext({
                                  id: item.id,
                                  name: item.title,
                                  type: "file",
                                });
                              }
                            }}
                          >
                            <div
                              className={cn(
                                "h-7 w-7 shrink-0 rounded-md flex items-center justify-center transition-colors",
                                item.status === "Active"
                                  ? "bg-primary/10 text-primary"
                                  : "bg-sidebar-accent text-muted-foreground group-hover:text-foreground",
                              )}
                            >
                              {item.type === "recording" ? (
                                <FileAudio className="w-3.5 h-3.5" />
                              ) : (
                                <FileText className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={cn(
                                  "text-xs font-medium truncate transition-colors",
                                  item.status === "Active"
                                    ? "text-foreground"
                                    : "text-muted-foreground group-hover:text-foreground",
                                )}
                              >
                                {item.title}
                              </p>
                              {item.subtitle && (
                                <p className="text-[10px] text-muted-foreground/70 truncate">
                                  {item.subtitle}
                                </p>
                              )}
                            </div>
                            {item.status === "Processing" && (
                              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground shrink-0" />
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all rounded-md shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (item.type === "recording") {
                                  handleDeleteRecording(
                                    item.id as Id<"recordings">,
                                  );
                                } else {
                                  deleteFile({
                                    fileId: item.id as Id<"files">,
                                  });
                                  if (
                                    activeContext?.type === "file" &&
                                    activeContext.id === item.id
                                  ) {
                                    setActiveContext(null);
                                  }
                                }
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </motion.div>
                        ))}

                      {(pastRecordings?.length ?? 0) + (files?.length ?? 0) ===
                        0 &&
                        !isUploading &&
                        !isTranscribing && (
                          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground gap-2">
                            <History className="w-5 h-5 opacity-40" />
                            <p className="text-xs">
                              No history yet
                            </p>
                          </div>
                        )}
                    </div>
                  </ScrollArea>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </ScrollArea>
        )}
      </div>
    </motion.div>
    {isRightClosed && (
      <button
        type="button"
        onClick={() => setRightSidebarState("open")}
        className="fixed right-4 top-4 z-60 w-9 h-9 bg-background border border-sidebar-border rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
        aria-label="Open Studio"
        title="Open Studio"
      >
        <PanelRightOpen className="w-4 h-4" />
      </button>
    )}
    <Dialog
      open={isSaveModalOpen}
      onOpenChange={(open) => {
        setIsSaveModalOpen(open);
        if (!open) setIsSavingSession(false);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Session</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-muted-foreground">
              Title
            </Label>
            <Input
              id="title"
              value={recordingTitle}
              onChange={(e) => setRecordingTitle(e.target.value)}
              placeholder="Enter a title..."
              disabled={isSavingSession}
            />
          </div>
          <div className="flex justify-between text-sm text-muted-foreground bg-sidebar-accent p-3 rounded-md">
            <span>Duration</span>
            <span className="font-mono text-foreground">
              {formatTime(elapsedTime)}
            </span>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => setIsSaveModalOpen(false)}
            disabled={isSavingSession}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirmSave} disabled={isSavingSession}>
            {isSavingSession ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <CodeExtractorDialog
      isOpen={isCodeExtractorOpen}
      onClose={() => setIsCodeExtractorOpen(false)}
      selectedText={selectedText}
      onExtract={handleExtractCode}
    />
  </>
  );
}
