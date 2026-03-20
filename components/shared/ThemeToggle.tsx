"use client";

import * as React from "react";
import { Moon, Sun, Laptop } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

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
