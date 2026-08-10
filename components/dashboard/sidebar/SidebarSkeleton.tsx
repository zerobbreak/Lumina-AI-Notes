import { Layers } from "lucide-react";

/**
 * Placeholder shown while the real Sidebar's chunk is loading. Mirrors its
 * width/structure so navigation affordance is visible immediately instead
 * of a blank gap, and layout doesn't jump when the real sidebar mounts.
 */
export function SidebarSkeleton() {
  return (
    <div
      className="h-screen shrink-0 w-[260px] border-r border-sidebar-border bg-sidebar flex flex-col overflow-hidden"
      aria-hidden
    >
      <div className="pt-3 pb-2 px-3 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="w-[22px] h-[22px] rounded-[5px] bg-linear-to-br from-primary/90 to-primary/60 flex items-center justify-center shrink-0">
            <Layers className="w-3 h-3 text-primary-foreground" />
          </div>
          <span className="font-semibold text-[13px] tracking-tight text-sidebar-foreground/70 truncate">
            Lumina
          </span>
        </div>
        <div className="h-[30px] w-full rounded-md bg-sidebar-accent/40 animate-pulse" />
      </div>
      <div className="flex-1 px-3 space-y-5 py-1">
        {Array.from({ length: 3 }).map((_, section) => (
          <div key={section} className="space-y-1.5">
            <div className="h-3 w-16 rounded bg-sidebar-accent/40 animate-pulse" />
            <div className="h-[26px] w-full rounded-md bg-sidebar-accent/25 animate-pulse" />
            <div className="h-[26px] w-5/6 rounded-md bg-sidebar-accent/25 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="p-3 flex items-center gap-2 border-t border-sidebar-border/50">
        <div className="w-7 h-7 rounded-full bg-sidebar-accent/40 animate-pulse shrink-0" />
        <div className="h-3 w-24 rounded bg-sidebar-accent/40 animate-pulse" />
      </div>
    </div>
  );
}
