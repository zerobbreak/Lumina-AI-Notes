"use client";

import * as React from "react";
import { Moon, Sun, Laptop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppearance } from "@/components/providers/AppearanceProvider";
import { MODES } from "@/lib/appearance/model";
import { cn } from "@/lib/utils";

const THEME_ICON = {
  light: Sun,
  dark: Moon,
  system: Laptop,
} as const;

/**
 * Single-button light/dark/system switch for tight spots like the sidebar
 * footer. Flips the current world between its light and dark variants.
 */
export function ThemeCycleButton({ className }: { className?: string }) {
  const { appearance, updateAppearance } = useAppearance();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const current = mounted ? appearance.mode : "system";
  const Icon = THEME_ICON[current];
  const next = MODES[(MODES.indexOf(current) + 1) % MODES.length]!;

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "h-7 w-7 rounded-md text-muted-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
        className,
      )}
      onClick={() => updateAppearance({ mode: next })}
      aria-label={`Theme: ${current}. Switch to ${next}.`}
      title={`Theme: ${current} — switch to ${next}`}
    >
      <Icon className="h-[14px] w-[14px]" />
    </Button>
  );
}
