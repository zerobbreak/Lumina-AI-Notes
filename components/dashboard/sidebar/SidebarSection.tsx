"use client";

import { useCallback, useState, type ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_PREFIX = "lumina.sidebar.section.";

/**
 * Disclosure state that survives reloads, so a student who keeps Courses open
 * and Resources closed comes back to that arrangement.
 *
 * Read during initialization rather than in an effect: the sidebar is mounted
 * client-side only, so there is no server render to mismatch against.
 */
function usePersistedDisclosure(id: string, defaultOpen: boolean) {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === "undefined") return defaultOpen;
    try {
      const stored = window.localStorage.getItem(STORAGE_PREFIX + id);
      return stored === null ? defaultOpen : stored === "1";
    } catch {
      // Private mode or a full quota — the default is a fine fallback.
      return defaultOpen;
    }
  });

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_PREFIX + id, next ? "1" : "0");
      } catch {
        // Ignore: losing the preference is better than breaking the click.
      }
      return next;
    });
  }, [id]);

  return { isOpen, toggle };
}

interface SidebarSectionProps {
  /** Stable key for the persisted open state. */
  id: string;
  label: string;
  children: ReactNode;
  /** Right-aligned control revealed on hover, e.g. a create button. */
  action?: ReactNode;
  /** Shown in place of the children when the group has nothing in it. */
  emptyLabel?: string;
  isEmpty?: boolean;
  defaultOpen?: boolean;
}

export function SidebarSection({
  id,
  label,
  children,
  action,
  emptyLabel,
  isEmpty = false,
  defaultOpen = true,
}: SidebarSectionProps) {
  const { isOpen, toggle } = usePersistedDisclosure(id, defaultOpen);
  const contentId = `sidebar-section-${id}`;

  return (
    <div className="min-w-0">
      <div className="group/section flex items-center gap-1 pr-1">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={isOpen}
          aria-controls={contentId}
          className="flex min-w-0 flex-1 items-center gap-1 rounded px-2 py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar"
        >
          <ChevronDown
            className={cn(
              "h-2.5 w-2.5 shrink-0 text-muted-foreground/50 transition-transform duration-150",
              !isOpen && "-rotate-90",
            )}
          />
          <span className="select-none truncate text-[10px] font-semibold uppercase tracking-[0.07em] text-muted-foreground/70">
            {label}
          </span>
        </button>
        {action}
      </div>

      {isOpen && (
        <div id={contentId} className="space-y-px">
          {isEmpty && emptyLabel ? (
            <p className="px-2 py-1 text-[12px] text-muted-foreground/50">
              {emptyLabel}
            </p>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  );
}

interface SidebarSectionActionProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

/** Hover-revealed create/upload control for a section header. */
export function SidebarSectionAction({
  icon: Icon,
  label,
  onClick,
  disabled = false,
}: SidebarSectionActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="shrink-0 rounded p-1 text-muted-foreground/50 opacity-0 transition-all hover:bg-sidebar-accent/60 hover:text-sidebar-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring group-hover/section:opacity-100 disabled:opacity-40"
    >
      <Icon className="h-3 w-3" />
    </button>
  );
}
