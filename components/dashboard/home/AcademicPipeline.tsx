import { AlertTriangle, CalendarClock, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDeadlineActions } from "@/lib/hooks/mutations/useDeadlineActions";
import { useUpcomingDeadlines } from "@/lib/queries/deadlines/useUpcomingDeadlines";
import { useOverdueDeadlines } from "@/lib/queries/deadlines/useOverdueDeadlines";
import { useBrightspaceStatus } from "@/lib/queries/integrations/useBrightspaceStatus";
import { dispatchAppCommand } from "@/lib/appCommands";
import { DeadlineRow, type DeadlineKind } from "@/components/dashboard/deadlines/DeadlineRow";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMemo, useState } from "react";

function formatWhenLabel(dueAt: number) {
  const now = Date.now();
  const delta = dueAt - now;
  const minutes = Math.round(delta / 60_000);
  if (minutes <= 0) return "Due now";
  if (minutes < 60) return `In ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `In ${hours} hr`;
  const days = Math.round(hours / 24);
  if (days <= 7) return `In ${days} days`;
  return new Date(dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatOverdueLabel(dueAt: number, now: number) {
  const hours = Math.floor((now - dueAt) / 3_600_000);
  if (hours < 1) return "Just passed";
  if (hours < 24) return `${hours} hr overdue`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} overdue`;
}

/** Nudges toward connecting Brightspace, or flags a connection that stopped syncing. */
function BrightspaceHint() {
  const { data: status } = useBrightspaceStatus();
  if (!status) return null;
  const open = () => dispatchAppCommand("settings:integrations");

  if (!status.connected) {
    return (
      <button
        type="button"
        onClick={open}
        className="mt-4 flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground dark:hover:bg-foreground/5"
      >
        <GraduationCap className="w-4 h-4 shrink-0 text-primary" aria-hidden />
        Use Brightspace? Bring your due dates in automatically.
      </button>
    );
  }
  if (status.status === "error") {
    return (
      <button
        type="button"
        onClick={open}
        className="mt-4 flex w-full items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-left text-xs text-foreground hover:bg-destructive/10"
      >
        <AlertTriangle className="w-4 h-4 shrink-0 text-destructive" aria-hidden />
        Brightspace stopped syncing. Fix it in settings.
      </button>
    );
  }
  return null;
}

export function AcademicPipeline({ className }: { className?: string }) {
  const { createDeadline } = useDeadlineActions();
  const { data: upcoming } = useUpcomingDeadlines({ limit: 6, windowDays: 30 });
  const { data: overdue } = useOverdueDeadlines({ limit: 5 });
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftKind, setDraftKind] = useState<DeadlineKind>("assignment");
  const [draftDueLocal, setDraftDueLocal] = useState("");
  const [nowMs] = useState(() => Date.now());

  const canSubmit = useMemo(() => {
    if (!draftTitle.trim()) return false;
    if (!draftDueLocal.trim()) return false;
    const ms = new Date(draftDueLocal).getTime();
    return Number.isFinite(ms) && ms > nowMs - 60_000;
  }, [draftTitle, draftDueLocal, nowMs]);

  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-sm ring-1 ring-black/5 dark:bg-inset dark:shadow-none dark:ring-0",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-primary shrink-0" aria-hidden />
          Academic pipeline
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent dark:hover:bg-foreground/5"
          onClick={() => setIsAddOpen(true)}
        >
          Add
        </Button>
      </div>

      {overdue && overdue.length > 0 && (
        <div className="mt-4 space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-destructive">
            Overdue
          </p>
          {overdue.map((d) => (
            <DeadlineRow key={d._id} deadline={d} when={formatOverdueLabel(d.dueAt, nowMs)} overdue />
          ))}
        </div>
      )}

      <div className="mt-4 space-y-2.5">
        {overdue && overdue.length > 0 && upcoming && upcoming.length > 0 && (
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Coming up
          </p>
        )}
        {upcoming === undefined ? (
          <div className="text-xs text-muted-foreground">Loading…</div>
        ) : upcoming.length === 0 ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">No upcoming deadlines.</p>
            <p className="text-xs text-muted-foreground">
              Add due dates to get reminders as they approach.
            </p>
          </div>
        ) : (
          upcoming.map((d) => (
            <DeadlineRow key={d._id} deadline={d} when={formatWhenLabel(d.dueAt)} />
          ))
        )}
      </div>

      <BrightspaceHint />

      <Dialog
        open={isAddOpen}
        onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) {
            setDraftTitle("");
            setDraftKind("assignment");
            setDraftDueLocal("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add deadline</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="deadline-title">Title</Label>
              <Input
                id="deadline-title"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="e.g. Midterm review, Essay draft, Lab report…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={draftKind}
                  onValueChange={(v) => setDraftKind(v as DeadlineKind)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assignment">Assignment</SelectItem>
                    <SelectItem value="exam">Exam</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline-due">Due</Label>
                <Input
                  id="deadline-due"
                  type="datetime-local"
                  value={draftDueLocal}
                  onChange={(e) => setDraftDueLocal(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsAddOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!canSubmit}
              onClick={async () => {
                const dueAt = new Date(draftDueLocal).getTime();
                if (!Number.isFinite(dueAt)) return;
                await createDeadline({
                  title: draftTitle.trim(),
                  kind: draftKind,
                  dueAt,
                });
                setIsAddOpen(false);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

