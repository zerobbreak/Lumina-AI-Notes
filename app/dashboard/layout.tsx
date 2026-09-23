"use client";

import { Suspense, useState, useCallback, useEffect, lazy } from "react";
import dynamic from "next/dynamic";
import { DashboardProvider } from "@/components/dashboard/DashboardContext";
import { RealtimeProvider } from "@/components/providers/RealtimeProvider";
import { DragOverlayWrapper } from "@/components/dashboard/DragOverlayWrapper";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { useAppCommands } from "@/lib/appCommands";
import { DASHBOARD_NAV } from "@/constants/dashboardNav";
import { Sparkles } from "lucide-react";
import { useAcceptPendingInvites } from "@/lib/hooks/auth/useAcceptPendingInvites";
import { useAppAuth } from "@/lib/hooks/auth/useAppAuth";
import { useUserData } from "@/lib/hooks/users/useUserData";
import { useRouter, useSearchParams } from "next/navigation";
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

const TranscriptionPill = dynamic(
  () =>
    import("@/components/dashboard/transcribe/TranscriptionPill").then((m) => ({
      default: m.TranscriptionPill,
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
  // The palette's starting text while it's open, null while closed. A
  // leading ">" lists only commands, as in VS Code.
  const [paletteQuery, setPaletteQuery] = useState<string | null>(null);
  const [paletteOpenCount, setPaletteOpenCount] = useState(0);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [mountHeavyPanels, setMountHeavyPanels] = useState(false);
  const acceptPendingInvites = useAcceptPendingInvites();
  const { isLoading: authLoading, isAuthenticated } = useAppAuth();
  const userData = useUserData();
  const router = useRouter();
  const searchParams = useSearchParams();
  // The Studio's own AI chat is unrelated to live transcription — the
  // floating recording pill shouldn't hover over it.
  const isStudioView = searchParams.get("view") === "studio";
  const { toggleLeftSidebar, isLeftSidebarOpen } = useDashboard();
  const [isLeftHovered, setIsLeftHovered] = useState(false);

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

  // Global keyboard shortcuts and the commands they (or the palette) trigger.
  useGlobalShortcuts();
  const openPalette = useCallback((query: string) => {
    setPaletteQuery(query);
    // Remount so pressing the shortcut again starts over in the new mode.
    setPaletteOpenCount((n) => n + 1);
  }, []);
  useAppCommands((id) => {
    if (id === "command-palette") openPalette(">");
    else if (id === "quick-open") openPalette("");
    else if (id === "show-shortcuts") setIsShortcutsOpen(true);
    else if (id === "toggle-sidebar") toggleLeftSidebar();
    else if (id.startsWith("go:")) {
      const item = DASHBOARD_NAV.find((n) => `go:${n.id}` === id);
      if (item) router.push(item.href);
    }
  });

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
        {mountHeavyPanels && !isStudioView ? <TranscriptionPill /> : null}

        {/* Document Processing Indicator - shows when PDFs are being processed */}
        {mountHeavyPanels ? <DocumentProcessingIndicatorLazy /> : null}
      </div>

      {/* Command Palette - lazy loaded */}
      {paletteQuery !== null && (
        <Suspense fallback={null}>
          <CommandPalette
            key={paletteOpenCount}
            open
            initialQuery={paletteQuery}
            onOpenChange={(open) => {
              if (!open) setPaletteQuery(null);
            }}
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
        <RealtimeProvider>
          <DragOverlayWrapper>
            <DashboardLayoutContent>{children}</DashboardLayoutContent>
          </DragOverlayWrapper>
        </RealtimeProvider>
      </DashboardProvider>
    </Suspense>
  );
}
