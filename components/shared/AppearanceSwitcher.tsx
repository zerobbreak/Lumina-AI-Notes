"use client";

import { Laptop, Moon, Palette, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAppearance } from "@/components/providers/AppearanceProvider";
import { Segmented, WorldPreview } from "@/components/shared/AppearanceControls";
import { ACCENT_INFO, WORLD_INFO } from "@/lib/appearance/catalog";
import { cn } from "@/lib/utils";

/**
 * Sidebar-footer popover for the everyday switches: world, mode, accent.
 * Everything else lives on the Appearance settings tab.
 */
export function AppearanceSwitcher({
  onOpenSettings,
  className,
}: {
  onOpenSettings: () => void;
  className?: string;
}) {
  const { appearance, resolvedMode, updateAppearance } = useAppearance();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 shrink-0 rounded-md text-muted-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            className,
          )}
          aria-label="Appearance"
          title="Appearance"
        >
          <Palette className="h-[14px] w-[14px]" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-80 space-y-4 p-3">
        <div className="grid grid-cols-2 gap-2">
          {WORLD_INFO.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => updateAppearance({ world: w.id })}
              aria-pressed={appearance.world === w.id}
              className={cn(
                "rounded-lg border p-1 text-left transition-all",
                appearance.world === w.id
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border hover:border-foreground/30",
              )}
            >
              <WorldPreview world={w} mode={resolvedMode} className="h-12" />
              <span className="block px-1 pt-1 text-xs font-medium text-foreground">
                {w.names[resolvedMode]}
              </span>
            </button>
          ))}
        </div>

        <Segmented
          size="sm"
          value={appearance.mode}
          onChange={(mode) => updateAppearance({ mode })}
          options={[
            { id: "light", label: <ModeLabel icon={Sun} text="Light" /> },
            { id: "dark", label: <ModeLabel icon={Moon} text="Dark" /> },
            { id: "system", label: <ModeLabel icon={Laptop} text="System" /> },
          ]}
        />

        <div className="flex flex-wrap gap-1.5">
          {ACCENT_INFO.map((a) => {
            const active = appearance.accent.kind === "swatch" && appearance.accent.id === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => updateAppearance({ accent: { kind: "swatch", id: a.id } })}
                aria-pressed={active}
                aria-label={a.label}
                title={a.label}
                className={cn(
                  "h-6 w-6 rounded-full ring-offset-2 ring-offset-popover transition-all",
                  active ? "ring-2 ring-foreground/60" : "hover:scale-110",
                )}
                style={{ background: `hsl(${a.swatch})` }}
              />
            );
          })}
        </div>

        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full rounded-md px-2 py-1.5 text-left text-xs font-medium text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
        >
          Fonts, reading and more…
        </button>
      </PopoverContent>
    </Popover>
  );
}

function ModeLabel({ icon: Icon, text }: { icon: typeof Sun; text: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {text}
    </span>
  );
}
