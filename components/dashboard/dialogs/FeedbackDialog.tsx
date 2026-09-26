"use client";

import { useState } from "react";
import { Bug, Gauge, Heart, Lightbulb, Loader2, MessageCircle, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { lastLimitHit } from "@/lib/api/limits";
import { useAppCommands } from "@/lib/appCommands";
import { useSendFeedback } from "@/lib/mutations/feedback/useSendFeedback";
import { cn } from "@/lib/utils";
import type { FeedbackKind } from "@/types/api/feedback";

const KINDS: { kind: FeedbackKind; label: string; icon: LucideIcon; placeholder: string }[] = [
  { kind: "bug", label: "Bug", icon: Bug, placeholder: "What happened, and what did you expect to happen?" },
  { kind: "idea", label: "Idea", icon: Lightbulb, placeholder: "What would make Lumina more useful for you?" },
  { kind: "more", label: "Need more", icon: Gauge, placeholder: "Which limit gets in your way, and how do you use it?" },
  { kind: "praise", label: "Love it", icon: Heart, placeholder: "What's working well for you?" },
  { kind: "other", label: "Other", icon: MessageCircle, placeholder: "Anything on your mind." },
];

const MAX_MESSAGE = 4000;

/** "desktop · Chrome" / "web · Safari": enough to reproduce a bug, nothing more. */
export function describeApp(): string {
  const surface = typeof window !== "undefined" && "electronAPI" in window ? "desktop" : "web";
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\//.test(ua)
      ? "Firefox"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : "other browser";
  return `${surface} · ${browser}`;
}

/**
 * Beta feedback, from anywhere: the sidebar button, the command palette, or
 * "Ask for more" on a limit notice. Opened with the "feedback" app command.
 */
export function FeedbackDialog() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackKind>("idea");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState<number | undefined>();
  const [limit, setLimit] = useState<{ code: string; message: string } | null>(null);
  const send = useSendFeedback();

  useAppCommands((id) => {
    if (id !== "feedback" && id !== "feedback:more") return;
    const asksForMore = id === "feedback:more";
    setKind(asksForMore ? "more" : "idea");
    setLimit(asksForMore ? lastLimitHit() : null);
    setOpen(true);
  });

  const current = KINDS.find((k) => k.kind === kind)!;
  const canSend = message.trim().length > 0 && !send.isPending;

  const submit = () => {
    if (!canSend) return;
    send.mutate(
      {
        kind,
        message: message.trim(),
        rating,
        page: `${window.location.pathname}${window.location.search}`.slice(0, 300),
        limitCode: kind === "more" ? limit?.code : undefined,
        app: describeApp(),
      },
      {
        onSuccess: () => {
          toast.success("Thanks! Your feedback was sent.");
          setOpen(false);
          setMessage("");
          setRating(undefined);
          setLimit(null);
        },
        onError: (error) => toast.error(error.message || "Couldn't send your feedback. Try again."),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[480px] bg-background border-border text-foreground">
        <DialogHeader>
          <DialogTitle>Send feedback</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Lumina is in beta. Everything you send goes straight to the person building it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div role="radiogroup" aria-label="Kind of feedback" className="flex flex-wrap gap-1.5">
            {KINDS.map(({ kind: k, label, icon: Icon }) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                onClick={() => setKind(k)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                  kind === k
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {label}
              </button>
            ))}
          </div>

          {kind === "more" && limit && (
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              About: {limit.message}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="feedback-message" className="sr-only">
              Your feedback
            </Label>
            <textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={current.placeholder}
              rows={5}
              autoFocus
              className="w-full resize-none rounded-md border border-border bg-foreground/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground" id="feedback-rating-label">
              How&apos;s Lumina so far? <span className="opacity-70">(optional)</span>
            </span>
            <div role="radiogroup" aria-labelledby="feedback-rating-label" className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} out of 5`}
                  onClick={() => setRating(rating === n ? undefined : n)}
                  className={cn(
                    "h-7 w-7 rounded-md border text-xs tabular-nums transition-colors",
                    rating === n
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-foreground/5",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSend}>
            {send.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
