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
      <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg border border-white/10">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-md text-gray-400"
        >
          <Sun className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-md text-gray-400"
        >
          <Laptop className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-md text-gray-400"
        >
          <Moon className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg border border-white/10">
      <Button
        variant="ghost"
        size="icon"
        className={`h-7 w-7 rounded-md ${theme === "light" ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-white"}`}
        onClick={() => setTheme("light")}
        title="Light Mode"
      >
        <Sun className="h-4 w-4" />
        <span className="sr-only">Light</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={`h-7 w-7 rounded-md ${theme === "system" ? "bg-white/10 text-white shadow-sm" : "text-gray-400 hover:text-white"}`}
        onClick={() => setTheme("system")}
        title="System Preference"
      >
        <Laptop className="h-4 w-4" />
        <span className="sr-only">System</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={`h-7 w-7 rounded-md ${theme === "dark" ? "bg-white/10 text-white shadow-sm" : "text-gray-400 hover:text-white"}`}
        onClick={() => setTheme("dark")}
        title="Dark Mode"
      >
        <Moon className="h-4 w-4" />
        <span className="sr-only">Dark</span>
      </Button>
    </div>
  );
}
