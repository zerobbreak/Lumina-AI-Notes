"use client";

import * as React from "react";
import { Moon, Sun, Laptop } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const THEME_CYCLE = ["light", "dark", "system"] as const;

const THEME_ICON = {
  light: Sun,
  dark: Moon,
  system: Laptop,
} as const;

/**
 * Single-button variant for tight spots like the sidebar footer, where the
 * three-segment control costs a whole row.
 */
export function ThemeCycleButton({ className }: { className?: string }) {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const current = (
    mounted && theme && theme in THEME_ICON ? theme : "system"
  ) as keyof typeof THEME_ICON;
  const Icon = THEME_ICON[current];
  const next = THEME_CYCLE[(THEME_CYCLE.indexOf(current) + 1) % THEME_CYCLE.length]!;

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "h-7 w-7 rounded-md text-muted-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
        className,
      )}
      onClick={() => setTheme(next)}
      aria-label={`Theme: ${current}. Switch to ${next}.`}
      title={`Theme: ${current} — switch to ${next}`}
    >
      <Icon className="h-[14px] w-[14px]" />
    </Button>
  );
}

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-1 p-1 bg-zinc-800/50 rounded-lg border border-sidebar-border">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-md text-muted-foreground"
        >
          <Sun className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-md text-muted-foreground"
        >
          <Laptop className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-md text-muted-foreground"
        >
          <Moon className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 p-1 bg-zinc-800/50 rounded-lg border border-sidebar-border">
      <Button
        variant="ghost"
        size="icon"
        className={`h-7 w-7 rounded-md ${theme === "light" ? "bg-zinc-200 text-black shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        onClick={() => setTheme("light")}
        title="Light Mode"
      >
        <Sun className="h-4 w-4" />
        <span className="sr-only">Light</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={`h-7 w-7 rounded-md ${theme === "system" ? "bg-zinc-800 text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        onClick={() => setTheme("system")}
        title="System Preference"
      >
        <Laptop className="h-4 w-4" />
        <span className="sr-only">System</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={`h-7 w-7 rounded-md ${theme === "dark" ? "bg-zinc-800 text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        onClick={() => setTheme("dark")}
        title="Dark Mode"
      >
        <Moon className="h-4 w-4" />
        <span className="sr-only">Dark</span>
      </Button>
    </div>
  );
}
