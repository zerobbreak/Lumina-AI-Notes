"use client";

import React, { createContext, useState, ReactNode } from "react";
import type { Id } from "@/convex/_generated/dataModel";

// Structured notes type for passing between components
export interface StructuredNotes {
  summary: string;
  cornellCues: string[];
  cornellNotes: string[];
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
  style?: string;
}

interface DashboardContextType {
  isLeftSidebarOpen: boolean;
  isRightSidebarOpen: boolean;
  setLeftSidebarOpen: (open: boolean) => void;
  setRightSidebarOpen: (open: boolean) => void;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  closeAllSidebars: () => void;
  openAllSidebars: () => void;
  // Pending notes to inject into editor
  pendingNotes: StructuredNotes | null;
  setPendingNotes: (notes: StructuredNotes) => void;
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
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [pendingNotes, setPendingNotesState] = useState<StructuredNotes | null>(
    null
  );
  const [activeContext, setActiveContext] = useState<PinnedContext | null>(
    null
  );
  const [noteBootstrap, setNoteBootstrap] = useState<NoteBootstrap | null>(
    null,
  );

  const setLeftSidebarOpen = (open: boolean) => setIsLeftSidebarOpen(open);
  const setRightSidebarOpen = (open: boolean) => setIsRightSidebarOpen(open);

  const toggleLeftSidebar = () => setIsLeftSidebarOpen((prev) => !prev);
  const toggleRightSidebar = () => setIsRightSidebarOpen((prev) => !prev);

  const closeAllSidebars = () => {
    setIsLeftSidebarOpen(false);
    setIsRightSidebarOpen(false);
  };

  const openAllSidebars = () => {
    setIsLeftSidebarOpen(true);
    setIsRightSidebarOpen(true);
  };

  const setPendingNotes = (notes: StructuredNotes) =>
    setPendingNotesState(notes);
  const clearPendingNotes = () => setPendingNotesState(null);

  return (
    <DashboardContext.Provider
      value={{
        isLeftSidebarOpen,
        isRightSidebarOpen,
        setLeftSidebarOpen,
        setRightSidebarOpen,
        toggleLeftSidebar,
        toggleRightSidebar,
        closeAllSidebars,
        openAllSidebars,
        pendingNotes,
        setPendingNotes,
        clearPendingNotes,
        activeContext,
        setActiveContext,
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
