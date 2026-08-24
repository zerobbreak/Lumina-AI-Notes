"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Live microphone band levels for waveform UI.
 *
 * The Web Speech API exposes no audio data, so the meter runs a parallel
 * getUserMedia stream through an AnalyserNode. Levels are normalised to 0..1
 * and updated on every other frame — 30fps is indistinguishable on bars this
 * small and halves the React work while recording.
 */
export function useMicLevels(bandCount: number) {
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const [levels, setLevels] = useState<number[]>(() =>
    Array(bandCount).fill(0),
  );

  const stop = useCallback(() => {
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

  const start = useCallback(async () => {
    stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
      return true;
    } catch (e) {
      console.warn("[useMicLevels] microphone meter unavailable:", e);
      return false;
    }
  }, [bandCount, stop]);

  useEffect(() => stop, [stop]);

  return { levels, start, stop };
}
