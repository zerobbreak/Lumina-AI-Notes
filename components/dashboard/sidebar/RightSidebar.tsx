"use client";

import { useState, useEffect, useRef } from "react";
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
  Pin,
  Upload,
  ChevronDown,
  History,
  Trash2,
  FileAudio,
  FileText,
  Waves,
  Radio,
  Volume2,
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
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { useDashboard } from "@/hooks/useDashboard";
import { StructuredNotes } from "@/components/dashboard/DashboardContext";
import { ContextDeck } from "@/components/dashboard/ContextDeck";
import { useDropzone } from "react-dropzone";

// Enhanced transcript chunk with AI analysis
interface EnhancedChunk {
  text: string;
  enhancedText: string;
  timestamp: string;
  isImportant: boolean;
  concepts: string[];
}

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
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [sessionTranscript, setSessionTranscript] = useState<EnhancedChunk[]>(
    []
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
    null
  );

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showPastSessions, setShowPastSessions] = useState(false);
  const [selectedSession, setSelectedSession] =
    useState<Id<"recordings"> | null>(null);
  const [usedContextName, setUsedContextName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Router and Search Params
  const router = useRouter();
  const searchParams = useSearchParams();

  // API Hooks
  const saveRecording = useMutation(api.recordings.saveRecording);
  const generateStructuredNotes = useAction(api.ai.generateStructuredNotes);
  const analyzeChunk = useAction(api.ai.analyzeChunk);
  const generateUploadUrl = useMutation(api.recordings.generateUploadUrl);
  const saveUploadedRecording = useMutation(
    api.recordings.saveUploadedRecording
  );
  const updateRecordingTranscript = useMutation(
    api.recordings.updateRecordingTranscript
  );
  const transcribeAudio = useAction(api.ai.transcribeAudio);
  const deleteRecording = useMutation(api.recordings.deleteRecording);
  const pastRecordings = useQuery(api.recordings.getRecordings);
  const userData = useQuery(api.users.getUser);
  const createNote = useMutation(api.notes.createNote);

  // Get dashboard context for pending notes and active context
  const { setPendingNotes, activeContext, setActiveContext } = useDashboard();
  const generateFromPinnedAudio = useAction(api.notes.generateFromPinnedAudio);

  // Validate active context file still exists
  const contextFile = useQuery(
    api.files.getFile,
    activeContext && activeContext.type === "file"
      ? { fileId: activeContext.id as Id<"files"> }
      : "skip"
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
      "application/lumina-resource-name"
    );

    if (resourceId && resourceName) {
      setActiveContext({ id: resourceId, name: resourceName, type: "file" });
    }
  };

  const handleNativeDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  // Format seconds to HH:MM:SS (moved up for hoisting)
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

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
    if (showToast) {
      toast.success("Session reset", { duration: 2000 });
    }
  };

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
      `Session ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`
    );
    setIsSaveModalOpen(true);
  };

  const handleConfirmSave = async () => {
    try {
      const finalChunks = [...sessionTranscript];
      if (transcript.trim()) {
        finalChunks.push({
          text: transcript.trim(),
          enhancedText: transcript.trim(),
          timestamp: formatTime(elapsedTime),
          isImportant: false,
          concepts: [],
        });
      }

      await saveRecording({
        sessionId: crypto.randomUUID(),
        title: recordingTitle || `Untitled Session`,
        transcript: JSON.stringify(finalChunks),
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
    const finalChunks = [...sessionTranscript];
    if (transcript.trim()) {
      finalChunks.push({
        text: transcript.trim(),
        enhancedText: transcript.trim(),
        timestamp: formatTime(elapsedTime),
        isImportant: false,
        concepts: [],
      });
    }

    if (finalChunks.length === 0) {
      toast.warning("No transcript available", {
        description: "Please record something first to generate notes.",
      });
      return;
    }

    setIsGeneratingNotes(true);

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
          transcript: JSON.stringify(finalChunks),
          pinnedFileId: activeContext.id,
        });
        setGeneratedNotes(notes);
        setUsedContextName(activeContext.name);
      } else {
        // Standard generation without context
        const notes = await generateStructuredNotes({
          transcript: JSON.stringify(finalChunks),
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
          description: "Please check your AI configuration and try again.",
        });
      }
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  // Timer Ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [sessionTranscript, transcript]);

  // Handle hydration mismatch - must be first
  const [isMounted, setIsMounted] = useState(false);
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
          "Failed to start speech recognition. Please check microphone permissions."
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
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

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
        "Please upload a valid audio file (MP3, WAV, M4A, OGG, FLAC, or WebM)"
      );
      return;
    }

    // Check file size (max 20MB for inline data)
    if (file.size > 20 * 1024 * 1024) {
      alert("File size must be less than 20MB");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
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
      const uploadUrl = await generateUploadUrl();
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      const { storageId } = await uploadResponse.json();
      setUploadProgress(50);

      // Step 3: Save recording record
      const title = file.name.replace(/\.[^/.]+$/, "") || "Uploaded Recording";
      const recordingId = await saveUploadedRecording({
        title,
        storageId,
        duration,
      });
      setUploadProgress(60);

      // Step 4: Transcribe using AI (fetches audio from storage server-side)
      setIsTranscribing(true);
      setUploadProgress(70);

      const transcriptionResult = await transcribeAudio({
        storageId: storageId as Id<"_storage">,
        mimeType,
      });

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
        alert("Recording uploaded and transcribed successfully!");
      } else {
        const errorMsg = "error" in transcriptionResult ? transcriptionResult.error : "Unknown error";
        alert(`Upload successful but transcription failed: ${errorMsg}`);
      }

      setUploadProgress(100);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload recording. Please try again.");
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

  // Load a past session's transcript
  const handleLoadPastSession = (
    recording: typeof pastRecordings extends (infer T)[] | undefined ? T : never
  ) => {
    if (!recording) return;

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
    setShowPastSessions(false);
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
      className="w-[320px] h-screen bg-black/20 backdrop-blur-xl border-l border-white/5 flex flex-col shrink-0 z-50 transition-all duration-300"
      onDrop={handleNativeDrop}
      onDragOver={handleNativeDragOver}
      style={{
        boxShadow: activeContext
          ? "inset 0 0 40px rgba(59, 130, 246, 0.1)"
          : "none",
        borderColor: activeContext
          ? "rgba(59, 130, 246, 0.3)"
          : "rgba(255, 255, 255, 0.05)",
      }}
    >
      {/* Top: Recorder Section */}
      <div className="p-4 border-b border-white/5 relative overflow-hidden">
        {/* Context Deck */}
        <ContextDeck />
        
        {/* Animated gradient border when recording */}
        <div
          className={cn(
            "absolute top-0 left-0 w-full h-1 transition-all duration-500",
            listening 
              ? "bg-gradient-to-r from-red-500 via-orange-500 to-red-500 bg-[length:200%_100%] animate-gradient-x opacity-100"
              : "bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 opacity-30"
          )}
        />

        {/* Recording Status Card */}
        <div className={cn(
          "relative rounded-2xl p-4 mb-4 transition-all duration-300",
          listening 
            ? "bg-gradient-to-br from-red-500/10 via-orange-500/5 to-transparent border border-red-500/20"
            : "bg-gradient-to-br from-white/5 via-transparent to-transparent border border-white/5"
        )}>
          {/* Status Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
                listening 
                  ? "bg-red-500/20 shadow-lg shadow-red-500/20"
                  : "bg-white/5"
              )}>
                {listening ? (
                  <>
                    <Radio className="w-6 h-6 text-red-400" />
                    <div className="absolute inset-0 rounded-xl bg-red-500/20 animate-ping" />
                  </>
                ) : (
                  <Mic className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-sm font-bold tracking-wide transition-colors",
                    listening ? "text-red-400" : "text-gray-400"
                  )}>
                    {listening ? "RECORDING" : "READY"}
                  </span>
                  {listening && (
                    <span className="flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3 h-3 text-gray-500" />
                  <span className="font-mono text-lg font-bold text-white tabular-nums">
                    {formatTime(elapsedTime)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Quick Actions */}
            {(elapsedTime > 0 || sessionTranscript.length > 0) && (
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg"
                  onClick={() => handleReset(true)}
                  title="Reset Session"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Waveform Visualization - More refined */}
          <div className="h-12 flex items-center justify-center gap-[3px] mb-4 px-2">
            {Array.from({ length: 24 }).map((_, i) => {
              const baseHeight = 20 + Math.sin(i * 0.5) * 15 + Math.random() * 20;
              return (
                <motion.div
                  key={i}
                  animate={
                    listening
                      ? { 
                          scaleY: [1, 0.3 + Math.random() * 0.7, 1],
                          opacity: [0.5, 1, 0.5]
                        }
                      : { scaleY: 0.15, opacity: 0.3 }
                  }
                  transition={{
                    duration: 0.3 + Math.random() * 0.3,
                    repeat: Infinity,
                    delay: i * 0.02,
                    ease: "easeInOut",
                  }}
                  className={cn(
                    "w-1 rounded-full transition-colors origin-center",
                    listening 
                      ? "bg-gradient-to-t from-red-500 to-orange-400"
                      : "bg-gray-700"
                  )}
                  style={{ height: `${baseHeight}%` }}
                />
              );
            })}
          </div>

          {/* Main Control Button */}
          <button
            onClick={handleToggleRecording}
            className={cn(
              "w-full h-14 rounded-xl font-semibold text-base flex items-center justify-center gap-3 transition-all duration-300 active:scale-[0.98]",
              listening
                ? "bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-lg shadow-red-500/25"
                : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25"
            )}
          >
            {listening ? (
              <>
                <Pause className="w-5 h-5 fill-current" />
                <span>Pause Recording</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>Start Recording</span>
              </>
            )}
          </button>

          {/* Action Buttons Row */}
          {(elapsedTime > 0 || sessionTranscript.length > 0) && (
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Button
                variant="outline"
                className="h-10 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 hover:text-purple-200"
                onClick={handleGenerateNotes}
                disabled={isGeneratingNotes}
              >
                {isGeneratingNotes ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                AI Notes
              </Button>
              <Button
                variant="outline"
                className="h-10 border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-cyan-200"
                onClick={handleSaveClick}
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          )}
        </div>

        {/* Upload Section - Redesigned */}
        <div className="space-y-3">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Upload Card */}
          <div
            onClick={() =>
              !isUploading && !isTranscribing && fileInputRef.current?.click()
            }
            className={cn(
              "relative group cursor-pointer overflow-hidden rounded-xl transition-all duration-300",
              isUploading || isTranscribing
                ? "bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30"
                : "bg-white/[0.02] border border-dashed border-white/10 hover:border-cyan-500/50 hover:bg-white/[0.04]"
            )}
          >
            {/* Progress overlay */}
            {(isUploading || isTranscribing) && (
              <div 
                className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            )}
            
            <div className="relative p-4 flex items-center gap-4">
              <div className={cn(
                "h-12 w-12 shrink-0 rounded-xl flex items-center justify-center transition-all duration-300",
                isUploading || isTranscribing
                  ? "bg-cyan-500/20"
                  : "bg-white/5 group-hover:bg-cyan-500/10 group-hover:scale-105"
              )}>
                {isUploading || isTranscribing ? (
                  <Loader2 className="h-6 w-6 text-cyan-400 animate-spin" />
                ) : (
                  <Upload className="h-6 w-6 text-gray-400 group-hover:text-cyan-400 transition-colors" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                {isUploading || isTranscribing ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-cyan-400">
                        {isTranscribing ? "Transcribing audio..." : "Uploading file..."}
                      </p>
                      <span className="text-xs font-mono text-cyan-400">{uploadProgress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        className="h-full bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full"
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-500">
                      {isTranscribing ? "AI is processing your audio" : "Please wait..."}
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors">
                      Upload Audio File
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      MP3, WAV, M4A, OGG, FLAC • Max 20MB
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Past Sessions Section */}
          <div className="pt-1">
            <button
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200"
              onClick={() => setShowPastSessions(!showPastSessions)}
            >
              <span className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wider">
                <History className="w-4 h-4" />
                Recording History
                {pastRecordings && pastRecordings.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-[10px] font-bold">
                    {pastRecordings.length}
                  </span>
                )}
              </span>
              <motion.div
                animate={{ rotate: showPastSessions ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4" />
              </motion.div>
            </button>

            {/* Past Sessions List */}
            <AnimatePresence>
              {showPastSessions && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 max-h-52 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {pastRecordings && pastRecordings.length > 0 ? (
                      pastRecordings.map((recording) => (
                        <motion.div
                          key={recording._id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={cn(
                            "group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200",
                            selectedSession === recording._id
                              ? "bg-gradient-to-r from-cyan-500/15 to-transparent border border-cyan-500/30"
                              : "hover:bg-white/5 border border-transparent"
                          )}
                          onClick={() => handleLoadPastSession(recording)}
                        >
                          <div
                            className={cn(
                              "h-10 w-10 shrink-0 rounded-lg flex items-center justify-center transition-all duration-200",
                              selectedSession === recording._id
                                ? "bg-cyan-500/20 text-cyan-400"
                                : "bg-white/5 text-gray-500 group-hover:text-gray-300 group-hover:bg-white/10"
                            )}
                          >
                            {selectedSession === recording._id ? (
                              <Volume2 className="w-5 h-5" />
                            ) : (
                              <FileAudio className="w-5 h-5" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p
                              className={cn(
                                "text-sm font-medium truncate transition-colors",
                                selectedSession === recording._id
                                  ? "text-cyan-100"
                                  : "text-gray-300 group-hover:text-white"
                              )}
                            >
                              {recording.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-gray-500">
                                {new Date(recording.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                              {recording.duration && (
                                <>
                                  <span className="text-gray-700">•</span>
                                  <span className="text-[10px] text-gray-500">
                                    {Math.floor(recording.duration / 60)}:{String(Math.floor(recording.duration % 60)).padStart(2, '0')}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all rounded-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRecording(recording._id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </motion.div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-gray-600 gap-3">
                        <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center">
                          <History className="w-7 h-7 opacity-30" />
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-medium text-gray-500">No recordings yet</p>
                          <p className="text-[10px] text-gray-600 mt-0.5">Your saved sessions will appear here</p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Middle: Transcript Feed */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-4 py-3 flex items-center justify-between border-b border-white/5 bg-black/20">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {selectedSession ? "Session Transcript" : "Live Transcript"}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {listening && (
              <span className="flex items-center gap-1.5 text-[10px] bg-green-500/10 text-green-400 px-2 py-1 rounded-full border border-green-500/20">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                </span>
                Live
              </span>
            )}
            {isAnalyzing && (
              <span className="flex items-center gap-1.5 text-[10px] bg-purple-500/10 text-purple-400 px-2 py-1 rounded-full border border-purple-500/20">
                <Loader2 className="w-3 h-3 animate-spin" />
                Analyzing
              </span>
            )}
          </div>
        </div>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 pr-2">
            {/* Saved transcript chunks */}
            {sessionTranscript.map((chunk, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={cn(
                  "relative group rounded-xl p-3 transition-all duration-200",
                  chunk.isImportant
                    ? "bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/20"
                    : "bg-white/[0.02] hover:bg-white/[0.04] border border-transparent hover:border-white/5"
                )}
              >
                {/* Timestamp badge */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-gray-500 bg-white/5 px-2 py-0.5 rounded-md">
                      {chunk.timestamp}
                    </span>
                    {chunk.isImportant && (
                      <span className="flex items-center gap-1 text-[10px] text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-md">
                        <Pin className="w-3 h-3" />
                        Important
                      </span>
                    )}
                  </div>
                  {chunk.concepts.length > 0 && (
                    <div className="flex items-center gap-1">
                      {chunk.concepts.slice(0, 2).map((concept, i) => (
                        <span
                          key={i}
                          className="text-[9px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded"
                        >
                          {concept}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Content */}
                <div className="text-sm text-zinc-300 leading-relaxed prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {chunk.enhancedText}
                  </ReactMarkdown>
                </div>
              </motion.div>
            ))}

            {/* Current live transcript */}
            {transcript && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-full" />
                <div className="ml-4 bg-gradient-to-r from-cyan-500/10 to-transparent p-4 rounded-xl border border-cyan-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/20 px-2 py-0.5 rounded-md font-bold">
                      {formatTime(elapsedTime)}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-cyan-400">
                      <Waves className="w-3 h-3" />
                      Recording...
                    </span>
                  </div>
                  <p className="text-sm text-zinc-100 leading-relaxed">
                    {transcript}
                    <span className="inline-block w-0.5 h-4 bg-cyan-400 ml-0.5 animate-pulse" />
                  </p>
                </div>
              </motion.div>
            )}

            {/* Empty state */}
            {!transcript &&
              sessionTranscript.length === 0 &&
              !generatedNotes && (
                <div className="flex flex-col items-center justify-center pt-16 pb-8">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-white/5 to-transparent flex items-center justify-center mb-4 border border-white/5">
                      <Mic className="w-10 h-10 text-gray-600" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                    </div>
                  </div>
                  <h4 className="text-sm font-medium text-gray-400 mb-1">Ready to Record</h4>
                  <p className="text-xs text-gray-600 text-center max-w-[200px]">
                    Click the record button or upload an audio file to get started
                  </p>
                </div>
              )}

            {/* Generated Notes Display */}
            {generatedNotes && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-semibold text-purple-400">
                      AI Generated Notes
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-gray-400 hover:text-white"
                    onClick={() => setGeneratedNotes(null)}
                  >
                    Dismiss
                  </Button>
                </div>

                {/* Context Attribution */}
                {usedContextName && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="text-xs text-blue-300">
                      Generated with context:{" "}
                      <span className="font-medium text-blue-200">
                        {usedContextName}
                      </span>
                    </span>
                  </div>
                )}

                {/* Summary */}
                <div className="bg-black/20 p-3 rounded-lg border-l-2 border-purple-500">
                  <p className="text-sm text-zinc-300">
                    {generatedNotes.summary}
                  </p>
                </div>

                {/* Cornell Notes */}
                {generatedNotes.cornellCues.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">
                      Cornell Notes
                    </h4>
                    <div className="space-y-2">
                      {generatedNotes.cornellCues.map((cue, i) => (
                        <div
                          key={i}
                          className="grid grid-cols-[100px_1fr] gap-2 text-sm"
                        >
                          <span className="text-purple-300 font-medium">
                            {cue}
                          </span>
                          <span className="text-zinc-400">
                            {generatedNotes.cornellNotes[i] || ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Items */}
                {generatedNotes.actionItems.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">
                      Action Items
                    </h4>
                    <ul className="space-y-1">
                      {generatedNotes.actionItems.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-yellow-300"
                        >
                          <span>☐</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Review Questions */}
                {generatedNotes.reviewQuestions.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">
                      Review Questions
                    </h4>
                    <ul className="space-y-1">
                      {generatedNotes.reviewQuestions.map((q, i) => (
                        <li key={i} className="text-sm text-cyan-300">
                          • {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Insert to Editor Button */}
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white"
                  onClick={async () => {
                    const currentNoteId = searchParams.get("noteId");
                    
                    if (!currentNoteId && generatedNotes) {
                      // No note is open - create a new one
                      try {
                        const title = recordingTitle || usedContextName 
                          ? `Notes from ${usedContextName || recordingTitle || "Recording"}`
                          : "Generated Notes";
                        
                        const noteId = await createNote({
                          title,
                          major: userData?.major || "general",
                          style: "standard",
                        });
                        
                        // Set pending notes and navigate to the new note
                        setPendingNotes(generatedNotes);
                        setGeneratedNotes(null);
                        router.push(`/dashboard?noteId=${noteId}`);
                        toast.success("Created new note with generated content");
                      } catch (error) {
                        console.error("Failed to create note:", error);
                        toast.error("Failed to create note. Please try again.");
                      }
                    } else {
                      // Note is already open - just set pending notes
                      setPendingNotes(generatedNotes);
                      setGeneratedNotes(null);
                      toast.success("Content ready to insert");
                    }
                  }}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {searchParams.get("noteId") ? "Insert to Editor" : "Create Note"}
                </Button>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>
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
    </motion.div>
  );
}
