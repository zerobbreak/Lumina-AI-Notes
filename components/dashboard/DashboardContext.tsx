"use client";

import React, { createContext, useState, ReactNode } from "react";
import type { Id } from "@/types/data-model";
import {
  MAX_REFERENCE_URLS,
  normalizeReferenceUrlList,
} from "@/lib/shared/urlContent";

export interface PinnedContext {
  id: string;
  name: string;
  type: "file" | "note";
}

/** Shown in NoteView while Convex getNote subscription catches up after createNote */
export interface NoteBootstrap {
  noteId: Id<"notes">;
  title: string;
  courseId?: string;
  moduleId?: string;
  parentNoteId?: Id<"notes">;
  style?: string;
}

export type SidebarState = "open" | "compact" | "closed";

/** A saved recording handed from the sidebar's Sessions list to the pill. */
export interface LoadedSession {
  recordingId: Id<"recordings">;
  title: string;
  /** Flattened plain-text transcript, ready to generate from. */
  transcript: string;
  /** Saved length in seconds, shown on the pill's clock. */
  duration?: number | null;
}

export { MAX_REFERENCE_URLS };

interface DashboardContextType {
  leftSidebarState: SidebarState;
  /** True when the left sidebar is visible (open or compact, not fully closed). */
  isLeftSidebarOpen: boolean;
  setLeftSidebarState: (state: SidebarState) => void;
  toggleLeftSidebar: () => void;
  /** Swap between the full panel and the icon rail, never fully hiding it. */
  toggleLeftSidebarRail: () => void;
  // Document pinned as extra context for note generation
  activeContext: PinnedContext | null;
  setActiveContext: (context: PinnedContext | null) => void;
  /** Public pages fetched server-side and merged into the generation prompt. */
  referenceUrls: string[];
  addReferenceUrls: (raw: string) => { added: number; rejected: string[] };
  removeReferenceUrl: (url: string) => void;
  /** Sidebar → pill handoff for replaying a saved session. */
  sessionToLoad: LoadedSession | null;
  loadSession: (session: LoadedSession) => void;
  clearLoadedSession: () => void;
  noteBootstrap: NoteBootstrap | null;
  setNoteBootstrap: (b: NoteBootstrap | null) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(
  undefined
);

// Export the context for the hook
export { DashboardContext };

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [leftSidebarState, setLeftSidebarState] = useState<SidebarState>("open");
  const [activeContext, setActiveContext] = useState<PinnedContext | null>(
    null
  );
  const [referenceUrls, setReferenceUrls] = useState<string[]>([]);
  const [sessionToLoad, setSessionToLoad] = useState<LoadedSession | null>(null);
  const [noteBootstrap, setNoteBootstrap] = useState<NoteBootstrap | null>(
    null,
  );

  const toggleLeftSidebar = () => {
    setLeftSidebarState((prev) => (prev === "closed" ? "open" : "closed"));
  };

  const toggleLeftSidebarRail = () => {
    setLeftSidebarState((prev) => (prev === "compact" ? "open" : "compact"));
  };

  /**
   * Accepts whitespace/comma separated input so a pasted list lands in one go.
   *
   * Validation is delegated to the same normalizer the server uses before
   * fetching these pages, so a link the UI accepts is one the backend will
   * actually follow — and private/loopback hosts are rejected here too rather
   * than being silently dropped later.
   */
  const addReferenceUrls = (raw: string) => {
    const tokens = raw.split(/[\s,]+/).filter(Boolean);
    const rejected = tokens.filter(
      (t) => normalizeReferenceUrlList([t]).length === 0,
    );

    let added = 0;
    setReferenceUrls((prev) => {
      const next = normalizeReferenceUrlList([...prev, ...tokens]);
      added = Math.max(0, next.length - prev.length);
      return next;
    });

    return { added, rejected };
  };

  const removeReferenceUrl = (url: string) =>
    setReferenceUrls((prev) => prev.filter((u) => u !== url));

  const isLeftSidebarOpen = leftSidebarState !== "closed";

  return (
    <DashboardContext.Provider
      value={{
        leftSidebarState,
        isLeftSidebarOpen,
        setLeftSidebarState,
        toggleLeftSidebar,
        toggleLeftSidebarRail,
        activeContext,
        setActiveContext,
        referenceUrls,
        addReferenceUrls,
        removeReferenceUrl,
        sessionToLoad,
        loadSession: setSessionToLoad,
        clearLoadedSession: () => setSessionToLoad(null),
        noteBootstrap,
        setNoteBootstrap,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

// Re-export the hook for backward compatibility
export { useDashboard } from "@/hooks/useDashboard";
