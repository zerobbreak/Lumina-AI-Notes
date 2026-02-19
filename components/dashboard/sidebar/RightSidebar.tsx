"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
  Clock,
  Pause,
  Play,
  RotateCcw,
  Save,
  AlertCircle,
  Sparkles,
  Loader2,
  Upload,
  ChevronDown,
  Trash2,
  FileAudio,
  FileText,
  Radio,
  Volume2,
  PenLine,
  BookOpen,
  RefreshCw,
  History,
  Code2,
  Zap,
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
  const [permissionState, setPermissionState] = useState<
    "prompt" | "granted" | "denied" | "unknown"
  >("unknown");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Save Modal State
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
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
  const [usedContextName, setUsedContextName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textbookInputRef = useRef<HTMLInputElement>(null);
  const showTranscriptPreview = false;
  const restoredDraftRef = useRef(false);
  const liveSessionIdRef = useRef<string>(crypto.randomUUID());

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
  const { createNoteFlow, TemplateSelector } = useCreateNoteFlow();

  // Get dashboard context for pending notes and active context
  const { setPendingNotes, activeContext, setActiveContext } = useDashboard();
  const generateFromPinnedAudio = useAction(api.notes.generateFromPinnedAudio);

  const { transcript, resetTranscript, browserSupportsSpeechRecognition } =
    useSpeechRecognition();

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

  // Validate active context file still exists
  const contextFile = useQuery(
    api.files.getFile,
    activeContext && activeContext.type === "file"
      ? { fileId: activeContext.id as Id<"files"> }
      : "skip",
  ); // New Phase 2 Action

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
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const clearRecordingDraft = () => {
    try {
      localStorage.removeItem(RECORDING_DRAFT_STORAGE_KEY);
    } catch (error) {
      console.warn("[recording-draft] failed to clear local draft:", error);
    }
  };

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

  // Reset handler (moved up for hoisting)
  const handleReset = (showToast = false) => {
    setIsRecording(false);
    setElapsedTime(0);
    resetTranscript();
    setSessionTranscript([]);
    setGeneratedNotes(null);
    setSelectedSession(null);
    setActiveContext(null);
    setUsedContextName(null);
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
        const recordingId = await upsertRecordingDraft({
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
    try {
      if (buildFinalChunks.length === 0) {
        toast.warning("Cannot save empty recording");
        return;
      }

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
    }
  };

  const handleGenerateNotes = async () => {
    // Stop recording if still active
    if (isRecording) {
      SpeechRecognition.stopListening();
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
        });
        setGeneratedNotes(notes);
        setUsedContextName(activeContext.name);
      } else {
        // Standard generation without context
        const notes = await generateStructuredNotes({
          transcript: JSON.stringify(buildFinalChunks),
          title: recordingTitle || "Recording",
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
    });
  };

  // Handle streaming notes insertion into the editor
  const handleInsertStreamingNotes = async (markdownContent: string) => {
    const currentNoteId = searchParams.get("noteId");
    // Wrap markdown in a StructuredNotes shape for compatibility
    const wrappedNotes: StructuredNotes = {
      summary: markdownContent,
      cornellCues: [],
      cornellNotes: [],
      actionItems: [],
      reviewQuestions: [],
    };

    if (!currentNoteId) {
      try {
        const title = recordingTitle
          ? `Notes from ${recordingTitle}`
          : "Generated Notes";
        const result = await createNoteFlow({
          title,
          major: userData?.major || "general",
        });
        if (!result?.noteId) return;
        setPendingNotes(wrappedNotes);
        streamingNotes.reset();
        router.push(`/dashboard?noteId=${result.noteId}`);
        toast.success("Created new note with generated content");
      } catch (error) {
        console.error("Failed to create note:", error);
        toast.error("Failed to create note. Please try again.");
      }
    } else {
      setPendingNotes(wrappedNotes);
      streamingNotes.reset();
      toast.success("Content ready to insert");
    }
  };

  const handleInsertNotes = async () => {
    const currentNoteId = searchParams.get("noteId");

    if (!currentNoteId && generatedNotes) {
      // No note is open - create a new one
      try {
        const title =
          recordingTitle || usedContextName
            ? `Notes from ${usedContextName || recordingTitle || "Recording"}`
            : "Generated Notes";

        const result = await createNoteFlow({
          title,
          major: userData?.major || "general",
        });
        if (!result?.noteId) return;

        // Set pending notes and navigate to the new note
        setPendingNotes(generatedNotes);
        setGeneratedNotes(null);
        router.push(`/dashboard?noteId=${result.noteId}`);
        toast.success("Created new note with generated content");
      } catch (error) {
        console.error("Failed to create note:", error);
        toast.error("Failed to create note. Please try again.");
      }
    } else if (generatedNotes) {
      // Note is already open - just set pending notes
      setPendingNotes(generatedNotes);
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
      } catch (error) {
        console.error("Failed to start speech recognition:", error);
        setIsRecording(false);
        alert(
          "Failed to start speech recognition. Please check microphone permissions.",
        );
      }
    } else {
      // Pausing - save and analyze current transcript chunk
      SpeechRecognition.stopListening();
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

    console.log(
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
      console.log(
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
      console.log(
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
        console.log(
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

  // Check browser support
  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="w-[320px] h-screen bg-black/20 backdrop-blur-xl border-l border-white/5 flex flex-col items-center justify-center text-white p-6 text-center gap-4">
        <AlertCircle className="w-10 h-10 text-yellow-500" />
        <p className="text-sm">
          Speech recognition is not supported in this browser. Please use Google
          Chrome for the best experience.
        </p>
      </div>
    );
  }

  // Show denied state only if we know for sure permission was denied
  if (permissionState === "denied") {
    return (
      <div className="w-[320px] h-screen bg-black/20 backdrop-blur-xl border-l border-white/5 flex flex-col items-center justify-center text-white p-6 text-center gap-4">
        <Mic className="w-10 h-10 text-red-500" />
        <p className="text-sm">
          Microphone access was denied. Please allow microphone access in your
          browser settings and reload the page.
        </p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Reload Page
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="w-[320px] h-screen bg-sidebar backdrop-blur-xl border-l border-sidebar-border flex flex-col shrink-0 z-50 transition-all duration-300 overflow-hidden"
      onDrop={handleNativeDrop}
      onDragOver={handleNativeDragOver}
      onMouseUp={handleTextSelection}
      style={{
        boxShadow: activeContext
          ? "inset 0 0 40px rgba(59, 130, 246, 0.1)"
          : "none",
        borderColor: activeContext
          ? "rgba(59, 130, 246, 0.3)"
          : "rgba(255, 255, 255, 0.05)",
      }}
    >
      <ScrollArea className="flex-1 min-h-0">
        {/* Top: Upload & Recording */}
        <div className="p-4 flex flex-col gap-3 relative overflow-hidden">
          <ContextDeck />

          {/* Dynamic Mode Indicator Header */}
          <div className="flex items-center justify-between mb-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={sidebarMode}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border",
                  sidebarMode === "recording" &&
                    "bg-red-500/10 text-red-400 border-red-500/20",
                  sidebarMode === "uploading" &&
                    "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
                  sidebarMode === "transcribing" &&
                    "bg-amber-500/10 text-amber-400 border-amber-500/20",
                  sidebarMode === "ready" &&
                    "bg-green-500/10 text-green-400 border-green-500/20",
                  sidebarMode === "idle" &&
                    "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-400 border-slate-200 dark:border-white/10",
                )}
              >
                {sidebarMode === "recording" && (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                    </span>
                    Recording • {formatTime(elapsedTime)}
                  </>
                )}
                {sidebarMode === "uploading" && (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Uploading... {uploadProgress}%
                  </>
                )}
                {sidebarMode === "transcribing" && (
                  <>
                    <Sparkles className="w-3 h-3 animate-pulse" />
                    Processing with AI...
                  </>
                )}
                {sidebarMode === "ready" && (
                  <>
                    <Sparkles className="w-3 h-3" />
                    Content Ready
                  </>
                )}
                {sidebarMode === "idle" && (
                  <>
                    <Radio className="w-3 h-3" />
                    Lumina Studio
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Reset button only for recording mode (ready mode has its own reset button) */}
            {sidebarMode === "recording" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-slate-500 dark:text-gray-500 hover:text-slate-700 dark:hover:text-white"
                onClick={() => handleReset(false)}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset
              </Button>
            )}
          </div>

          {/* Animated gradient border based on mode */}
          <div
            className={cn(
              "absolute top-0 left-0 w-full h-1 transition-all duration-500",
              sidebarMode === "recording"
                ? "bg-linear-to-r from-red-500 via-orange-500 to-red-500 bg-size-[200%_100%] animate-gradient-x opacity-100"
                : sidebarMode === "uploading" || sidebarMode === "transcribing"
                  ? "bg-linear-to-r from-cyan-500 via-indigo-500 to-purple-500 animate-pulse opacity-100"
                  : sidebarMode === "ready"
                    ? "bg-linear-to-r from-green-500 via-emerald-500 to-green-500 opacity-100"
                    : "bg-linear-to-r from-cyan-500 via-indigo-500 to-purple-500 opacity-30",
            )}
          />

          {/* Quick Import Actions - Only show in idle mode */}
          <AnimatePresence>
            {sidebarMode === "idle" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() =>
                      !isUploading &&
                      !isTranscribing &&
                      fileInputRef.current?.click()
                    }
                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border transition-all duration-200 bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/5 hover:bg-slate-200 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/10"
                  >
                    <FileAudio className="w-5 h-5 text-slate-500 dark:text-gray-400" />
                    <span className="text-[10px] font-medium text-slate-500 dark:text-gray-400">
                      Import Audio
                    </span>
                  </button>

                  <input
                    ref={textbookInputRef}
                    type="file"
                    accept=".pdf,.ppt,.pptx,.doc,.docx"
                    onChange={handleTextbookUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() =>
                      !isUploadingTextbook && textbookInputRef.current?.click()
                    }
                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border transition-all duration-200 bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/5 hover:bg-slate-200 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/10"
                  >
                    <BookOpen className="w-5 h-5 text-slate-500 dark:text-gray-400" />
                    <span className="text-[10px] font-medium text-slate-500 dark:text-gray-400">
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
              "rounded-3xl p-6 flex flex-col items-center gap-6 shadow-2xl shadow-black/50 relative overflow-hidden group transition-all duration-500",
              sidebarMode === "ready"
                ? "bg-linear-to-b from-green-900/20 to-slate-900 dark:to-black border border-green-500/20"
                : "bg-slate-900 dark:bg-black border border-slate-700 dark:border-white/5",
            )}
          >
            {/* Subtle Background Glow */}
            <div
              className={cn(
                "absolute inset-0 bg-linear-to-b opacity-20 pointer-events-none transition-opacity duration-500",
                sidebarMode === "recording"
                  ? "from-red-500/30 via-transparent to-transparent"
                  : sidebarMode === "ready"
                    ? "from-green-500/20 via-transparent to-transparent"
                    : "from-blue-500/10 via-transparent to-transparent",
              )}
            />

            {/* Mode-specific content */}
            <AnimatePresence mode="wait">
              {/* READY MODE - Show transcript preview and generate button */}
              {sidebarMode === "ready" && (
                <motion.div
                  key="ready-mode"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="w-full flex flex-col gap-4 relative z-10"
                >
                  {/* Code Block Panel */}
                  {codeBlocks.length > 0 && (
                    <CodeBlockPanel
                      codeBlocks={codeBlocks}
                      onRemove={handleRemoveCodeBlock}
                      onClear={handleClearCodeBlocks}
                    />
                  )}

                  {/* Extract Code Button — shown when text is selected */}
                  {selectedText && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsCodeExtractorOpen(true)}
                      className="w-full h-8 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs border border-emerald-500/20"
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
                    <div className="bg-green-500/10 rounded-xl p-3 border border-green-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-[10px] font-semibold text-green-400 uppercase tracking-wider">
                          Notes Generated ✓
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 line-clamp-2">
                        {recordingTitle || "Your AI-generated notes are ready"}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-1">
                        {generatedNotes.cornellNotes?.length || 0} key points
                        extracted
                      </p>
                    </div>
                  ) : showTranscriptPreview &&
                    sessionTranscript.length > 0 &&
                    streamingNotes.state.phase === "idle" ? (
                    /* Transcript Preview */
                    <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-green-400" />
                          <span className="text-[10px] font-semibold text-green-400 uppercase tracking-wider">
                            Transcript Ready
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-500">
                          {sessionTranscript.reduce(
                            (acc, chunk) => acc + chunk.text.split(" ").length,
                            0,
                          )}{" "}
                          words
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 line-clamp-3">
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
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all",
                        useStreamingMode
                          ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                          : "bg-white/5 text-gray-500 border-white/10",
                      )}
                    >
                      <Zap className="w-3 h-3" />
                      {useStreamingMode ? "Streaming" : "Structured"}
                    </button>
                    <span className="text-[9px] text-gray-600">
                      {useStreamingMode
                        ? "Animated markdown output"
                        : "Cornell-style JSON output"}
                    </span>
                  </div>

                  {/* Generate Notes Button - Prominent */}
                  <Button
                    className={cn(
                      "w-full h-14 text-white font-semibold shadow-lg",
                      generatedNotes
                        ? "bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-500/20"
                        : "bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-green-500/20",
                    )}
                    onClick={
                      generatedNotes
                        ? handleInsertNotes
                        : useStreamingMode
                          ? handleGenerateStreamingNotes
                          : handleGenerateNotes
                    }
                    disabled={
                      isGeneratingNotes || streamingNotes.state.isStreaming
                    }
                  >
                    {isGeneratingNotes || streamingNotes.state.isStreaming ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating Notes...
                      </>
                    ) : generatedNotes ? (
                      <>
                        <PenLine className="w-4 h-4 mr-2" />
                        Insert Notes to Editor
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate AI Notes
                      </>
                    )}
                  </Button>

                  {/* Secondary actions */}
                  <div className="flex gap-2">
                    {!generatedNotes && (
                      <Button
                        variant="ghost"
                        className="flex-1 h-9 bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300 border border-white/5"
                        onClick={handleToggleRecording}
                      >
                        <Play className="w-3 h-3 mr-2" />
                        Resume
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      className="flex-1 h-9 bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300 border border-white/5"
                      onClick={handleSaveClick}
                    >
                      <Save className="w-3 h-3 mr-2" />
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      className="flex-1 h-9 bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-400 border border-white/5"
                      onClick={() => handleReset(false)}
                    >
                      <RotateCcw className="w-3 h-3 mr-2" />
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
                  className="w-full flex flex-col items-center gap-6"
                >
                  {/* Header Status */}
                  <div className="w-full flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                          isRecording
                            ? "bg-red-500/20 text-red-500"
                            : "bg-white/5 text-gray-400",
                        )}
                      >
                        <Mic className="w-5 h-5 fill-current" />
                      </div>
                      <div className="flex flex-col">
                        <span
                          className={cn(
                            "text-[10px] font-bold tracking-wider uppercase",
                            isRecording ? "text-red-500" : "text-gray-500",
                          )}
                        >
                          {isRecording ? "Recording" : "Ready"}
                        </span>
                        <span className="font-mono text-sm font-medium text-white tabular-nums">
                          {formatTime(elapsedTime)}
                        </span>
                      </div>
                    </div>

                    {/* Quick Reset (only visible if content exists) */}
                    {(elapsedTime > 0 || sessionTranscript.length > 0) && (
                      <button
                        onClick={() => handleReset(true)}
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Waveform Visualizer - Clean & Minimal */}
                  <div className="w-full h-16 flex items-center justify-center gap-1 relative z-10 my-2">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <motion.div
                        key={i}
                        animate={
                          isRecording
                            ? {
                                height: [10, 10 + Math.random() * 40, 10],
                                opacity: [0.3, 1, 0.3],
                              }
                            : { height: 6, opacity: 0.2 }
                        }
                        transition={{
                          duration: 0.4,
                          repeat: Infinity,
                          repeatType: "reverse",
                          delay: i * 0.05,
                        }}
                        className={cn(
                          "w-1.5 rounded-full",
                          isRecording ? "bg-red-500" : "bg-gray-600",
                        )}
                      />
                    ))}
                  </div>

                  {/* Main Action Button */}
                  <button
                    onClick={handleToggleRecording}
                    className={cn(
                      "w-full py-4 rounded-2xl font-semibold text-sm tracking-wide transition-all duration-300 transform active:scale-[0.98] relative z-10 shadow-lg",
                      isRecording
                        ? "bg-white text-black hover:bg-gray-100"
                        : "bg-[#6366f1] text-white hover:bg-[#5558dd] shadow-indigo-500/25",
                    )}
                  >
                    {isRecording
                      ? "Pause Recording"
                      : hasDraftTranscript
                        ? "Resume Recording"
                        : "Start Recording"}
                  </button>
                </motion.div>
              )}

              {/* UPLOADING/TRANSCRIBING MODE - Show progress */}
              {(sidebarMode === "uploading" ||
                sidebarMode === "transcribing") && (
                <motion.div
                  key="uploading-mode"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="w-full flex flex-col items-center gap-4 py-4 relative z-10"
                >
                  <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-cyan-500/20 to-indigo-500/20 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-white mb-1">
                      {sidebarMode === "uploading"
                        ? "Uploading Audio..."
                        : "Processing with AI..."}
                    </p>
                    <p className="text-xs text-gray-500">
                      {sidebarMode === "uploading"
                        ? `${uploadProgress}% complete`
                        : "Transcribing your audio..."}
                    </p>
                  </div>
                  {sidebarMode === "uploading" && (
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-linear-to-r from-cyan-500 to-indigo-500"
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
          <div className="pt-1">
            <button
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all duration-200"
              onClick={() => setShowHistory(!showHistory)}
            >
              <span className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wider">
                <RefreshCw className="w-4 h-4" />
                Upload & Recording History
                {(pastRecordings?.filter(
                  (r) => r.transcript && r.transcript.trim().length > 0,
                )?.length ?? 0) +
                  (files?.length ?? 0) >
                  0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-white/10 text-[10px] font-bold">
                    {(pastRecordings?.filter(
                      (r) => r.transcript && r.transcript.trim().length > 0,
                    )?.length ?? 0) + (files?.length ?? 0)}
                  </span>
                )}
              </span>
              <motion.div
                animate={{ rotate: showHistory ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4" />
              </motion.div>
            </button>

            {/* Cleanup button - shows if there are orphaned recordings */}
            {pastRecordings &&
              pastRecordings.filter(
                (r) => !r.transcript || r.transcript.trim().length === 0,
              ).length > 0 && (
                <button
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 mt-1 rounded-lg text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/10 hover:bg-amber-200 dark:hover:bg-amber-500/20 border border-amber-200 dark:border-amber-500/20 text-xs font-medium transition-all"
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
                  failed upload(s)
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
                          // Filter out recordings without valid transcripts (empty or just "")
                          .filter(
                            (r) =>
                              r.transcript && r.transcript.trim().length > 0,
                          )
                          .map((r) => ({
                            type: "recording" as const,
                            id: r._id,
                            title: r.title,
                            subtitle: r.duration
                              ? `Audio - ${Math.floor(r.duration / 60)}:${String(Math.floor(r.duration % 60)).padStart(2, "0")}`
                              : "Audio Recording",
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
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={cn(
                              "group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200",
                              item.status === "Active"
                                ? "bg-linear-to-r from-cyan-500/15 to-transparent border border-cyan-500/30"
                                : "hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent",
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
                                "h-10 w-10 shrink-0 rounded-lg flex items-center justify-center transition-all duration-200",
                                item.status === "Active"
                                  ? "bg-cyan-500/20 text-cyan-400"
                                  : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-500 group-hover:text-slate-700 dark:group-hover:text-gray-300 group-hover:bg-slate-200 dark:group-hover:bg-white/10",
                              )}
                            >
                              {item.type === "recording" ? (
                                item.status === "Active" ? (
                                  <Volume2 className="w-5 h-5" />
                                ) : (
                                  <FileAudio className="w-5 h-5" />
                                )
                              ) : (
                                <FileText className="w-5 h-5" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={cn(
                                  "text-sm font-medium truncate transition-colors",
                                  item.status === "Active"
                                    ? "text-cyan-700 dark:text-cyan-100"
                                    : "text-slate-700 dark:text-gray-300 group-hover:text-slate-900 dark:group-hover:text-white",
                                )}
                              >
                                {item.title}
                              </p>
                              {item.subtitle && (
                                <p className="text-[10px] text-slate-500 dark:text-gray-500 truncate">
                                  {item.subtitle}
                                </p>
                              )}
                            </div>
                            <span
                              className={cn(
                                "text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0",
                                item.status === "Active"
                                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                  : item.status === "Processing"
                                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                    : "text-gray-500",
                              )}
                            >
                              {item.status}
                            </span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all rounded-lg shrink-0"
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
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </motion.div>
                        ))}

                      {(pastRecordings?.length ?? 0) + (files?.length ?? 0) ===
                        0 &&
                        !isUploading &&
                        !isTranscribing && (
                          <div className="flex flex-col items-center justify-center py-8 text-slate-500 dark:text-gray-600 gap-3">
                            <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                              <History className="w-7 h-7 opacity-30" />
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-medium text-slate-500 dark:text-gray-500">
                                No uploads or recordings yet
                              </p>
                              <p className="text-[10px] text-slate-400 dark:text-gray-600 mt-0.5">
                                Your history will appear here
                              </p>
                            </div>
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

      <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Save Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-gray-400">
                Title
              </Label>
              <Input
                id="title"
                value={recordingTitle}
                onChange={(e) => setRecordingTitle(e.target.value)}
                className="bg-black/20 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-indigo-500"
                placeholder="Enter a title..."
              />
            </div>
            <div className="flex justify-between text-sm text-gray-500 bg-white/5 p-3 rounded-lg">
              <span>Duration</span>
              <span className="font-mono text-white">
                {formatTime(elapsedTime)}
              </span>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setIsSaveModalOpen(false)}
              className="text-gray-400 hover:text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSave}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              Save Recording
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
      <TemplateSelector />
    </motion.div>
  );
}
