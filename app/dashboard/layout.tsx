"use client";

import { Suspense, useState, useCallback, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/sidebar/Sidebar";
import { RightSidebar } from "@/components/dashboard/sidebar/RightSidebar";
import { DashboardProvider } from "@/components/dashboard/DashboardContext";
import { DocumentProcessingIndicator } from "@/components/documents";
import { DragOverlayWrapper } from "@/components/dashboard/DragOverlayWrapper";
import { CommandPalette } from "@/components/dashboard/CommandPalette";
import { KeyboardShortcutsDialog } from "@/components/dashboard/KeyboardShortcutsDialog";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { Sparkles } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSearchParams } from "next/navigation";
import { QuickCaptureFab } from "@/components/dashboard/quick-capture/QuickCaptureFab";

function DashboardLayoutLoading() {
  return (
    <div className="h-screen w-full bg-background flex items-center justify-center text-muted-foreground">
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
  const acceptPendingInvites = useMutation(
    api.collaboration.acceptPendingInvites,
  );
  const userData = useQuery(api.users.getUser);
  const searchParams = useSearchParams();
  const hideQuickCapture = Boolean(searchParams.get("noteId"));

  // Accept any pending email invites for the signed-in user.
  useEffect(() => {
    acceptPendingInvites().catch(() => {});
  }, [acceptPendingInvites]);

  // Global keyboard shortcuts
  useKeyboardShortcut(
    "cmd+p",
    useCallback(() => {
      setIsCommandPaletteOpen(true);
    }, []),
    { preventDefault: true },
  );

  useKeyboardShortcut(
    "cmd+/",
    useCallback(() => {
      setIsShortcutsOpen(true);
    }, []),
    { preventDefault: true },
  );

  return (
    <>
      <div
        className="flex h-screen w-full bg-background overflow-hidden relative"
        data-theme={userData?.theme || "indigo"}
      >
        <Sidebar />
        <main className="flex-1 h-full overflow-hidden relative z-0">
          {children}
        </main>
        <RightSidebar />
        <QuickCaptureFab hidden={hideQuickCapture} />

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
