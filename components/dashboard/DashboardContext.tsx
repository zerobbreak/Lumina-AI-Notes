"use client";

import React, { createContext, useState, ReactNode } from "react";

// Structured notes type for passing between components
export interface StructuredNotes {
  summary: string;
  cornellCues: string[];
  cornellNotes: string[];
  actionItems: string[];
  reviewQuestions: string[];
  mermaidGraph: string;
}

interface DashboardContextType {
  isLeftSidebarOpen: boolean;
  isRightSidebarOpen: boolean;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  closeAllSidebars: () => void;
  openAllSidebars: () => void;
  // Pending notes to inject into editor
  pendingNotes: StructuredNotes | null;
  setPendingNotes: (notes: StructuredNotes) => void;
  clearPendingNotes: () => void;
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
        toggleLeftSidebar,
        toggleRightSidebar,
        closeAllSidebars,
        openAllSidebars,
        pendingNotes,
        setPendingNotes,
        clearPendingNotes,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

// Re-export the hook for backward compatibility
export { useDashboard } from "@/hooks/useDashboard";
