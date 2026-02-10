"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

interface QuickCaptureFabProps {
  hidden?: boolean;
}

const MAX_VOICE_SECONDS = 120;
const MAX_TEXT_CHARS = 500;

export function QuickCaptureFab({ hidden }: QuickCaptureFabProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [textOpen, setTextOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const createNote = useMutation(api.notes.createNote);
  const generateUploadUrl = useMutation(api.recordings.generateUploadUrl);
  const transcribeAudio = useAction(api.ai.transcribeAudio);

  const resetRecording = useCallback(() => {
    setRecording(false);
    setElapsed(0);
    chunksRef.current = [];
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev + 1 >= MAX_VOICE_SECONDS) {
            stopRecording();
          }
          return prev + 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setRecording(true);
    } catch (e) {
      toast.error("Microphone access required to record");
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    setRecording(false);
  };

  const handleSaveText = async () => {
    if (!text.trim()) return;
    const title = text.trim().split(" ").slice(0, 6).join(" ") || "Quick Capture";
    await createNote({
      title,
      noteType: "quick",
      content: text.trim(),
      quickCaptureType: "text",
      quickCaptureStatus: "draft",
    });
    toast.success("Quick capture saved");
    setText("");
    setTextOpen(false);
  };

  const handleSaveVoice = async () => {
    if (chunksRef.current.length === 0) {
      toast.error("No audio recorded");
      return;
    }
    setIsTranscribing(true);
    try {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const uploadUrl = await generateUploadUrl();
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "audio/webm" },
        body: blob,
      });
      if (!uploadResponse.ok) throw new Error("Upload failed");
      const { storageId } = await uploadResponse.json();
      const transcription = await transcribeAudio({
        storageId,
        mimeType: "audio/webm",
      });
      const transcript = transcription.success ? transcription.transcript : "";
      const title = transcript.trim().split(" ").slice(0, 6).join(" ") || "Voice Capture";

      await createNote({
        title,
        noteType: "quick",
        content: transcript,
        quickCaptureType: "voice",
        quickCaptureAudioUrl: String(storageId),
        quickCaptureStatus: "draft",
      });

      toast.success("Voice capture saved");
      setVoiceOpen(false);
      resetRecording();
    } catch (e) {
      console.error(e);
      toast.error("Failed to save voice capture");
    } finally {
      setIsTranscribing(false);
    }
  };

  if (hidden) return null;

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative">
          {isExpanded && (
            <div className="absolute bottom-16 right-0 flex flex-col gap-2">
              <Button
                className="rounded-full bg-cyan-500/90 hover:bg-cyan-500 text-white shadow-lg w-14 h-14"
                onClick={() => {
                  setTextOpen(true);
                  setIsExpanded(false);
                }}
                title="Text capture"
              >
                <Pencil className="w-5 h-5" />
              </Button>
              <Button
                className="rounded-full bg-rose-500/90 hover:bg-rose-500 text-white shadow-lg w-14 h-14"
                onClick={() => {
                  setVoiceOpen(true);
                  setIsExpanded(false);
                }}
                title="Voice capture"
              >
                <Mic className="w-5 h-5" />
              </Button>
            </div>
          )}
          <Button
            className="rounded-full w-16 h-16 bg-black/70 border border-white/10 hover:bg-black text-white shadow-xl"
            onClick={() => setIsExpanded((v) => !v)}
            title="Quick capture"
          >
            <Mic className="w-5 h-5 mr-1" />
            <Pencil className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <Dialog open={textOpen} onOpenChange={setTextOpen}>
        <DialogContent className="sm:max-w-md bg-[#0B0B0B] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Quick Text Capture</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <textarea
              className="w-full min-h-[140px] bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-cyan-500"
              placeholder="Quick thought..."
              value={text}
              onChange={(e) => {
                const value = e.target.value.slice(0, MAX_TEXT_CHARS);
                setText(value);
              }}
            />
            <div className="text-xs text-gray-500 text-right">
              {text.length} / {MAX_TEXT_CHARS}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="text-gray-400" onClick={() => setTextOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-cyan-500 hover:bg-cyan-600 text-white" onClick={handleSaveText}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={voiceOpen} onOpenChange={(open) => {
        if (!open && recording) stopRecording();
        setVoiceOpen(open);
      }}>
        <DialogContent className="sm:max-w-md bg-[#0B0B0B] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Quick Voice Capture</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-300">
                {recording ? "Recording..." : "Ready to record"}
              </div>
              <div className="text-xs font-mono text-gray-500">
                {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                className="bg-rose-500 hover:bg-rose-600 text-white"
                onClick={recording ? stopRecording : startRecording}
              >
                {recording ? "Stop" : "Record"}
              </Button>
              <Button
                variant="ghost"
                className="text-gray-400"
                onClick={() => {
                  resetRecording();
                }}
              >
                Reset
              </Button>
            </div>
            <div className="text-xs text-gray-500">
              Max 2 minutes. Recording stops automatically.
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="text-gray-400" onClick={() => setVoiceOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
              onClick={handleSaveVoice}
              disabled={isTranscribing}
            >
              {isTranscribing ? "Transcribing..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
