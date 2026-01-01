"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
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
  ChevronUp,
  History,
  Trash2,
  FileAudio,
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Get dashboard context for pending notes and active context
  const { setPendingNotes, activeContext, setActiveContext } = useDashboard();
  const generateFromPinnedAudio = useAction(api.notes.generateFromPinnedAudio); // New Phase 2 Action

  // Phase 4: Magnetic Drop Zone Logic
  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: any[], event: any) => {
      // Check for Sidebar drag data
      const resourceId = event.dataTransfer?.getData(
        "application/lumina-resource-id"
      );
      const resourceName = event.dataTransfer?.getData(
        "application/lumina-resource-name"
      );

      if (resourceId && resourceName) {
        setActiveContext({ id: resourceId, name: resourceName, type: "file" });
      }
    },
    [setActiveContext]
  );

  const { getRootProps: getZoneProps, isDragActive: isZoneActive } =
    useDropzone({
      onDrop,
      noClick: true,
      noKeyboard: true,
      onDragEnter: () => {}, // prevent default
      onDragOver: (e) => {
        e.preventDefault();
        // Critical for drop effects
        e.dataTransfer.dropEffect = "copy";
      },
      // We need to allow all types for the drop zone to be "magnetic" for the handled types
      // But typically useDropzone handles files. For custom data transfer, we might need custom handlers on the div.
      // Actually `useDropzone` is mainly for Files. For our sidebar drag, we use native onDrop.
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
  const handleReset = () => {
    setIsRecording(false);
    setElapsedTime(0);
    resetTranscript();
    setSessionTranscript([]);
    setGeneratedNotes(null);
    setSelectedSession(null);
  };

  const handleSaveClick = () => {
    // 1. Validate content
    const currentText = transcript.trim();
    const hasExistingChunks = sessionTranscript.length > 0;

    if (!currentText && !hasExistingChunks) {
      alert(
        "Cannot save empty recording. Please speak to record something first."
      );
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

      handleReset();
      setIsSaveModalOpen(false);
      // Optional: Toast success here
    } catch (e) {
      console.error("Failed to save transcript", e);
      alert("Failed to save session. Please try again.");
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
      alert(
        "No transcript to generate notes from. Please record something first."
      );
      return;
    }

    setIsGeneratingNotes(true);
    try {
      if (activeContext && activeContext.type === "file") {
        // Generate notes with pinned document context
        const notes = await generateFromPinnedAudio({
          transcript: JSON.stringify(finalChunks),
          pinnedFileId: activeContext.id,
        });
        setGeneratedNotes(notes);
      } else {
        // Standard generation without context
        const notes = await generateStructuredNotes({
          transcript: JSON.stringify(finalChunks),
          title: recordingTitle || "Recording",
        });
        setGeneratedNotes(notes);
      }
    } catch (e) {
      console.error("Failed to generate notes", e);
      alert("Failed to generate notes. Please check AI configuration.");
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
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64Data = btoa(binary);
      setUploadProgress(25);

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

      // Step 4: Transcribe using AI (with base64 data)
      setIsTranscribing(true);
      setUploadProgress(70);

      const transcriptionResult = await transcribeAudio({
        audioBase64: base64Data,
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
        const errorMsg = (transcriptionResult as any).error || "Unknown error";
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

  // Generate notes from a past session
  const handleGenerateNotesFromSession = async () => {
    if (sessionTranscript.length === 0) {
      alert("No transcript loaded. Please load a past session first.");
      return;
    }

    setIsGeneratingNotes(true);
    try {
      const notes = await generateStructuredNotes({
        transcript: JSON.stringify(sessionTranscript),
        title: "Past Recording",
      });
      setGeneratedNotes(notes);
    } catch (e) {
      console.error("Failed to generate notes", e);
      alert("Failed to generate notes. Please try again.");
    } finally {
      setIsGeneratingNotes(false);
    }
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
      <div className="p-6 border-b border-white/5 relative overflow-hidden">
        {/* Context Deck */}
        <ContextDeck />
        {/* Glow Effect */}
        <div
          className={cn(
            "absolute top-0 left-0 w-full h-1 bg-linear-to-r from-cyan-500 via-indigo-500 to-purple-500 opacity-50 transition-all duration-300",
            isZoneActive && "h-full opacity-20" // Blue glow when dragging
          )}
        />

        {/* Native Drop Zone Overlay for Sidebar */}
        <div
          className={cn(
            "absolute inset-0 z-10 transition-colors pointer-events-none"
            // We use a separate state or just rely on CSS hover if we had a drag-over state tracked.
            // Since we use native events on the parent, let's add the handlers to the parent div.
          )}
        />

        <div className="flex items-center justify-between mb-6 relative z-20">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div
                className={cn(
                  "w-2.5 h-2.5 rounded-full z-10 relative transition-colors",
                  listening ? "bg-red-500" : "bg-gray-500"
                )}
              />
              {listening && (
                <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />
              )}
            </div>
            <span
              className={cn(
                "text-sm font-medium tracking-wide transition-colors",
                listening ? "text-white" : "text-gray-500"
              )}
            >
              {listening ? "REC" : "READY"}
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-sm text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTime(elapsedTime)}</span>
          </div>
        </div>

        {/* Waveform Visualization */}
        <div className="h-16 flex items-end justify-between gap-1 mb-6 opacity-80">
          {[40, 70, 30, 80, 50, 90, 30, 60, 40, 70, 50, 80, 40, 60, 30].map(
            (h, i) => (
              <motion.div
                key={i}
                animate={
                  listening
                    ? { height: [h + "%", h * 0.5 + "%", h + "%"] }
                    : { height: "20%" }
                }
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  delay: i * 0.05,
                  ease: "easeInOut",
                  repeatType: "reverse",
                }}
                className={cn(
                  "w-3 rounded-full opacity-60 transition-colors",
                  listening ? "bg-indigo-500" : "bg-gray-700"
                )}
                style={{ height: listening ? `${h}%` : "20%" }}
              />
            )
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className={cn(
              "flex-1 border-white/10 text-white transition-all",
              listening
                ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20"
                : "bg-white/5 hover:bg-white/10"
            )}
            onClick={handleToggleRecording}
          >
            {isRecording ? (
              <Pause className="w-4 h-4 mr-2 fill-current" />
            ) : (
              <Play className="w-4 h-4 mr-2 fill-current" />
            )}
            {isRecording ? "Pause" : "Start"}
          </Button>

          {(elapsedTime > 0 || sessionTranscript.length > 0) && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="text-gray-400 hover:text-white"
                onClick={handleReset}
                title="Reset"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                onClick={handleGenerateNotes}
                disabled={isGeneratingNotes}
                title="Generate AI Notes"
              >
                {isGeneratingNotes ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                onClick={handleSaveClick}
                title="Save Session"
              >
                <Save className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>

        {/* Upload Section */}
        <div className="mt-4 space-y-3">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Improved Upload Area */}
          <div
            onClick={() =>
              !isUploading && !isTranscribing && fileInputRef.current?.click()
            }
            className={cn(
              "relative group cursor-pointer overflow-hidden rounded-xl border border-dashed border-white/10 bg-white/5 p-4 transition-all hover:border-cyan-500/50 hover:bg-white/10 active:scale-[0.99]",
              (isUploading || isTranscribing) &&
                "pointer-events-none opacity-80 border-cyan-500/20"
            )}
          >
            <div className="flex items-center gap-4">
              {isUploading || isTranscribing ? (
                <div className="relative h-10 w-10 shrink-0 flex items-center justify-center rounded-full bg-cyan-500/10">
                  <Loader2 className="h-5 w-5 text-cyan-400 animate-spin" />
                </div>
              ) : (
                <div className="h-10 w-10 shrink-0 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-cyan-500/10 group-hover:scale-105 transition-all duration-300">
                  <Upload className="h-5 w-5 text-gray-400 group-hover:text-cyan-400 transition-colors" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                {isUploading || isTranscribing ? (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-cyan-400">
                      {isTranscribing ? "Transcribing..." : "Uploading..."}
                    </p>
                    <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        className="h-full bg-cyan-400"
                        transition={{ duration: 0.2 }}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
                      Upload Session
                    </p>
                    <p className="text-[10px] text-gray-500 truncate">
                      Support for MP3, WAV, M4A
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Past Sessions Toggle */}
          <div className="pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between text-gray-500 hover:text-white hover:bg-white/5 font-medium text-xs uppercase tracking-wider h-8 px-2 mb-1"
              onClick={() => setShowPastSessions(!showPastSessions)}
            >
              <span className="flex items-center gap-2">
                <History className="w-3.5 h-3.5" />
                History ({pastRecordings?.length || 0})
              </span>
              {showPastSessions ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </Button>

            {/* Past Sessions List */}
            <AnimatePresence>
              {showPastSessions && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {pastRecordings && pastRecordings.length > 0 ? (
                      pastRecordings.map((recording) => (
                        <div
                          key={recording._id}
                          className={cn(
                            "group relative flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all duration-200",
                            selectedSession === recording._id
                              ? "bg-linear-to-r from-cyan-500/10 to-transparent border-l-2 border-cyan-500"
                              : "hover:bg-white/5 border-l-2 border-transparent hover:border-white/10"
                          )}
                          onClick={() => handleLoadPastSession(recording)}
                        >
                          <div
                            className={cn(
                              "h-8 w-8 shrink-0 rounded-md flex items-center justify-center transition-colors",
                              selectedSession === recording._id
                                ? "bg-cyan-500/20 text-cyan-400"
                                : "bg-white/5 text-gray-500 group-hover:text-gray-300"
                            )}
                          >
                            <FileAudio className="w-4 h-4" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p
                              className={cn(
                                "text-sm truncate transition-colors",
                                selectedSession === recording._id
                                  ? "text-cyan-100 font-medium"
                                  : "text-gray-300 group-hover:text-white"
                              )}
                            >
                              {recording.title}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-gray-600">
                              <span>
                                {new Date(
                                  recording.createdAt
                                ).toLocaleDateString()}
                              </span>
                              {recording.duration && (
                                <span>
                                  • {Math.floor(recording.duration / 60)}m
                                </span>
                              )}
                            </div>
                          </div>

                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all absolute right-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRecording(recording._id);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-gray-600 gap-2">
                        <History className="w-8 h-8 opacity-20" />
                        <p className="text-xs">No recording history</p>
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
        <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase">
            {selectedSession ? "Loaded Transcript" : "Live Transcript"}
          </h3>
          {listening && (
            <span className="text-[10px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded border border-green-500/20 animate-pulse">
              Listening...
            </span>
          )}
        </div>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-6 pr-2">
            {/* Saved transcript chunks */}
            {sessionTranscript.map((chunk, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex gap-4 group",
                  chunk.isImportant &&
                    "bg-yellow-500/5 -mx-2 px-2 py-2 rounded-lg border border-yellow-500/20"
                )}
              >
                <div className="w-10 shrink-0 flex flex-col items-end gap-1 pt-1">
                  <span className="text-[10px] text-zinc-500 font-mono opacity-50 group-hover:opacity-100 transition-opacity">
                    {chunk.timestamp}
                  </span>
                  {chunk.isImportant && (
                    <Pin className="w-3 h-3 text-yellow-500" />
                  )}
                </div>
                <div className="flex-1 text-sm text-zinc-400 leading-relaxed prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {chunk.enhancedText}
                  </ReactMarkdown>
                </div>
              </div>
            ))}

            {/* Current live transcript */}
            {transcript && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-4"
              >
                <span className="w-10 text-[10px] text-cyan-400 font-mono pt-1 text-right shrink-0 font-bold">
                  {formatTime(elapsedTime)}
                </span>
                <div className="flex-1">
                  <div className="bg-cyan-500/10 border-l-2 border-cyan-400 p-3 rounded-r-lg">
                    <p className="text-sm text-zinc-100 leading-relaxed font-medium">
                      {transcript}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Empty state */}
            {!transcript &&
              sessionTranscript.length === 0 &&
              !generatedNotes && (
                <div className="flex flex-col items-center justify-center pt-20 opacity-30">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <Mic className="w-8 h-8" />
                  </div>
                  <p className="text-xs font-mono">Ready to transcribe</p>
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
                  onClick={() => {
                    setPendingNotes(generatedNotes);
                    setGeneratedNotes(null);
                  }}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Insert to Editor
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
