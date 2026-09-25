"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, FolderPlus, GraduationCap, Link2, Loader2, RefreshCw, Unplug } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api/errors";
import { useConnectBrightspace } from "@/lib/mutations/integrations/useConnectBrightspace";
import { useDisconnectBrightspace } from "@/lib/mutations/integrations/useDisconnectBrightspace";
import { useImportBrightspaceCourses } from "@/lib/mutations/integrations/useImportBrightspaceCourses";
import { useSaveBrightspaceCourses } from "@/lib/mutations/integrations/useSaveBrightspaceCourses";
import { useSyncBrightspace } from "@/lib/mutations/integrations/useSyncBrightspace";
import { useBrightspaceStatus } from "@/lib/queries/integrations/useBrightspaceStatus";
import { useCurrentUser } from "@/lib/queries/users/useCurrentUser";
import type {
  BrightspaceConnectionDto,
  BrightspaceCourseLinkDto,
  BrightspaceSyncResultDto,
} from "@/types/api/integrations";

export function IntegrationsTab() {
  return <BrightspaceCard />;
}

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback;

/** "Synced: 3 new, 1 updated", or the reason it failed. */
function reportSync(sync: BrightspaceSyncResultDto) {
  if (!sync.ok) {
    toast.error(sync.error);
    return;
  }
  const parts = [
    sync.added && `${sync.added} new`,
    sync.updated && `${sync.updated} updated`,
    sync.removed && `${sync.removed} removed`,
  ].filter(Boolean);
  toast.success(parts.length ? `Brightspace synced: ${parts.join(", ")}` : "Brightspace is up to date");
}

function BrightspaceCard() {
  const { data: status, isLoading, error } = useBrightspaceStatus();

  return (
    <div className="p-6 rounded-2xl bg-background border border-border/60 space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <GraduationCap className="w-5 h-5 text-primary" aria-hidden />
          <h3 className="text-lg font-semibold text-foreground">Brightspace</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Bring your assignment and quiz due dates from Brightspace into your deadlines, with
          reminders. Lumina checks for changes every few hours.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          Checking your connection…
        </div>
      ) : error || !status ? (
        <p className="text-sm text-muted-foreground">
          {errorMessage(error, "Brightspace isn't available right now. Try again later.")}
        </p>
      ) : status.connected ? (
        <Connected connection={status} />
      ) : (
        <ConnectForm />
      )}
    </div>
  );
}

export function ConnectForm({
  onDone,
  submitLabel = "Connect",
}: {
  onDone?: () => void;
  submitLabel?: string;
}) {
  const connect = useConnectBrightspace();
  const [url, setUrl] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProblem(null);
    try {
      const response = await connect.mutateAsync(url.trim());
      reportSync(response.sync);
      setUrl("");
      onDone?.();
    } catch (err) {
      setProblem(errorMessage(err, "We couldn't connect that link. Try again."));
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <ol className="space-y-1.5 text-sm text-muted-foreground list-decimal pl-5">
        <li>Open Brightspace and go to <span className="font-medium text-foreground">Calendar</span>.</li>
        <li>
          Choose <span className="font-medium text-foreground">Subscribe</span> (you may need to
          turn on calendar feeds in Calendar settings first).
        </li>
        <li>Pick <span className="font-medium text-foreground">All courses</span>, copy the link, and paste it below.</li>
      </ol>
      <div className="space-y-2">
        <Label htmlFor="brightspace-feed">Calendar link</Label>
        <Input
          id="brightspace-feed"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://yourschool.brightspace.com/d2l/le/calendar/feed/…"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={problem ? true : undefined}
          aria-describedby={problem ? "brightspace-feed-problem" : "brightspace-feed-help"}
        />
        {problem ? (
          <p id="brightspace-feed-problem" className="text-sm text-destructive">
            {problem}
          </p>
        ) : (
          <p id="brightspace-feed-help" className="text-xs text-muted-foreground">
            This link works like a password for your calendar. Lumina stores it encrypted and never
            shows it again.
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={!url.trim() || connect.isPending}>
          {connect.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />
          ) : (
            <Link2 className="w-4 h-4 mr-2" aria-hidden />
          )}
          {connect.isPending ? "Checking the link…" : submitLabel}
        </Button>
        {onDone && (
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

function Connected({ connection }: { connection: BrightspaceConnectionDto }) {
  const sync = useSyncBrightspace();
  const disconnect = useDisconnectBrightspace();
  const [replacing, setReplacing] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const syncNow = async () => {
    try {
      reportSync((await sync.mutateAsync()).sync);
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't sync Brightspace"));
    }
  };

  const lastSynced = connection.lastSyncedAt
    ? `Synced ${formatDistanceToNow(connection.lastSyncedAt, { addSuffix: true })}`
    : "Not synced yet";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{connection.host}</p>
          <p className="text-xs text-muted-foreground">
            {lastSynced} · {connection.deadlineCount} deadline{connection.deadlineCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={syncNow} disabled={sync.isPending}>
            <RefreshCw className={`w-4 h-4 mr-2 ${sync.isPending ? "animate-spin" : ""}`} aria-hidden />
            Sync now
          </Button>
          <Button variant="outline" size="sm" onClick={() => setReplacing((v) => !v)}>
            <Link2 className="w-4 h-4 mr-2" aria-hidden />
            Replace link
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmDisconnect(true)}
          >
            <Unplug className="w-4 h-4 mr-2" aria-hidden />
            Disconnect
          </Button>
        </div>
      </div>

      {connection.status === "error" && connection.lastError && (
        <div
          role="alert"
          className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-foreground"
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-destructive" aria-hidden />
          <p>{connection.lastError}</p>
        </div>
      )}

      {replacing && (
        <div className="rounded-xl border border-border/60 p-4">
          <ConnectForm submitLabel="Save new link" onDone={() => setReplacing(false)} />
        </div>
      )}

      <CourseMatching courses={connection.courses} />

      <AlertDialog open={confirmDisconnect} onOpenChange={setConfirmDisconnect}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Brightspace?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the {connection.deadlineCount} deadline
              {connection.deadlineCount === 1 ? "" : "s"} synced from Brightspace, including ones
              you&apos;ve ticked off. Deadlines you added yourself stay.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep connected</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={async () => {
                try {
                  await disconnect.mutateAsync();
                  toast.success("Brightspace disconnected");
                } catch (err) {
                  toast.error(errorMessage(err, "Couldn't disconnect Brightspace"));
                }
              }}
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const NOT_MATCHED = "__none";
const IGNORED = "__ignore";

type Choice = Pick<BrightspaceCourseLinkDto, "courseId" | "ignored">;

const choiceValue = (choice: Choice) =>
  choice.ignored ? IGNORED : (choice.courseId ?? NOT_MATCHED);

function CourseMatching({ courses }: { courses: BrightspaceCourseLinkDto[] }) {
  const { data: userData } = useCurrentUser();
  const save = useSaveBrightspaceCourses();
  const importCourses = useImportBrightspaceCourses();
  // Only the rows the student has changed; everything else shows the saved value.
  const [edits, setEdits] = useState<Record<string, Choice>>({});
  const own = userData?.courses ?? [];

  if (courses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No courses found in your calendar yet. They&apos;ll appear here once Brightspace lists
        something with a due date.
      </p>
    );
  }

  const current = (course: BrightspaceCourseLinkDto) => edits[course.id] ?? course;
  const changed = courses.filter((course) => {
    const edit = edits[course.id];
    return edit && choiceValue(edit) !== choiceValue(course);
  });

  const unmatched = courses.filter((course) => !course.courseId && !course.ignored).length;

  const createCourses = async () => {
    try {
      const response = await importCourses.mutateAsync();
      setEdits({});
      const made = response.imported ?? 0;
      toast.success(made === 1 ? "Added 1 module from Brightspace" : `Added ${made} modules from Brightspace`);
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't create the modules"));
    }
  };

  const submit = async () => {
    try {
      const response = await save.mutateAsync(
        courses.map((course) => ({ id: course.id, ...current(course) })),
      );
      setEdits({});
      reportSync(response.sync);
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't save your module choices"));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Modules</h4>
          <p className="text-xs text-muted-foreground">
            Match each Brightspace module to one of yours so its deadlines land in the right place.
          </p>
        </div>
        {unmatched > 0 && (
          <Button size="sm" variant="outline" onClick={createCourses} disabled={importCourses.isPending}>
            {importCourses.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />
            ) : (
              <FolderPlus className="w-4 h-4 mr-2" aria-hidden />
            )}
            {unmatched === 1 ? "Create 1 module" : `Create ${unmatched} modules`} from Brightspace
          </Button>
        )}
      </div>
      <ul className="divide-y divide-border/60 rounded-xl border border-border/60">
        {courses.map((course) => (
          <li key={course.id} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-foreground min-w-0 truncate" title={course.name}>
              {course.name}
            </span>
            <Select
              value={choiceValue(current(course))}
              onValueChange={(value) =>
                setEdits((prev) => ({
                  ...prev,
                  [course.id]:
                    value === IGNORED
                      ? { courseId: null, ignored: true }
                      : { courseId: value === NOT_MATCHED ? null : value, ignored: false },
                }))
              }
            >
              <SelectTrigger className="w-full sm:w-56" aria-label={`Lumina course for ${course.name}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NOT_MATCHED}>No module</SelectItem>
                {own.map((mine) => (
                  <SelectItem key={mine.id} value={mine.id}>
                    {mine.code ? `${mine.code} · ${mine.name}` : mine.name}
                  </SelectItem>
                ))}
                <SelectItem value={IGNORED}>Don&apos;t sync this module</SelectItem>
              </SelectContent>
            </Select>
          </li>
        ))}
      </ul>
      {changed.length > 0 && (
        <div className="flex gap-2">
          <Button size="sm" onClick={submit} disabled={save.isPending}>
            {save.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />}
            Save modules
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEdits({})} disabled={save.isPending}>
            Undo changes
          </Button>
        </div>
      )}
    </div>
  );
}
