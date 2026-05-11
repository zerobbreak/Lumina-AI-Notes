"use client";

import { Suspense, useState, useCallback, useEffect, lazy } from "react";
import dynamic from "next/dynamic";
import { DashboardProvider } from "@/components/dashboard/DashboardContext";
import { DragOverlayWrapper } from "@/components/dashboard/DragOverlayWrapper";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { Sparkles } from "lucide-react";
import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useDashboard } from "@/hooks/useDashboard";
import { cn } from "@/lib/utils";

const CommandPalette = lazy(() => import("@/components/dashboard/CommandPalette").then(m => ({ default: m.CommandPalette })));
const KeyboardShortcutsDialog = lazy(() => import("@/components/dashboard/KeyboardShortcutsDialog").then(m => ({ default: m.KeyboardShortcutsDialog })));

const Sidebar = dynamic(
  () =>
    import("@/components/dashboard/sidebar/Sidebar").then((m) => ({
      default: m.Sidebar,
    })),
  { ssr: false, loading: () => null },
);

const RightSidebar = dynamic(
  () =>
    import("@/components/dashboard/sidebar/RightSidebar").then((m) => ({
      default: m.RightSidebar,
    })),
  { ssr: false, loading: () => null },
);

const DocumentProcessingIndicatorLazy = dynamic(
  () =>
    import("@/components/documents").then((m) => ({
      default: m.DocumentProcessingIndicator,
    })),
  { ssr: false, loading: () => null },
);

const QuickCaptureFabLazy = dynamic(
  () =>
    import("@/components/dashboard/quick-capture/QuickCaptureFab").then((m) => ({
      default: m.QuickCaptureFab,
    })),
  { ssr: false, loading: () => null },
);

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
  const [mountHeavyPanels, setMountHeavyPanels] = useState(false);
  const acceptPendingInvites = useMutation(
    api.collaboration.acceptPendingInvites,
  );
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const userData = useQuery(api.users.getUser);
  const router = useRouter();
  const searchParams = useSearchParams();
  const hideQuickCapture = Boolean(searchParams.get("noteId"));
  const { toggleLeftSidebar, isLeftSidebarOpen, isRightSidebarOpen, toggleRightSidebar } = useDashboard();
  const [isLeftHovered, setIsLeftHovered] = useState(false);
  const [isRightHovered, setIsRightHovered] = useState(false);

  // Route guard for onboarding (kept in layout so dashboard page doesn't block on this query).
  useEffect(() => {
    if (!isAuthenticated) return;
    if (userData === undefined) return;
    if (userData === null || !userData.onboardingComplete) {
      router.replace("/onboarding");
    }
  }, [isAuthenticated, router, userData]);

  // Defer mounting heavy panels (sidebars, indicators) until after initial paint.
  useEffect(() => {
    let cancelled = false;
    const w = window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    const mount = () => {
      if (!cancelled) setMountHeavyPanels(true);
    };

    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(mount, { timeout: 1200 });
      return () => {
        cancelled = true;
        w.cancelIdleCallback?.(id);
      };
    }

    const t = window.setTimeout(mount, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, []);

  // Accept any pending email invites for the signed-in user (after Convex auth is ready).
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    acceptPendingInvites().catch(() => {});
  }, [acceptPendingInvites, authLoading, isAuthenticated]);

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
            "fixed left-0 top-0 bottom-0 w-4 z-60 group cursor-pointer transition-opacity duration-300",
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

        {mountHeavyPanels ? <Sidebar /> : null}
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
              "fixed right-0 top-0 bottom-0 w-4 z-60 group cursor-pointer transition-opacity duration-300",
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
        {mountHeavyPanels ? <RightSidebar /> : null}
        {mountHeavyPanels ? <QuickCaptureFabLazy hidden={hideQuickCapture} /> : null}

        {/* Document Processing Indicator - shows when PDFs are being processed */}
        {mountHeavyPanels ? <DocumentProcessingIndicatorLazy /> : null}
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
