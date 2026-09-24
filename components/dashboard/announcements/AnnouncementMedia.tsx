"use client";

import { useAppearance } from "@/components/providers/AppearanceProvider";
import { WorldPreview } from "@/components/shared/AppearanceControls";
import type { AnnouncementMedia as MediaId } from "@/lib/announcements/registry";
import { WORLD_INFO } from "@/lib/appearance/catalog";

/** Draws an announcement's named visual. Unknown names draw nothing. */
export function AnnouncementMedia({ media }: { media: MediaId }) {
  const { resolvedMode } = useAppearance();

  if (media === "appearance-worlds") {
    return (
      <div className="grid grid-cols-2 gap-1.5">
        {WORLD_INFO.map((world) => (
          <div key={world.id}>
            <WorldPreview world={world} mode={resolvedMode} className="h-10" />
            <span className="mt-0.5 block text-[10px] text-muted-foreground">
              {world.names[resolvedMode]}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return null;
}
