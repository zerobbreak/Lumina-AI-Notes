"use client";

import { useState, useRef, useCallback } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { StreamingNotesState, CodeBlock } from "@/types/streaming";
import { INITIAL_STREAMING_STATE } from "@/types/streaming";

/** Characters revealed per animation frame */
const CHARS_PER_TICK = 3;
/** Milliseconds between animation frames */
const TICK_INTERVAL_MS = 5;

/**
 * Hook for streaming-style notes generation.
 *
 * Calls the backend `generateNotesStreamingText` action (which uses
 * generateContentStream internally) and then animates the result
 * character-by-character on the frontend for a typing effect.
 */
export function useNotesStream() {
  const [state, setState] = useState<StreamingNotesState>(
    INITIAL_STREAMING_STATE,
  );

  const animationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  const generateNotesStreamingText = useAction(
    api.ai.generateNotesStreamingText,
  );

  /** Stop any in-progress animation */
  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      clearInterval(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  /**
   * Animate revealing the full text character-by-character.
   * Resolves when animation completes or is cancelled.
   */
  const animateText = useCallback(
    (fullText: string): Promise<void> => {
      return new Promise((resolve) => {
        let charIndex = 0;

        setState((prev) => ({
          ...prev,
          phase: "animating",
          progress: 60,
          fullContent: fullText,
        }));

        animationRef.current = setInterval(() => {
          if (cancelledRef.current) {
            stopAnimation();
            resolve();
            return;
          }

          charIndex = Math.min(charIndex + CHARS_PER_TICK, fullText.length);
          const progress = 60 + (charIndex / fullText.length) * 40; // 60-100%

          setState((prev) => ({
            ...prev,
            content: fullText.slice(0, charIndex),
            progress: Math.min(progress, 100),
          }));

          if (charIndex >= fullText.length) {
            stopAnimation();
            setState((prev) => ({
              ...prev,
              phase: "complete",
              isStreaming: false,
              progress: 100,
              content: fullText,
            }));
            resolve();
          }
        }, TICK_INTERVAL_MS);
      });
    },
    [stopAnimation],
  );

  /**
   * Start generating and animating notes.
   */
  const startGeneration = useCallback(
    async (args: {
      transcript: string;
      title?: string;
      codeBlocks?: CodeBlock[];
    }) => {
      cancelledRef.current = false;
      stopAnimation();

      setState({
        isStreaming: true,
        content: "",
        fullContent: "",
        progress: 5,
        phase: "generating",
      });

      try {
        // Phase 1: Call backend (progress 5-55%)
        const progressInterval = setInterval(() => {
          setState((prev) => {
            if (prev.phase !== "generating") return prev;
            return {
              ...prev,
              progress: Math.min(prev.progress + 2, 55),
            };
          });
        }, 500);

        const fullText = await generateNotesStreamingText({
          transcript: args.transcript,
          title: args.title,
          codeBlocks: args.codeBlocks
            ? JSON.stringify(args.codeBlocks)
            : undefined,
        });

        clearInterval(progressInterval);

        if (cancelledRef.current) return;

        if (!fullText || fullText.trim().length === 0) {
          throw new Error("AI returned empty notes");
        }

        // Phase 2: Animate the text reveal (progress 60-100%)
        await animateText(fullText);
      } catch (error) {
        if (cancelledRef.current) return;

        const message =
          error instanceof Error ? error.message : "Failed to generate notes";
        setState({
          isStreaming: false,
          content: "",
          fullContent: "",
          progress: 0,
          phase: "error",
          error: message,
        });
      }
    },
    [generateNotesStreamingText, animateText, stopAnimation],
  );

  /** Cancel generation or animation */
  const cancel = useCallback(() => {
    cancelledRef.current = true;
    stopAnimation();
    setState((prev) => ({
      ...prev,
      isStreaming: false,
      phase: prev.content ? "complete" : "idle",
    }));
  }, [stopAnimation]);

  /** Reset to initial state */
  const reset = useCallback(() => {
    cancelledRef.current = true;
    stopAnimation();
    setState(INITIAL_STREAMING_STATE);
  }, [stopAnimation]);

  /** Skip animation and show full text immediately */
  const skipAnimation = useCallback(() => {
    stopAnimation();
    setState((prev) => {
      if (!prev.fullContent) return prev;
      return {
        ...prev,
        content: prev.fullContent,
        phase: "complete",
        isStreaming: false,
        progress: 100,
      };
    });
  }, [stopAnimation]);

  return {
    state,
    startGeneration,
    cancel,
    reset,
    skipAnimation,
  };
}
