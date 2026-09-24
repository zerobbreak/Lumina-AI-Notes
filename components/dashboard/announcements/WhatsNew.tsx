"use client";

import { format } from "date-fns";
import { ArrowRight, RotateCcw, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AnnouncementAction } from "@/lib/announcements/registry";
import { useAnnouncements } from "@/lib/announcements/useAnnouncements";
import { useResetAnnouncementEvents } from "@/lib/mutations/announcements/useResetAnnouncementEvents";
import { cn } from "@/lib/utils";

const IS_DEV = process.env.NODE_ENV !== "production";

/**
 * The sidebar's "What's new" entry: an unread dot, and a feed of every
 * announcement meant for this user. Opening the feed marks them all seen.
 * Hidden in production until there's something in the feed.
 */
export function WhatsNew({
  isRail,
  onAction,
}: {
  isRail: boolean;
  onAction: (action: AnnouncementAction) => void;
}) {
  const { feed, unread, ready, record } = useAnnouncements();
  const reset = useResetAnnouncementEvents();
  const [open, setOpen] = useState(false);
  // Opening marks everything seen; this keeps the dots on for as long as the
  // feed stays open, so the user can still tell what was new.
  const [newThisVisit, setNewThisVisit] = useState<ReadonlySet<string>>(new Set());

  if (!ready || (!feed.length && !IS_DEV)) return null;

  const hasUnread = unread.length > 0;

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) return;
    setNewThisVisit(new Set(unread.map((a) => a.id)));
    for (const a of unread) record(a.id, "seen");
  };

  const dot = hasUnread && (
    <span
      aria-hidden
      className={cn(
        "h-1.5 w-1.5 rounded-full bg-primary",
        isRail && "absolute right-1.5 top-1.5 ring-2 ring-sidebar",
      )}
    />
  );
  const label = hasUnread ? `What's new (${unread.length} unread)` : "What's new";

  const trigger = isRail ? (
    <Button
      variant="ghost"
      size="icon"
      className="relative h-8 w-8 rounded-md text-muted-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
      aria-label={label}
    >
      <Sparkles className="h-[15px] w-[15px]" />
      {dot}
    </Button>
  ) : (
    <button
      type="button"
      aria-label={label}
      className="mb-1 flex h-7 w-full items-center gap-2.5 rounded-md px-2 text-[13px] text-sidebar-foreground/80 transition-colors duration-100 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar"
    >
      <Sparkles className="h-[14px] w-[14px] shrink-0 opacity-70" />
      <span className="flex-1 truncate text-left">What&apos;s new</span>
      {dot}
    </button>
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      {isRail ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>{trigger}</PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">What&apos;s new</TooltipContent>
        </Tooltip>
      ) : (
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      )}
      <PopoverContent side="right" align="end" className="w-80 p-0">
        <div className="border-b border-border px-3 py-2.5">
          <h2 className="text-sm font-semibold text-foreground">What&apos;s new</h2>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {feed.length === 0 ? (
            <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">
              Nothing new yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {feed.map((a) => (
                <li key={a.id} className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    {newThisVisit.has(a.id) && (
                      <span aria-label="Unread" className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    )}
                    <h3 className="flex-1 text-[13px] font-medium text-foreground">{a.title}</h3>
                    <time
                      dateTime={new Date(a.publishedAt).toISOString()}
                      className="shrink-0 text-[11px] text-muted-foreground"
                    >
                      {format(a.publishedAt, "d MMM")}
                    </time>
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{a.body}</p>
                  {a.cta && (
                    <button
                      type="button"
                      onClick={() => {
                        record(a.id, "clicked");
                        setOpen(false);
                        onAction(a.cta!.action);
                      }}
                      className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:underline"
                    >
                      {a.cta.label}
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {IS_DEV && (
          <div className="border-t border-dashed border-border px-3 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-full text-[12px] text-muted-foreground"
              disabled={reset.isPending}
              onClick={() => reset.mutate()}
            >
              <RotateCcw className="mr-1.5 h-3 w-3" />
              Reset announcements (dev)
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
