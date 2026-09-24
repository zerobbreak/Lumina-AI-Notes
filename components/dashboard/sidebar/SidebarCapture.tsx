"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AudioLines, ChevronDown, File, Link2, Pin, Sparkles, Trash2, X } from "lucide-react";

import type { Id } from "@/types/data-model";
import { useRecordingActions } from "@/lib/hooks/recordings/useRecordingActions";
import { useRecordingStudioData } from "@/lib/hooks/recordings/useRecordingStudioData";
import { normalizeTranscriptForPrompt } from "@/lib/shared/transcript";
import { cn } from "@/lib/utils";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { Input } from "@/components/ui/input";
import { DraggableDocument } from "@/components/documents";
import { useDashboard } from "@/hooks/useDashboard";
import { MAX_REFERENCE_URLS } from "@/components/dashboard/DashboardContext";
import { SidebarRow } from "./SidebarRow";

/** How many captures show before "Show N more". */
const COLLAPSED_COUNT = 5;

type CaptureFile = {
  _id: string;
  name: string;
  processingStatus?: string;
};

interface SidebarCaptureProps {
  files: readonly CaptureFile[] | undefined;
  onRenameFile: (id: string, name: string) => void;
  onDeleteFile: (id: string) => void;
}

/**
 * Everything captured for generation, in one list: saved lecture sessions
 * (clicking one hands its transcript to the capture pill) and uploaded files
 * (drag one onto a note, or pin it as context). A pinned source and the
 * reference links, which also feed the pill, sit at the top and bottom.
 */
export function SidebarCapture({ files, onRenameFile, onDeleteFile }: SidebarCaptureProps) {
  const { activeContext, setActiveContext, loadSession } = useDashboard();
  const recordings = useRecordingStudioData();
  const { deleteRecording } = useRecordingActions();
  const [showAll, setShowAll] = useState(false);

  const sessions = (recordings ?? []).filter(
    (r) => r.transcript && r.transcript.trim().length > 0,
  );

  const items = [
    ...sessions.map((r) => ({ kind: "session" as const, id: r._id, recording: r })),
    ...(files ?? []).map((f) => ({ kind: "file" as const, id: f._id, file: f })),
  ];
  const visible = showAll ? items : items.slice(0, COLLAPSED_COUNT);
  const hidden = items.length - COLLAPSED_COUNT;

  return (
    <div className="space-y-px">
      {activeContext && (
        <div className="-mx-[3px] mb-1 flex items-center gap-2.5 rounded-lg border border-primary/25 bg-primary/5 p-[2px] pl-[11px] pr-1">
          <Pin className="h-[13px] w-[13px] shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1 py-1">
            <p className="truncate text-[12px] font-medium text-sidebar-foreground">{activeContext.name}</p>
            <p className="text-[11px] text-muted-foreground">Pinned as context</p>
          </div>
          <button
            type="button"
            onClick={() => setActiveContext(null)}
            aria-label="Unpin context"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {items.length === 0 && (
        <p className="px-2 py-1 text-[12px] text-muted-foreground/70">
          Record a lecture or upload a file
        </p>
      )}

      {visible.map((item) =>
        item.kind === "session" ? (
          <SidebarRow
            key={item.id}
            label={item.recording.title}
            icon={<AudioLines className="h-[14px] w-[14px]" />}
            onClick={() => {
              // Canonical flattening: handles both the chunk-array and legacy
              // plain-text shapes, and prefers each chunk's AI-enhanced text
              // over the raw dictation.
              const transcript = normalizeTranscriptForPrompt(item.recording.transcript);
              if (!transcript) {
                toast.error("That session has no transcript");
                return;
              }
              loadSession({
                recordingId: item.recording._id,
                title: item.recording.title,
                transcript,
                duration: item.recording.duration,
              });
              toast.success("Session loaded into the capture pill");
            }}
            actions={
              <ActionMenu
                onDelete={() =>
                  deleteRecording({ recordingId: item.recording._id as Id<"recordings"> })
                }
              />
            }
          />
        ) : (
          <DraggableDocument
            key={item.id}
            documentId={item.file._id}
            documentName={item.file.name}
            processingStatus={item.file.processingStatus}
            showDragIndicator={false}
          >
            <SidebarRow
              label={item.file.name}
              icon={<File className="h-[14px] w-[14px]" />}
              actions={
                <>
                  <PinContextButton fileId={item.file._id} fileName={item.file.name} />
                  <ActionMenu
                    onRename={() => onRenameFile(item.file._id, item.file.name)}
                    onDelete={() => onDeleteFile(item.file._id)}
                  />
                </>
              }
            />
          </DraggableDocument>
        ),
      )}

      {hidden > 0 && (
        <SidebarRow
          label={showAll ? "Show less" : `Show ${hidden} more`}
          icon={<ChevronDown className={cn("h-[13px] w-[13px] transition-transform", showAll && "rotate-180")} />}
          isMuted
          onClick={() => setShowAll((v) => !v)}
        />
      )}

      <ReferenceLinks />
    </div>
  );
}

/** Public pages merged into the generation prompt, behind a quiet row. */
function ReferenceLinks() {
  const { referenceUrls, addReferenceUrls, removeReferenceUrl } = useDashboard();
  const [isOpen, setIsOpen] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");

  return (
    <>
      <SidebarRow
        label={referenceUrls.length ? "Reference links" : "Add reference links"}
        icon={<Link2 className="h-[14px] w-[14px]" />}
        isMuted={referenceUrls.length === 0}
        meta={referenceUrls.length || undefined}
        onClick={() => setIsOpen((v) => !v)}
        ariaLabel={`Reference links${referenceUrls.length ? `, ${referenceUrls.length}` : ""}`}
      />

      {isOpen && (
        <div className="mx-0.5 mt-1 space-y-2 rounded-md border border-sidebar-border bg-background/60 p-2">
          <p className="text-[11px] leading-snug text-muted-foreground">
            Add public pages (syllabus, docs). Their text is fetched and used alongside your
            transcript. Up to {MAX_REFERENCE_URLS}.
          </p>
          <Input
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              const { added, rejected } = addReferenceUrls(urlDraft);
              if (rejected.length) toast.error(`Not a valid URL: ${rejected[0]}`);
              if (added > 0) setUrlDraft("");
            }}
            placeholder="https://…"
            aria-label="Reference link URL"
            className="h-7 text-xs"
          />
          {referenceUrls.map((u) => (
            <div
              key={u}
              className="flex items-start gap-1.5 rounded border border-border/50 bg-muted/20 px-1.5 py-1"
            >
              <span className="min-w-0 flex-1 break-all text-[11px] text-muted-foreground" title={u}>
                {u}
              </span>
              <button
                type="button"
                onClick={() => removeReferenceUrl(u)}
                aria-label="Remove link"
                className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/**
 * Header action for Capture: recordings that never produced a transcript are
 * dead weight, so offer to clear them once some exist.
 */
export function SessionsCleanupAction() {
  const recordings = useRecordingStudioData();
  const { cleanupOrphanedRecordings } = useRecordingActions();

  const failedCount = (recordings ?? []).filter(
    (r) => !r.transcript || r.transcript.trim().length === 0,
  ).length;

  if (failedCount === 0) return null;

  return (
    <button
      type="button"
      className="shrink-0 rounded px-1 py-0.5 text-[10.5px] text-warning hover:underline"
      onClick={async () => {
        try {
          const r = await cleanupOrphanedRecordings();
          toast.success(`Removed ${r.deletedCount} failed recording(s)`);
        } catch {
          toast.error("Cleanup failed");
        }
      }}
    >
      Clean up {failedCount}
    </button>
  );
}

/** Pin/unpin a file as the context generation runs against. */
function PinContextButton({ fileId, fileName }: { fileId: string; fileName: string }) {
  const { activeContext, setActiveContext } = useDashboard();
  const isPinned = activeContext?.type === "file" && activeContext.id === fileId;

  return (
    <button
      type="button"
      aria-label={isPinned ? `Unpin ${fileName}` : `Pin ${fileName} as context`}
      title={isPinned ? "Unpin as context" : "Pin as generation context"}
      onClick={() => setActiveContext(isPinned ? null : { id: fileId, name: fileName, type: "file" })}
      className={cn(
        "flex h-5 w-5 items-center justify-center rounded-sm hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        isPinned ? "text-primary" : "text-muted-foreground hover:text-sidebar-foreground",
      )}
    >
      <Sparkles className="h-3 w-3" />
    </button>
  );
}
