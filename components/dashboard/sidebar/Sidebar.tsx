"use client";

import {
  File,
  FolderOpen,
  Layers,
  Loader2,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  Plus,
  Search,
  Settings,
  Upload,
} from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Course } from "@/types";
import { DASHBOARD_NAV, activeDashboardNavId } from "@/constants/dashboardNav";
import { useDashboard } from "@/hooks/useDashboard";
import { useCreateNoteFlow } from "@/hooks/useCreateNoteFlow";
import {
  useKeyboardShortcut,
  formatShortcut,
} from "@/hooks/useKeyboardShortcut";
import { DraggableDocument } from "@/components/documents";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { ThemeCycleButton } from "@/components/shared/ThemeToggle";
import { SearchDialog } from "@/components/dashboard/search/SearchDialog";
import { RenameDialog } from "@/components/dashboard/dialogs/RenameDialog";
import { SettingsDialog } from "@/components/dashboard/dialogs/SettingsDialog";
import { UploadDialog } from "@/components/dashboard/dialogs/UploadDialog";
import { SidebarCourse } from "./SidebarCourse";
import { SidebarNavItem } from "./SidebarNavItem";
import { SidebarNote } from "./SidebarNote";
import { SidebarSection, SidebarSectionAction } from "./SidebarSection";
import {
  PinContextButton,
  SessionsCleanupAction,
  SidebarStudio,
} from "./SidebarStudio";

type RenameTarget = {
  id: string;
  type: "note" | "course" | "module" | "file";
  name: string;
  parentId?: string;
};

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

  const userData = useQuery(api.users.getUser);
  const quickNotes = useQuery(api.notes.getQuickNotes);
  const recentFiles = useQuery(api.files.getFiles);
  const pinnedNotes = useQuery(api.notes.getPinnedNotes);

  const deleteNote = useMutation(api.notes.deleteNote);
  const renameNote = useMutation(api.notes.renameNote);
  const toggleArchiveNote = useMutation(api.notes.toggleArchiveNote);

  const createCourse = useMutation(api.users.createCourse);
  const renameCourse = useMutation(api.users.renameCourse);
  const deleteCourse = useMutation(api.users.deleteCourse);

  const renameModule = useMutation(api.users.renameModule);
  const deleteModule = useMutation(api.users.deleteModule);

  const deleteFile = useMutation(api.files.deleteFile);
  const renameFile = useMutation(api.files.renameFile);

  const [expandedCourses, setExpandedCourses] = useState<
    Record<string, boolean>
  >({});
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const currentNoteId = searchParams.get("noteId");
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

  const openNote = useQuery(
    api.notes.getNote,
    currentNoteId ? { noteId: currentNoteId as Id<"notes"> } : "skip",
  );

  const handleNavigate = useCallback(
    (href: string) => {
      router.push(href);
      if (isNarrowViewport) setLeftSidebarState("closed");
    },
    [isNarrowViewport, router, setLeftSidebarState],
  );

  const handleCreateNote = useCallback(async () => {
    if (currentNoteId && openNote === undefined) return;
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
  }, [createNoteFlow, userData?.major, router, currentNoteId, openNote]);

  useKeyboardShortcut(
    "cmd+k",
    useCallback(() => setIsSearchOpen((open) => !open), []),
    { preventDefault: true },
  );

  useKeyboardShortcut(
    "/",
    useCallback(() => setIsSearchOpen((open) => !open), []),
    { preventDefault: true },
  );

  useKeyboardShortcut("cmd+n", handleCreateNote, { preventDefault: true });

  const toggleCourse = (courseId: string) =>
    setExpandedCourses((prev) => ({ ...prev, [courseId]: !prev[courseId] }));

  const openRename = (
    id: string,
    type: RenameTarget["type"],
    name: string,
    parentId?: string,
  ) => setRenameTarget({ id, type, name, parentId });

  const handleRenameConfirm = async (newValue: string) => {
    if (!renameTarget) return;
    const { id, type, parentId } = renameTarget;

    try {
      if (type === "note")
        await renameNote({ noteId: id as Id<"notes">, title: newValue });
      else if (type === "file")
        await renameFile({ fileId: id as Id<"files">, name: newValue });
      else if (type === "course")
        await renameCourse({ courseId: id, name: newValue });
      else if (type === "module" && parentId)
        await renameModule({
          courseId: parentId,
          moduleId: id,
          title: newValue,
        });
    } catch (e) {
      console.error(e);
      toast.error("Failed to rename");
    }
  };

  const handleCreateCourse = async () => {
    try {
      await createCourse({ name: "New Course", code: "CSE 101" });
    } catch (e) {
      console.error(e);
      toast.error("Failed to create course");
    }
  };

  const courses = userData?.courses ?? [];
  const courseCodes = useMemo(
    () => courses.map((course) => course.code),
    [courses],
  );

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
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md text-muted-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            onClick={toggleLeftSidebarRail}
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <PanelLeft className="h-[15px] w-[15px]" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md text-muted-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            onClick={handleCreateNote}
            disabled={isCreatingNote}
            aria-label="New note"
            title={`New note · ${formatShortcut("cmd+n")}`}
          >
            {isCreatingNote ? (
              <Loader2 className="h-[15px] w-[15px] animate-spin" />
            ) : (
              <Plus className="h-[15px] w-[15px]" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md text-muted-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Search"
            title={`Search · ${formatShortcut("cmd+k")}`}
          >
            <Search className="h-[15px] w-[15px]" />
          </Button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={handleCreateNote}
            disabled={isCreatingNote}
            className="flex h-7 w-full items-center justify-center gap-1.5 rounded-md bg-primary text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar disabled:opacity-60"
          >
            {isCreatingNote ? (
              <Loader2 className="h-[13px] w-[13px] animate-spin" />
            ) : (
              <Plus className="h-[13px] w-[13px]" />
            )}
            <span>{openNote ? "New sub-page" : "New note"}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="group/search flex h-7 w-full items-center justify-between rounded-md border border-sidebar-border/70 bg-sidebar-accent/25 px-2 transition-colors hover:bg-sidebar-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar"
          >
            <span className="flex items-center gap-2 text-[13px] text-muted-foreground/80">
              <Search className="h-[13px] w-[13px]" />
              <span>Search</span>
            </span>
            <span className="text-[10px] text-muted-foreground/50 transition-colors group-hover/search:text-muted-foreground/80">
              {formatShortcut("cmd+k")}
            </span>
          </button>
        </>
      )}
    </div>
  );

  /* ────────────────────────────────────────────── zone 2: fixed destinations */

  const destinations = (
    <TooltipProvider delayDuration={300}>
      <nav
        aria-label="Dashboard"
        className={cn(
          "shrink-0 space-y-px pb-2",
          isRail ? "flex flex-col items-center gap-1 px-2" : "px-2",
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
          />
        ))}
      </nav>
    </TooltipProvider>
  );

  /* ─────────────────────────────────────────── zone 3: workspace tree (rail) */

  const railTree = (
    <ScrollArea className="min-h-0 min-w-0 flex-1 px-2 py-2">
      <div className="flex flex-col items-center gap-1">
        {pinnedNotes?.length ? (
          pinnedNotes.map((note) => (
            <SidebarNote
              key={note._id}
              note={note}
              isCompact
              isActive={note._id === currentNoteId}
              onRename={() => openRename(note._id, "note", note.title)}
              onDelete={() => deleteNote({ noteId: note._id })}
              onArchive={() => toggleArchiveNote({ noteId: note._id })}
            />
          ))
        ) : (
          <Pin className="h-4 w-4 text-muted-foreground/25" />
        )}
        <div className="my-1 h-px w-6 bg-sidebar-border/70" />
        {courses.length ? (
          courses.map((course: Course) => (
            <SidebarCourse
              key={course.id}
              course={course}
              isCompact
              peerCodes={courseCodes}
              isExpanded={!!expandedCourses[course.id]}
              onToggle={() => toggleCourse(course.id)}
              onRename={(id, name) => openRename(id, "course", name)}
              onDelete={(id) => deleteCourse({ courseId: id })}
              onRenameModule={(id, name, parentId) =>
                openRename(id, "module", name, parentId)
              }
              onDeleteModule={(id, parentId) =>
                deleteModule({ courseId: parentId, moduleId: id })
              }
              onRenameNote={(id, title) => openRename(id, "note", title)}
              onDeleteNote={(id) => deleteNote({ noteId: id as Id<"notes"> })}
              onArchiveNote={(id) =>
                toggleArchiveNote({ noteId: id as Id<"notes"> })
              }
            />
          ))
        ) : (
          <FolderOpen className="h-4 w-4 text-muted-foreground/25" />
        )}
      </div>
    </ScrollArea>
  );

  /* ─────────────────────────────────────────── zone 3: workspace tree (open) */

  const tree = (
    <ScrollArea className="min-h-0 min-w-0 flex-1 px-1 py-2">
      <div className="space-y-3">
        <SidebarSection
          id="favorites"
          label="Favorites"
          isEmpty={!pinnedNotes?.length}
          emptyLabel="Pin a note to keep it here"
        >
          {pinnedNotes?.map((note) => (
            <SidebarNote
              key={note._id}
              note={note}
              isActive={note._id === currentNoteId}
              onRename={() => openRename(note._id, "note", note.title)}
              onDelete={() => deleteNote({ noteId: note._id })}
              onArchive={() => toggleArchiveNote({ noteId: note._id })}
            />
          ))}
        </SidebarSection>

        <SidebarSection
          id="recent"
          label="Recent"
          isEmpty={!quickNotes?.length}
          emptyLabel="No recent notes"
          action={
            <SidebarSectionAction
              icon={Plus}
              label="New note"
              onClick={handleCreateNote}
              disabled={isCreatingNote}
            />
          }
        >
          {quickNotes?.map((note) => (
            <SidebarNote
              key={note._id}
              note={note}
              isActive={note._id === currentNoteId}
              onRename={() => openRename(note._id, "note", note.title)}
              onDelete={() => deleteNote({ noteId: note._id })}
              onArchive={() => toggleArchiveNote({ noteId: note._id })}
            />
          ))}
        </SidebarSection>

        <SidebarSection
          id="courses"
          label="Courses"
          isEmpty={courses.length === 0}
          emptyLabel="No courses yet"
          action={
            <SidebarSectionAction
              icon={Plus}
              label="New course"
              onClick={handleCreateCourse}
            />
          }
        >
          {courses.map((course: Course) => (
            <SidebarCourse
              key={course.id}
              course={course}
              peerCodes={courseCodes}
              isExpanded={!!expandedCourses[course.id]}
              onToggle={() => toggleCourse(course.id)}
              onRename={(id, name) => openRename(id, "course", name)}
              onDelete={(id) => deleteCourse({ courseId: id })}
              onRenameModule={(id, name, parentId) =>
                openRename(id, "module", name, parentId)
              }
              onDeleteModule={(id, parentId) =>
                deleteModule({ courseId: parentId, moduleId: id })
              }
              onRenameNote={(id, title) => openRename(id, "note", title)}
              onDeleteNote={(id) => deleteNote({ noteId: id as Id<"notes"> })}
              onArchiveNote={(id) =>
                toggleArchiveNote({ noteId: id as Id<"notes"> })
              }
            />
          ))}
        </SidebarSection>

        <SidebarSection
          id="sessions"
          label="Sessions"
          action={<SessionsCleanupAction />}
        >
          <SidebarStudio />
        </SidebarSection>

        <SidebarSection
          id="resources"
          label="Resources"
          isEmpty={!recentFiles?.length}
          emptyLabel="No files yet"
          action={
            <SidebarSectionAction
              icon={Upload}
              label="Upload a file"
              onClick={() => setIsUploadOpen(true)}
            />
          }
        >
          {recentFiles?.slice(0, 5).map((file) => (
            <DraggableDocument
              key={file._id}
              documentId={file._id}
              documentName={file.name}
              processingStatus={file.processingStatus}
              showDragIndicator={false}
            >
              <div className="group/file relative flex items-center">
                <button
                  type="button"
                  className="flex h-7 w-full items-center gap-2 rounded-md px-2 text-[13px] text-sidebar-foreground/75 transition-colors duration-100 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar"
                >
                  <File className="h-[14px] w-[14px] shrink-0 opacity-60" />
                  <span className="flex-1 truncate text-left">{file.name}</span>
                </button>
                <div className="absolute right-1 flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover/file:opacity-100">
                  <PinContextButton fileId={file._id} fileName={file.name} />
                  <ActionMenu
                    onRename={() => openRename(file._id, "file", file.name)}
                    onDelete={() => deleteFile({ fileId: file._id })}
                  />
                </div>
              </div>
            </DraggableDocument>
          ))}
        </SidebarSection>
      </div>
    </ScrollArea>
  );

  /* ───────────────────────────────────────────────────── zone 4: the footer */

  const footer = (
    <div
      className={cn(
        "shrink-0 border-t border-sidebar-border/60 p-2",
        isRail && "flex flex-col items-center gap-1",
      )}
    >
      {isRail ? (
        <>
          {mounted ? (
            <UserButton
              appearance={{
                elements: {
                  avatarBox:
                    "w-7 h-7 rounded-md ring-1 ring-sidebar-border hover:ring-sidebar-foreground/20 transition-all",
                },
              }}
            />
          ) : (
            <div className="h-7 w-7 animate-pulse rounded-md bg-sidebar-accent" />
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md text-muted-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Settings"
            title="Settings"
          >
            <Settings className="h-[15px] w-[15px]" />
          </Button>
        </>
      ) : (
        <div className="flex items-center gap-2">
          {mounted ? (
            <UserButton
              appearance={{
                elements: {
                  avatarBox:
                    "w-7 h-7 rounded-md ring-1 ring-sidebar-border hover:ring-sidebar-foreground/20 transition-all",
                },
              }}
            />
          ) : (
            <div className="h-7 w-7 shrink-0 animate-pulse rounded-md bg-sidebar-accent" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium leading-tight text-sidebar-foreground">
              {user?.fullName || "Student"}
            </p>
            {user?.primaryEmailAddress?.emailAddress && (
              <p className="truncate text-[11px] leading-tight text-muted-foreground/60">
                {user.primaryEmailAddress.emailAddress}
              </p>
            )}
          </div>
          <ThemeCycleButton />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 rounded-md text-muted-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Settings"
            title="Settings"
          >
            <Settings className="h-[14px] w-[14px]" />
          </Button>
        </div>
      )}
    </div>
  );

  const sidebarInner = (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-sidebar">
      {header}
      {destinations}
      <div className="mx-2 h-px shrink-0 bg-sidebar-border/60" />
      {isRail ? railTree : tree}
      {footer}
    </div>
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
                : renameTarget.type === "course"
                  ? "Course"
                  : "Module"
          }
          onConfirm={handleRenameConfirm}
        />
      )}
      <SearchDialog open={isSearchOpen} onOpenChange={setIsSearchOpen} />
      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </>
  );
}
