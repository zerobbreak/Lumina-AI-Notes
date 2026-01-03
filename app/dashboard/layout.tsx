"use client";

import { Suspense, useState, useCallback } from "react";
import { Sidebar } from "@/components/dashboard/sidebar/Sidebar";
import { RightSidebar } from "@/components/dashboard/sidebar/RightSidebar";
import { DashboardProvider } from "@/components/dashboard/DashboardContext";
import { DocumentProcessingIndicator } from "@/components/documents";
import { DragOverlayWrapper } from "@/components/dashboard/DragOverlayWrapper";
import { CommandPalette } from "@/components/dashboard/CommandPalette";
import { KeyboardShortcutsDialog } from "@/components/dashboard/KeyboardShortcutsDialog";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { Sparkles } from "lucide-react";

function DashboardLayoutLoading() {
  return (
    <div className="h-screen w-full bg-linear-to-br from-[#050505] to-[#101015] flex items-center justify-center text-gray-500">
      <div className="flex items-center gap-2 animate-pulse">
        <Sparkles className="w-5 h-5" />
        <span>Loading Workspace...</span>
      </div>
    </div>
  );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Global keyboard shortcuts
  useKeyboardShortcut(
    "cmd+p",
    useCallback(() => {
      setIsCommandPaletteOpen(true);
    }, []),
    { preventDefault: true }
  );

  useKeyboardShortcut(
    "cmd+/",
    useCallback(() => {
      setIsShortcutsOpen(true);
    }, []),
    { preventDefault: true }
  );

  return (
    <>
      <div className="flex h-screen w-full bg-linear-to-br from-[#050505] to-[#101015] overflow-hidden relative">
        <Sidebar />
        <main className="flex-1 h-full overflow-hidden relative z-0">
          {children}
        </main>
        <RightSidebar />

        {/* Document Processing Indicator - shows when PDFs are being processed */}
        <DocumentProcessingIndicator />
      </div>

      {/* Command Palette */}
      <CommandPalette
        open={isCommandPaletteOpen}
        onOpenChange={setIsCommandPaletteOpen}
      />

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog
        open={isShortcutsOpen}
        onOpenChange={setIsShortcutsOpen}
      />
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<DashboardLayoutLoading />}>
      <DashboardProvider>
        <DragOverlayWrapper>
          <DashboardLayoutContent>{children}</DashboardLayoutContent>
        </DragOverlayWrapper>
      </DashboardProvider>
    </Suspense>
  );
}
