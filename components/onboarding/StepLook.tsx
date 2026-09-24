"use client";

import { Check, Laptop, Moon, Sun } from "lucide-react";
import { useAppearance } from "@/components/providers/AppearanceProvider";
import { Segmented, WorldPreview } from "@/components/shared/AppearanceControls";
import { WORLD_INFO, worldInfo } from "@/lib/appearance/catalog";
import { cn } from "@/lib/utils";

/**
 * "Pick your look": world and mode only. Each pick applies (and saves) at
 * once, so this whole page restyles as a live preview. Accent, fonts and
 * reading options wait for Settings → Appearance.
 */
export function StepLook() {
  const { appearance, resolvedMode, updateAppearance } = useAppearance();
  const world = worldInfo(appearance.world);

  return (
    <div className="flex flex-col gap-6 flex-1 min-h-0 overflow-y-auto pr-1 -mr-1 [scrollbar-gutter:stable]">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Choose a world to study in. You can fine-tune the accent, fonts and reading size later in
        Settings.
      </p>

      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="World">
        {WORLD_INFO.map((w) => {
          const active = appearance.world === w.id;
          return (
            <button
              key={w.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => updateAppearance({ world: w.id })}
              className={cn(
                "relative rounded-xl border p-2 text-left transition-all",
                active
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border hover:border-foreground/30",
              )}
            >
              <WorldPreview world={w} mode={resolvedMode} />
              <div className="px-1 pt-2 pb-0.5">
                <p className="text-sm font-semibold text-foreground">{w.names[resolvedMode]}</p>
                <p className="text-xs text-muted-foreground leading-snug">{w.blurb}</p>
              </div>
              {active && (
                <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mode</p>
        <Segmented
          value={appearance.mode}
          onChange={(mode) => updateAppearance({ mode })}
          options={[
            { id: "light", label: <ModeLabel icon={Sun} text={world.names.light} /> },
            { id: "dark", label: <ModeLabel icon={Moon} text={world.names.dark} /> },
            { id: "system", label: <ModeLabel icon={Laptop} text="Match device" /> },
          ]}
        />
      </div>
    </div>
  );
}

function ModeLabel({ icon: Icon, text }: { icon: typeof Sun; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5" />
      {text}
    </span>
  );
}
