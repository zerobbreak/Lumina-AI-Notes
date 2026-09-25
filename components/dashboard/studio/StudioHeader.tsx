"use client";

import { StudioModeToggle, type StudioMode } from "./StudioModeToggle";

interface StudioHeaderProps {
  mode: StudioMode;
  onModeChange: (mode: StudioMode) => void;
  title: string;
  subtitle: string;
}

/**
 * The Studio's top bar, shared by Graph and Chat so the title and the view
 * toggle stay put when switching.
 */
export function StudioHeader({ mode, onModeChange, title, subtitle }: StudioHeaderProps) {
  return (
    <header className="z-10 flex h-14 flex-shrink-0 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur">
      <div className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="shrink-0 text-sm font-semibold tracking-tight">Studio</span>
        <span className="shrink-0 text-muted-foreground/60">/</span>
        <h1 className="min-w-0 truncate text-sm font-medium">{title}</h1>
        <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{subtitle}</span>
      </div>
      <StudioModeToggle value={mode} onChange={onModeChange} className="shrink-0" />
    </header>
  );
}
