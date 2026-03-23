"use client";

import { Suspense, useState, useCallback, useEffect, lazy } from "react";
import { Sidebar } from "@/components/dashboard/sidebar/Sidebar";
import { RightSidebar } from "@/components/dashboard/sidebar/RightSidebar";
import { DashboardProvider } from "@/components/dashboard/DashboardContext";
import { DocumentProcessingIndicator } from "@/components/documents";
import { DragOverlayWrapper } from "@/components/dashboard/DragOverlayWrapper";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { Sparkles } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSearchParams } from "next/navigation";
import { QuickCaptureFab } from "@/components/dashboard/quick-capture/QuickCaptureFab";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useDashboard } from "@/hooks/useDashboard";
import { cn } from "@/lib/utils";

const CommandPalette = lazy(() => import("@/components/dashboard/CommandPalette").then(m => ({ default: m.CommandPalette })));
const KeyboardShortcutsDialog = lazy(() => import("@/components/dashboard/KeyboardShortcutsDialog").then(m => ({ default: m.KeyboardShortcutsDialog })));

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
  const { toggleLeftSidebar, isLeftSidebarOpen, isRightSidebarOpen, toggleRightSidebar } = useDashboard();
  const [isLeftHovered, setIsLeftHovered] = useState(false);
  const [isRightHovered, setIsRightHovered] = useState(false);

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
        {/* Left Sidebar Toggle Handle (Notion-style) */}
        <div 
          className={cn(
            "fixed left-0 top-0 bottom-0 w-4 z-[60] group cursor-pointer transition-opacity duration-300",
            isLeftSidebarOpen ? "opacity-0 pointer-events-none" : "opacity-100"
          )}
          onMouseEnter={() => setIsLeftHovered(true)}
          onMouseLeave={() => setIsLeftHovered(false)}
          onClick={toggleLeftSidebar}
        >
          <div className={cn(
            "absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-24 rounded-full bg-muted-foreground/20 transition-all duration-300",
            isLeftHovered && "bg-muted-foreground/40 w-2"
          )} />
          <div className={cn(
            "absolute left-4 top-4 p-1.5 rounded-md bg-background border border-border shadow-sm opacity-0 transition-opacity duration-200",
            isLeftHovered && "opacity-100"
          )}>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        <Sidebar />
        <main className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden relative z-0">
          {/* Left Sidebar Close Handle (when open) */}
          <div 
            className={cn(
              "absolute left-0 top-0 bottom-0 w-1 z-50 group cursor-pointer transition-opacity duration-300",
              !isLeftSidebarOpen ? "opacity-0 pointer-events-none" : "opacity-100"
            )}
            onMouseEnter={() => setIsLeftHovered(true)}
            onMouseLeave={() => setIsLeftHovered(false)}
            onClick={toggleLeftSidebar}
          >
            <div className={cn(
              "absolute left-2 top-4 p-1.5 rounded-md bg-background border border-border shadow-sm opacity-0 transition-opacity duration-200",
              isLeftHovered && "opacity-100"
            )}>
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          {/* Right Sidebar Close Handle (when open) */}
          <div 
            className={cn(
              "absolute right-0 top-0 bottom-0 w-1 z-50 group cursor-pointer transition-opacity duration-300",
              !isRightSidebarOpen ? "opacity-0 pointer-events-none" : "opacity-100"
            )}
            onMouseEnter={() => setIsRightHovered(true)}
            onMouseLeave={() => setIsRightHovered(false)}
            onClick={toggleRightSidebar}
          >
            <div className={cn(
              "absolute right-2 top-4 p-1.5 rounded-md bg-background border border-border shadow-sm opacity-0 transition-opacity duration-200",
              isRightHovered && "opacity-100"
            )}>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          {/* Right Sidebar Open Handle (when closed) */}
          <div 
            className={cn(
              "fixed right-0 top-0 bottom-0 w-4 z-[60] group cursor-pointer transition-opacity duration-300",
              isRightSidebarOpen ? "opacity-0 pointer-events-none" : "opacity-100"
            )}
            onMouseEnter={() => setIsRightHovered(true)}
            onMouseLeave={() => setIsRightHovered(false)}
            onClick={toggleRightSidebar}
          >
            <div className={cn(
              "absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-24 rounded-full bg-muted-foreground/20 transition-all duration-300",
              isRightHovered && "bg-muted-foreground/40 w-2"
            )} />
            <div className={cn(
              "absolute right-4 top-4 p-1.5 rounded-md bg-background border border-border shadow-sm opacity-0 transition-opacity duration-200",
              isRightHovered && "opacity-100"
            )}>
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          {/* Mobile: opens navigation when note hub and other views have no header toggle */}
          <div className="flex md:hidden items-center h-11 shrink-0 px-2 border-b border-border bg-background/95 backdrop-blur-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleLeftSidebar}
              className={
                isLeftSidebarOpen
                  ? "text-muted-foreground"
                  : "text-foreground bg-accent"
              }
              aria-label={isLeftSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={isLeftSidebarOpen}
            >
              {isLeftSidebarOpen ? (
                <ChevronLeft className="w-5 h-5" />
              ) : (
                <ChevronRight className="w-5 h-5" />
              )}
            </Button>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {children}
          </div>
        </main>
        <RightSidebar />
        <QuickCaptureFab hidden={hideQuickCapture} />

        {/* Document Processing Indicator - shows when PDFs are being processed */}
        <DocumentProcessingIndicator />
      </div>

      {/* Command Palette - lazy loaded */}
      {isCommandPaletteOpen && (
        <Suspense fallback={null}>
          <CommandPalette
            open={isCommandPaletteOpen}
            onOpenChange={setIsCommandPaletteOpen}
          />
        </Suspense>
      )}

      {/* Keyboard Shortcuts Dialog - lazy loaded */}
      {isShortcutsOpen && (
        <Suspense fallback={null}>
          <KeyboardShortcutsDialog
            open={isShortcutsOpen}
            onOpenChange={setIsShortcutsOpen}
          />
        </Suspense>
      )}
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
