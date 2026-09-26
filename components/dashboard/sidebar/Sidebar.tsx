"use client";

import {
  Calendar,
  Layers,
  Loader2,
  MessageSquarePlus,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  Upload,
} from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Id } from "@/types/data-model";
import { useCourseActions } from "@/lib/hooks/mutations/useCourseActions";
import { useFileActions } from "@/lib/hooks/mutations/useFileActions";
import { useNoteActions } from "@/lib/hooks/mutations/useNoteActions";
import { useTagActions } from "@/lib/hooks/mutations/useTagActions";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Course } from "@/types";
import { DASHBOARD_NAV, activeDashboardNavId } from "@/constants/dashboardNav";
import { useDashboard } from "@/hooks/useDashboard";
import { useCreateNoteFlow } from "@/hooks/useCreateNoteFlow";
import { formatShortcut } from "@/hooks/useKeyboardShortcut";
import { dispatchAppCommand, useAppCommand, useAppCommands } from "@/lib/appCommands";
import { shortcutFor } from "@/constants/shortcuts";
import { AppearanceSwitcher } from "@/components/shared/AppearanceSwitcher";
import { SpotlightCard } from "@/components/dashboard/announcements/SpotlightCard";
import { WhatsNew } from "@/components/dashboard/announcements/WhatsNew";
import type { AnnouncementAction } from "@/lib/announcements/registry";
import { CourseAccentSync } from "./CourseAccentSync";
import { SearchDialog } from "@/components/dashboard/search/SearchDialog";
import { RenameDialog } from "@/components/dashboard/dialogs/RenameDialog";
import { FeedbackDialog } from "@/components/dashboard/dialogs/FeedbackDialog";
import { SettingsDialog } from "@/components/dashboard/dialogs/SettingsDialog";
import { UploadDialog } from "@/components/dashboard/dialogs/UploadDialog";
import { TagManagerDialog } from "@/components/dashboard/tags/TagManagerDialog";
import { SidebarCourse } from "./SidebarCourse";
import { SidebarNavItem } from "./SidebarNavItem";
import {
  preloadAllViewsWhenIdle,
  preloadView,
  viewForParam,
} from "@/components/dashboard/viewLoaders";
import { SidebarJumpBackIn } from "./SidebarJumpBackIn";
import { SidebarNote } from "./SidebarNote";
import { SidebarRow } from "./SidebarRow";
import { SidebarSection, SidebarSectionAction } from "./SidebarSection";
import { SidebarTags } from "./SidebarTags";
import { SessionsCleanupAction, SidebarCapture } from "./SidebarCapture";
import { useSidebarListData } from "@/lib/hooks/sidebar/useSidebarListData";

type RenameTarget = {
  id: string;
  type: "note" | "course" | "file" | "tag";
  name: string;
};

function formatDueIn(dueAt: number): string {
  const days = Math.round((dueAt - Date.now()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Due today";
  if (days === 1) return "in 1 day";
  return `in ${days} days`;
}

/**
 * The left panel, in four zones: brand and actions, the fixed destinations,
 * the scrolling workspace tree, and the account footer.
 *
 * Destinations sit outside the scroll container on purpose — a long course
 * tree should never be able to push Archive out of reach.
 */
export function Sidebar() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { leftSidebarState, setLeftSidebarState, toggleLeftSidebarRail } =
    useDashboard();
  const { createNoteFlow } = useCreateNoteFlow();

  const isClosed = leftSidebarState === "closed";

  const currentNoteId = searchParams.get("noteId");

  const {
    userData,
    quickNotes,
    recentFiles,
    pinnedNotes,
    tags,
    todayQueue,
    upcomingDeadlines,
    openNote,
    openNoteLoading,
  } = useSidebarListData(currentNoteId);

  const { deleteNote, renameNote, toggleArchiveNote } = useNoteActions();
  const { createCourse, renameCourse, deleteCourse } = useCourseActions();
  const { updateTag, deleteTag } = useTagActions();
  const { deleteFile, renameFile } = useFileActions();

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState("profile");
  const openSettings = (tab = "profile") => {
    setSettingsTab(tab);
    setIsSettingsOpen(true);
  };
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => preloadAllViewsWhenIdle(), []);

  const [isNarrowViewport, setIsNarrowViewport] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsNarrowViewport(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // The mobile panel is an overlay, so it is always shown at full width.
  const isRail = leftSidebarState === "compact" && !isNarrowViewport;

  const activeNavId = activeDashboardNavId({
    view: searchParams.get("view"),
    noteId: currentNoteId,
    contextId: searchParams.get("contextId"),
  });

  // Views that want the whole screen collapse the panel when they open, whether
  // that came from a click here or from a pasted link.
  useEffect(() => {
    const item = DASHBOARD_NAV.find((n) => n.id === activeNavId);
    if (!item?.prefersRail) return;
    setLeftSidebarState(isNarrowViewport ? "closed" : "compact");
  }, [activeNavId, isNarrowViewport, setLeftSidebarState]);

  const handleNavigate = useCallback(
    (href: string) => {
      router.push(href);
      if (isNarrowViewport) setLeftSidebarState("closed");
    },
    [isNarrowViewport, router, setLeftSidebarState],
  );

  const handleCreateNote = useCallback(async () => {
    if (currentNoteId && openNoteLoading) return;
    try {
      setIsCreatingNote(true);
      const result = await createNoteFlow({
        title: "Untitled Note",
        major: userData?.major || "general",
        ...(openNote
          ? {
              parentNoteId: openNote._id,
              courseId: openNote.courseId,
              moduleId: openNote.moduleId,
              noteType: "page",
            }
          : {}),
      });
      if (result?.noteId) {
        router.push(`/dashboard?noteId=${result.noteId}`);
        toast.success(openNote ? "Sub-page created" : "New note created");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to create note");
    } finally {
      setIsCreatingNote(false);
    }
  }, [createNoteFlow, userData?.major, router, currentNoteId, openNote, openNoteLoading]);

  const runAnnouncementAction = useCallback(
    (action: AnnouncementAction) => {
      if (action.type === "open-settings") {
        setSettingsTab(action.tab);
        setIsSettingsOpen(true);
      } else {
        handleNavigate(action.href);
      }
    },
    [handleNavigate],
  );

  useAppCommand("search", useCallback(() => setIsSearchOpen((open) => !open), []));
  useAppCommand("new-note", handleCreateNote);
  useAppCommands((id) => {
    if (id.startsWith("settings:")) openSettings(id.slice("settings:".length));
  });

  const openRename = (id: string, type: RenameTarget["type"], name: string) =>
    setRenameTarget({ id, type, name });

  const handleRenameConfirm = async (newValue: string) => {
    if (!renameTarget) return;
    const { id, type } = renameTarget;

    try {
      if (type === "note")
        await renameNote({ noteId: id as Id<"notes">, title: newValue });
      else if (type === "file")
        await renameFile({ fileId: id as Id<"files">, name: newValue });
      else if (type === "course")
        await renameCourse({ courseId: id, name: newValue });
      else if (type === "tag")
        await updateTag({ tagId: id as Id<"tags">, name: newValue });
    } catch (e) {
      console.error(e);
      toast.error("Failed to rename");
    }
  };

  const handleCreateCourse = async () => {
    try {
      await createCourse({ name: "New module", code: "" });
    } catch (e) {
      console.error(e);
      toast.error("Failed to create module");
    }
  };

  const courses = userData?.courses ?? [];

  const dueTodayCount = todayQueue?.cardIds?.length ?? 0;
  const nextDeadline = upcomingDeadlines?.[0];
  const nextDeadlineLabel = nextDeadline
    ? formatDueIn(nextDeadline.dueAt)
    : null;

  /* ─────────────────────────────────────────────── zone 1: brand + actions */

  const header = (
    <div className={cn("flex flex-col gap-1.5 px-2 pb-2 pt-2.5", isRail && "px-2")}>
      <div
        className={cn(
          "flex items-center",
          isRail ? "justify-center" : "justify-between gap-1",
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[5px] bg-primary">
            <Layers className="h-3 w-3 text-primary-foreground" />
          </div>
          {!isRail && (
            <span className="truncate text-[13px] font-semibold tracking-tight text-sidebar-foreground">
              Lumina
            </span>
          )}
        </div>
        {!isNarrowViewport && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 shrink-0 rounded-md text-muted-foreground/60 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              isRail && "hidden",
            )}
            onClick={toggleLeftSidebarRail}
            aria-label="Collapse to icon rail"
            title="Collapse to icon rail"
          >
            <PanelLeftClose className="h-[15px] w-[15px]" />
          </Button>
        )}
      </div>

      {isRail ? (
        <div className="flex flex-col items-center gap-1 pt-1">
          <SidebarRow
            isRail
            label="Expand sidebar"
            icon={<PanelLeft className="h-[15px] w-[15px]" />}
            onClick={toggleLeftSidebarRail}
          />
          <SidebarRow
            isRail
            label={`${openNote ? "New sub-page" : "New note"} · ${formatShortcut(shortcutFor("new-note")!)}`}
            ariaLabel={openNote ? "New sub-page" : "New note"}
            icon={
              isCreatingNote ? (
                <Loader2 className="h-[15px] w-[15px] animate-spin" />
              ) : (
                <Plus className="h-[15px] w-[15px]" strokeWidth={2.25} />
              )
            }
            onClick={handleCreateNote}
            className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
          />
          <SidebarRow
            isRail
            label={`Search · ${formatShortcut(shortcutFor("search")!)}`}
            ariaLabel="Search"
            icon={<Search className="h-[15px] w-[15px]" />}
            onClick={() => setIsSearchOpen(true)}
          />
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            data-tour="search"
            className="group/search flex h-7 min-w-0 flex-1 items-center gap-2.5 rounded-md border border-sidebar-border/70 bg-sidebar-accent/25 px-2 transition-colors hover:bg-sidebar-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar"
          >
            <Search className="h-[13px] w-[13px] shrink-0 text-muted-foreground/80" />
            <span className="flex-1 truncate text-left text-[13px] text-muted-foreground/80">Search</span>
            <span className="text-[10px] text-muted-foreground/55 transition-colors group-hover/search:text-muted-foreground/80">
              {formatShortcut(shortcutFor("search")!)}
            </span>
          </button>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleCreateNote}
                disabled={isCreatingNote}
                aria-label={openNote ? "New sub-page" : "New note"}
                data-tour="new-note"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar disabled:opacity-60"
              >
                {isCreatingNote ? (
                  <Loader2 className="h-[14px] w-[14px] animate-spin" />
                ) : (
                  <Plus className="h-[15px] w-[15px]" strokeWidth={2.25} />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {openNote ? "New sub-page" : "New note"} · {formatShortcut(shortcutFor("new-note")!)}
            </TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );

  /* ────────────────────────────────────────────── zone 2: fixed destinations */

  const destinations = (
    <nav
      aria-label="Dashboard"
      data-tour="destinations"
      className={cn(
        "shrink-0 space-y-px px-2 pb-2",
        isRail && "flex flex-col items-center gap-1",
      )}
    >
      {DASHBOARD_NAV.map((item) => (
        <SidebarNavItem
          key={item.id}
          label={item.label}
          icon={item.icon}
          isRail={isRail}
          isActive={activeNavId === item.id}
          onClick={() => handleNavigate(item.href)}
          onPrefetch={() => preloadView(viewForParam(item.view))}
        />
      ))}
    </nav>
  );

  /* ─────────────────────────────────────────── zone 3: workspace tree (rail) */

  const railTree = (
    <ScrollArea className="min-h-0 min-w-0 flex-1 px-2 py-2">
      <div className="flex flex-col items-center gap-1">
        {dueTodayCount > 0 && (
          <SidebarRow
            isRail
            label={`Review · ${dueTodayCount} due`}
            icon={
              <>
                <Layers className="h-[15px] w-[15px] text-primary" />
                <span className="absolute -right-1 -top-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-semibold tabular-nums text-primary-foreground">
                  {dueTodayCount}
                </span>
              </>
            }
            onClick={() => router.push("/dashboard?view=flashcards")}
          />
        )}
        {pinnedNotes?.map((note) => (
          <SidebarNote
            key={note._id}
            note={note}
            isCompact
            isActive={note._id === currentNoteId}
            onRename={() => openRename(note._id, "note", note.title)}
            onDelete={() => deleteNote({ noteId: note._id })}
            onArchive={() => toggleArchiveNote({ noteId: note._id })}
          />
        ))}
        {(pinnedNotes?.length ?? 0) > 0 && courses.length > 0 && (
          <div className="my-1 h-px w-6 bg-sidebar-border/70" />
        )}
        {courses.map((course: Course) => (
          <SidebarCourse
            key={course.id}
            course={course}
            isCompact
            onRename={(id, name) => openRename(id, "course", name)}
            onDelete={(id) => deleteCourse({ courseId: id })}
            onRenameNote={(id, title) => openRename(id, "note", title)}
            onDeleteNote={(id) => deleteNote({ noteId: id as Id<"notes"> })}
            onArchiveNote={(id) =>
              toggleArchiveNote({ noteId: id as Id<"notes"> })
            }
          />
        ))}
      </div>
    </ScrollArea>
  );

  /* ─────────────────────────────────────────── zone 3: workspace tree (open) */

  const tree = (
    <ScrollArea className="min-h-0 min-w-0 flex-1 px-2 py-2.5">
      <div className="space-y-3">
        {(dueTodayCount > 0 || nextDeadline) && (
          // -mx-[3px] cancels the border + padding, so the rows inside keep the
          // same icon and label columns as every other row.
          <div className="-mx-[3px] space-y-px rounded-lg border border-sidebar-border/70 bg-sidebar-accent/20 p-[2px]">
            {dueTodayCount > 0 && (
              <SidebarRow
                label="Review"
                icon={<Layers className="h-[14px] w-[14px] text-primary" />}
                onClick={() => router.push("/dashboard?view=flashcards")}
                meta={
                  <span className="rounded-full bg-primary px-1.5 py-0.5 font-medium text-primary-foreground">
                    {dueTodayCount} due
                  </span>
                }
              />
            )}
            {nextDeadline && (
              <SidebarRow
                label={nextDeadline.title}
                icon={<Calendar className="h-[14px] w-[14px]" />}
                onClick={() => router.push("/dashboard?view=calendar")}
                meta={<span className="text-warning">{nextDeadlineLabel}</span>}
              />
            )}
          </div>
        )}

        <SidebarSection
          id="jump-back-in"
          label="Jump back in"
          action={
            <SidebarSectionAction
              icon={Plus}
              label={openNote ? "New sub-page" : "New note"}
              onClick={handleCreateNote}
              disabled={isCreatingNote}
            />
          }
        >
          <SidebarJumpBackIn
            pinned={pinnedNotes}
            recent={quickNotes}
            renderNote={(note) => (
              <SidebarNote
                key={note._id}
                note={note}
                isActive={note._id === currentNoteId}
                onRename={() => openRename(note._id, "note", note.title)}
                onDelete={() => deleteNote({ noteId: note._id })}
                onArchive={() => toggleArchiveNote({ noteId: note._id })}
              />
            )}
          />
        </SidebarSection>

        <SidebarSection
          id="courses"
          tourId="modules"
          count={courses.length}
          label="Modules"
          isEmpty={courses.length === 0}
          emptyLabel="No modules yet"
          action={
            <SidebarSectionAction
              icon={Plus}
              label="New module"
              onClick={handleCreateCourse}
            />
          }
        >
          {courses.map((course: Course) => (
            <SidebarCourse
              key={course.id}
              course={course}
              onRename={(id, name) => openRename(id, "course", name)}
              onDelete={(id) => deleteCourse({ courseId: id })}
              onRenameNote={(id, title) => openRename(id, "note", title)}
              onDeleteNote={(id) => deleteNote({ noteId: id as Id<"notes"> })}
              onArchiveNote={(id) =>
                toggleArchiveNote({ noteId: id as Id<"notes"> })
              }
            />
          ))}
        </SidebarSection>

        <SidebarSection
          id="tags"
          count={tags?.length}
          label="Tags"
          isEmpty={!tags?.length}
          emptyLabel="No tags yet"
          action={
            <SidebarSectionAction
              icon={Plus}
              label="Add tag"
              onClick={() => setIsTagManagerOpen(true)}
            />
          }
        >
          <SidebarTags
            tags={tags ?? []}
            activeNoteId={currentNoteId}
            onRename={(id, name) => openRename(id, "tag", name)}
            onDelete={(id) => deleteTag({ tagId: id })}
            onRenameNote={(id, title) => openRename(id, "note", title)}
            onDeleteNote={(id) => deleteNote({ noteId: id as Id<"notes"> })}
            onArchiveNote={(id) => toggleArchiveNote({ noteId: id as Id<"notes"> })}
          />
        </SidebarSection>

        <SidebarSection
          id="capture"
          tourId="capture"
          label="Capture"
          action={
            <>
              <SessionsCleanupAction />
              <SidebarSectionAction
                icon={Upload}
                label="Upload a file"
                onClick={() => setIsUploadOpen(true)}
              />
            </>
          }
        >
          <SidebarCapture
            files={recentFiles}
            onRenameFile={(id, name) => openRename(id, "file", name)}
            onDeleteFile={(id) => deleteFile({ fileId: id as Id<"files"> })}
          />
        </SidebarSection>
      </div>
    </ScrollArea>
  );

  /* ───────────────────────────────────────────────────── zone 4: the footer */

  const avatar = (size: "h-6 w-6" | "h-7 w-7") =>
    mounted ? (
      <UserButton
        appearance={{
          elements: {
            avatarBox: `${size} rounded-md ring-1 ring-sidebar-border hover:ring-sidebar-foreground/20 transition-all`,
          },
        }}
      />
    ) : (
      <div className={cn(size, "shrink-0 animate-pulse rounded-md bg-sidebar-accent")} />
    );

  const footer = (
    <div
      className={cn(
        "shrink-0 border-t border-sidebar-border/60 p-2",
        isRail && "flex flex-col items-center gap-1",
      )}
    >
      {isRail ? (
        <>
          <WhatsNew isRail onAction={runAnnouncementAction} />
          <div className="my-1">{avatar("h-7 w-7")}</div>
          <SidebarRow
            isRail
            label="Send feedback"
            icon={<MessageSquarePlus className="h-[15px] w-[15px]" />}
            onClick={() => dispatchAppCommand("feedback")}
          />
          <SidebarRow
            isRail
            label="Settings"
            icon={<Settings className="h-[15px] w-[15px]" />}
            onClick={() => openSettings()}
          />
        </>
      ) : (
        // The avatar centres on the rows' icon column (x=23) and the name
        // starts on their label column (x=40).
        <div className="flex items-center gap-0.5 pl-[3px]">
          <div className="flex shrink-0">{avatar("h-6 w-6")}</div>
          <div className="ml-[5px] min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium leading-tight text-sidebar-foreground">
              {user?.fullName || "Student"}
            </p>
            {user?.primaryEmailAddress?.emailAddress && (
              <p className="truncate text-[11px] leading-tight text-muted-foreground/70">
                {user.primaryEmailAddress.emailAddress}
              </p>
            )}
          </div>
          <WhatsNew isRail={false} onAction={runAnnouncementAction} />
          <AppearanceSwitcher onOpenSettings={() => openSettings("appearance")} />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 rounded-md text-muted-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                onClick={() => dispatchAppCommand("feedback")}
                aria-label="Send feedback"
              >
                <MessageSquarePlus className="h-[14px] w-[14px]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Send feedback</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 rounded-md text-muted-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                onClick={() => openSettings()}
                aria-label="Settings"
                data-tour="settings"
              >
                <Settings className="h-[14px] w-[14px]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Settings</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );

  const sidebarInner = (
    <TooltipProvider delayDuration={300}>
      <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-sidebar">
        {header}
        {destinations}
        <div className="mx-2 h-px shrink-0 bg-sidebar-border/60" />
        {isRail ? railTree : tree}
        {footer}
      </div>
    </TooltipProvider>
  );

  return (
    <>
      {/* Desktop / tablet */}
      {!isNarrowViewport && (
        <div
          className={cn(
            "relative z-50 h-screen shrink-0 overflow-visible border-sidebar-border transition-[width] duration-200 ease-out",
            isClosed
              ? "w-0 border-transparent opacity-0 pointer-events-none"
              : isRail
                ? "w-[60px] border-r opacity-100"
                : "w-[248px] border-r opacity-100",
          )}
        >
          {sidebarInner}

          {isClosed && (
            <button
              type="button"
              onClick={() => setLeftSidebarState("open")}
              className="fixed left-3 top-3 z-60 flex h-8 w-8 items-center justify-center rounded-md border border-sidebar-border bg-sidebar text-muted-foreground/70 transition-all hover:bg-sidebar-accent/60 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
              aria-label="Show sidebar"
              title="Show sidebar"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Mobile overlay */}
      {isNarrowViewport && !isClosed ? (
        <div className="fixed inset-0 z-100 flex">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            aria-label="Close sidebar"
            onClick={() => setLeftSidebarState("closed")}
          />
          <div className="relative h-full w-[min(272px,88vw)] border-r border-sidebar-border bg-sidebar shadow-xl">
            {sidebarInner}
          </div>
        </div>
      ) : isNarrowViewport && isClosed ? (
        <button
          type="button"
          onClick={() => setLeftSidebarState("open")}
          aria-label="Open sidebar"
          className="fixed bottom-3 left-3 z-100 flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </button>
      ) : null}

      <UploadDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        courseId={
          searchParams.get("contextType") === "course"
            ? (searchParams.get("contextId") ?? undefined)
            : undefined
        }
      />

      {renameTarget && (
        <RenameDialog
          open={!!renameTarget}
          onOpenChange={(open) => !open && setRenameTarget(null)}
          initialValue={renameTarget.name}
          title={
            renameTarget.type === "note"
              ? "Note"
              : renameTarget.type === "file"
                ? "File"
                : renameTarget.type === "tag"
                  ? "Tag"
                  : "Module"
          }
          onConfirm={handleRenameConfirm}
        />
      )}
      <SearchDialog open={isSearchOpen} onOpenChange={setIsSearchOpen} />
      <CourseAccentSync />
      <SpotlightCard onAction={runAnnouncementAction} />
      <FeedbackDialog />
      <SettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        initialTab={settingsTab}
      />
      <TagManagerDialog
        open={isTagManagerOpen}
        onOpenChange={setIsTagManagerOpen}
      />
    </>
  );
}
