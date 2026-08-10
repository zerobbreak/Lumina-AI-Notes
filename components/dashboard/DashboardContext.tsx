"use client";

import React, {
  createContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import type { Id } from "@/convex/_generated/dataModel";

// Section type for Notion-like note structure
export interface NoteSection {
  id: string;
  type: "heading" | "paragraph" | "bullets" | "numbered" | "quote" | "divider";
  content: string;
  level?: number; // For headings: 1, 2, 3
}

// Structured notes type for passing between components
export interface StructuredNotes {
  summary: string;
  sections: NoteSection[];
  actionItems: string[];
  reviewQuestions: string[];
  diagramData?: {
    nodes: any[];
    edges: any[];
  };
}

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

interface DashboardContextType {
  leftSidebarState: SidebarState;
  /** True when the left sidebar is visible (open or compact, not fully closed). */
  isLeftSidebarOpen: boolean;
  rightSidebarState: SidebarState;
  /** True when the right sidebar is visible (open or compact, not fully closed). */
  isRightSidebarOpen: boolean;
  setLeftSidebarState: (state: SidebarState) => void;
  setRightSidebarState: (state: SidebarState) => void;
  /** @deprecated Prefer setRightSidebarState — kept for call sites that only set open/closed. */
  setRightSidebarOpen: (open: boolean) => void;
  toggleLeftSidebar: () => void;
  cycleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  cycleRightSidebar: () => void;
  closeAllSidebars: () => void;
  openAllSidebars: () => void;
  // Pending notes to inject into editor (scoped to a specific note so other tabs/routes don't receive them)
  pendingNotes: StructuredNotes | null;
  pendingNotesTargetNoteId: Id<"notes"> | null;
  setPendingNotes: (notes: StructuredNotes, targetNoteId: Id<"notes">) => void;
  clearPendingNotes: () => void;
  // Active context for recording
  activeContext: PinnedContext | null;
  setActiveContext: (context: PinnedContext | null) => void;
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
  const [rightSidebarState, setRightSidebarState] = useState<SidebarState>("open");
  const [pendingNotes, setPendingNotesState] = useState<StructuredNotes | null>(
    null,
  );
  const [pendingNotesTargetNoteId, setPendingNotesTargetNoteId] =
    useState<Id<"notes"> | null>(null);
  const [activeContext, setActiveContext] = useState<PinnedContext | null>(
    null
  );
  const [noteBootstrap, setNoteBootstrap] = useState<NoteBootstrap | null>(
    null,
  );

  // useCallback: these only close over stable useState setters, so they can
  // stay referentially stable across renders. Combined with the useMemo'd
  // provider value below, an unrelated state change (e.g. toggling one
  // sidebar) no longer invalidates context identity for every consumer.
  const setRightSidebarOpen = useCallback(
    (open: boolean) => setRightSidebarState(open ? "open" : "closed"),
    [],
  );

  const toggleLeftSidebar = useCallback(() => {
    setLeftSidebarState((prev) => (prev === "closed" ? "open" : "closed"));
  }, []);

  const cycleLeftSidebar = useCallback(() => {
    setLeftSidebarState((prev) => {
      if (prev === "open") return "compact";
      if (prev === "compact") return "closed";
      return "open";
    });
  }, []);

  const toggleRightSidebar = useCallback(() => {
    setRightSidebarState((prev) => (prev === "closed" ? "open" : "closed"));
  }, []);

  const cycleRightSidebar = useCallback(() => {
    setRightSidebarState((prev) => {
      if (prev === "open") return "compact";
      if (prev === "compact") return "closed";
      return "open";
    });
  }, []);

  const closeAllSidebars = useCallback(() => {
    setLeftSidebarState("closed");
    setRightSidebarState("closed");
  }, []);

  const openAllSidebars = useCallback(() => {
    setLeftSidebarState("open");
    setRightSidebarState("open");
  }, []);

  const setPendingNotes = useCallback(
    (notes: StructuredNotes, targetNoteId: Id<"notes">) => {
      setPendingNotesState(notes);
      setPendingNotesTargetNoteId(targetNoteId);
    },
    [],
  );
  const clearPendingNotes = useCallback(() => {
    setPendingNotesState(null);
    setPendingNotesTargetNoteId(null);
  }, []);

  const isLeftSidebarOpen = leftSidebarState !== "closed";
  const isRightSidebarOpen = rightSidebarState !== "closed";

  const value = useMemo<DashboardContextType>(
    () => ({
      leftSidebarState,
      isLeftSidebarOpen,
      rightSidebarState,
      isRightSidebarOpen,
      setLeftSidebarState,
      setRightSidebarState,
      setRightSidebarOpen,
      toggleLeftSidebar,
      cycleLeftSidebar,
      toggleRightSidebar,
      cycleRightSidebar,
      closeAllSidebars,
      openAllSidebars,
      pendingNotes,
      pendingNotesTargetNoteId,
      setPendingNotes,
      clearPendingNotes,
      activeContext,
      setActiveContext,
      noteBootstrap,
      setNoteBootstrap,
    }),
    [
      leftSidebarState,
      isLeftSidebarOpen,
      rightSidebarState,
      isRightSidebarOpen,
      setRightSidebarOpen,
      toggleLeftSidebar,
      cycleLeftSidebar,
      toggleRightSidebar,
      cycleRightSidebar,
      closeAllSidebars,
      openAllSidebars,
      pendingNotes,
      pendingNotesTargetNoteId,
      setPendingNotes,
      clearPendingNotes,
      activeContext,
      noteBootstrap,
    ],
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

// Re-export the hook for backward compatibility
export { useDashboard } from "@/hooks/useDashboard";
