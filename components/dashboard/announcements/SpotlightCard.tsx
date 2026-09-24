"use client";

import { ArrowRight, Sparkles, X } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { AnnouncementAction } from "@/lib/announcements/registry";
import { useAnnouncements } from "@/lib/announcements/useAnnouncements";
import { AnnouncementMedia } from "./AnnouncementMedia";

/**
 * The one-time card for a major announcement, bottom-right above the Ask AI
 * button. It stays until the user dismisses it or follows its call-to-action.
 * A card forced with `?announcement=` records nothing, so testing it doesn't
 * use it up.
 */
export function SpotlightCard({ onAction }: { onAction: (action: AnnouncementAction) => void }) {
  const { spotlight, spotlightForced, record, clearForced } = useAnnouncements();

  const spotlightId = spotlight?.id;
  useEffect(() => {
    if (spotlightId && !spotlightForced) record(spotlightId, "seen");
  }, [spotlightId, spotlightForced, record]);

  if (!spotlight) return null;

  const close = (kind: "dismissed" | "clicked") => {
    if (spotlightForced) clearForced();
    else record(spotlight.id, kind);
  };

  return (
    <aside
      aria-labelledby="spotlight-title"
      className="fixed inset-x-3 bottom-24 z-50 rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300 sm:inset-x-auto sm:right-6 sm:w-80"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-primary">
          <Sparkles className="h-3 w-3" />
          New in Lumina
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="-mr-2 -mt-2 h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={() => close("dismissed")}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {spotlight.media && (
        <div className="mb-3">
          <AnnouncementMedia media={spotlight.media} />
        </div>
      )}

      <h2 id="spotlight-title" className="text-sm font-semibold text-foreground">
        {spotlight.title}
      </h2>
      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{spotlight.body}</p>

      {spotlight.cta && (
        <Button
          size="sm"
          className="mt-3 w-full"
          onClick={() => {
            close("clicked");
            onAction(spotlight.cta!.action);
          }}
        >
          {spotlight.cta.label}
          <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      )}
    </aside>
  );
}
