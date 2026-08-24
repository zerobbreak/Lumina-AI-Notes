import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
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

type DeadlineKind = "assignment" | "exam" | "event" | "task";

function kindToTone(kind: DeadlineKind) {
  if (kind === "exam" || kind === "assignment") return "red";
  if (kind === "event") return "amber";
  return "slate";
}

function pillClasses(tone: ReturnType<typeof kindToTone>) {
  if (tone === "red")
    return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
  if (tone === "amber")
    return "bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/20";
  return "bg-muted/30 text-muted-foreground border-border dark:bg-white/5";
}

function kindLabel(kind: DeadlineKind) {
  if (kind === "assignment") return "ASSIGNMENT";
  if (kind === "exam") return "EXAM";
  if (kind === "event") return "EVENT";
  return "TASK";
}

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

export function AcademicPipeline({ className }: { className?: string }) {
  const createDeadline = useMutation(api.deadlines.createDeadline);
  const upcoming = useQuery(api.deadlines.getUpcoming, {
    limit: 6,
    windowDays: 30,
  });
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
        "rounded-2xl border border-border bg-card p-5 shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:bg-black/40 dark:shadow-none dark:ring-0",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden />
          Academic pipeline
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent dark:hover:bg-white/5"
          onClick={() => setIsAddOpen(true)}
        >
          Add
        </Button>
      </div>

      <div className="mt-4 space-y-2.5">
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
          upcoming.map((d) => {
            const tone = kindToTone(d.kind as DeadlineKind);
            return (
              <div key={d._id} className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-muted-foreground/25" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {d.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatWhenLabel(d.dueAt)}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold tracking-wide",
                    pillClasses(tone),
                  )}
                >
                  {kindLabel(d.kind as DeadlineKind)}
                </span>
              </div>
            );
          })
        )}
      </div>

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

