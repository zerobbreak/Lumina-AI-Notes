"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  pickRecorderMimeType,
  recorderContainerMime,
  type CapturedSessionAudio,
} from "@/lib/sessionAudio";

/**
 * Live microphone band levels plus a MediaRecorder capture of the same stream.
 *
 * The Web Speech API exposes no audio data, so the meter and the session
 * recording share one getUserMedia stream: an AnalyserNode for the waveform,
 * a MediaRecorder so ElevenLabs can isolate speech after the user stops.
 *
 * Levels are normalised to 0..1 and updated on every other frame — 30fps is
 * indistinguishable on bars this small and halves the React work while recording.
 */
export function useMicLevels(bandCount: number) {
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef("audio/webm");
  const generationRef = useRef(0);

  const [levels, setLevels] = useState<number[]>(() =>
    Array(bandCount).fill(0),
  );

  const stopHardware = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setLevels(Array(bandCount).fill(0));
  }, [bandCount]);

  const stop = useCallback(() => {
    generationRef.current += 1;
    const recorder = recorderRef.current;
    recorderRef.current = null;
    chunksRef.current = [];
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // Already stopped.
      }
    }
    stopHardware();
  }, [stopHardware]);

  const stopAndCollect = useCallback((): Promise<CapturedSessionAudio | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        stop();
        resolve(null);
        return;
      }

      const mimeType = recorderContainerMime(mimeTypeRef.current);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];
        recorderRef.current = null;
        stopHardware();
        resolve(blob.size > 0 ? { blob, mimeType: blob.type || mimeType } : null);
      };

      try {
        if (recorder.state === "recording") recorder.requestData();
        recorder.stop();
      } catch {
        stop();
        resolve(null);
      }
    });
  }, [stop, stopHardware]);

  const start = useCallback(async () => {
    stop();
    const generation = generationRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      if (generation !== generationRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return false;
      }
      streamRef.current = stream;

      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      await ctx.resume();

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.72;
      // Speech sits well below 0dB; this window keeps normal talking volume in
      // the meter's upper range instead of pinned near zero.
      analyser.minDecibels = -85;
      analyser.maxDecibels = -22;
      ctx.createMediaStreamSource(stream).connect(analyser);
      analyserRef.current = analyser;

      const bins = analyser.frequencyBinCount;
      const data = new Uint8Array(bins);
      const step = Math.max(1, Math.floor(bins / bandCount));
      let frame = 0;

      const tick = () => {
        const node = analyserRef.current;
        if (!node) return;

        node.getByteFrequencyData(data);
        const next: number[] = [];
        for (let i = 0; i < bandCount; i++) {
          const from = i * step;
          const to = Math.min(from + step, bins);
          let sum = 0;
          for (let j = from; j < to; j++) sum += data[j] ?? 0;
          const avg = sum / (Math.max(1, to - from) * 255);
          // Gain then gamma: lifts quiet speech without clipping loud peaks.
          next.push(Math.min(1, Math.pow(avg * 2.8, 0.62)));
        }

        frame += 1;
        if (frame % 2 === 0) setLevels(next);
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);

      const mimeType = pickRecorderMimeType();
      mimeTypeRef.current = mimeType || "audio/webm";
      chunksRef.current = [];
      try {
        const recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
        mimeTypeRef.current = recorder.mimeType || mimeTypeRef.current;
        recorder.ondataavailable = (event) => {
          if (generation !== generationRef.current) return;
          if (event.data.size > 0) chunksRef.current.push(event.data);
        };
        recorder.start(1000);
        recorderRef.current = recorder;
      } catch (e) {
        console.warn("[useMicLevels] MediaRecorder unavailable:", e);
        stopHardware();
        return false;
      }

      return true;
    } catch (e) {
      console.warn("[useMicLevels] microphone meter unavailable:", e);
      return false;
    }
  }, [bandCount, stop, stopHardware]);

  useEffect(() => stop, [stop]);

  return { levels, start, stop, stopAndCollect };
}
