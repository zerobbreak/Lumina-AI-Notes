import {
  Archive,
  Calendar,
  ClipboardList,
  Layers,
  LayoutGrid,
  PenLine,
  type LucideIcon,
} from "lucide-react";

/**
 * The fixed destinations of the dashboard.
 *
 * Every view lives on `/dashboard` behind a `view` search param, so a
 * destination is identified by that param rather than by a pathname. Bare
 * `/dashboard` is reserved for the resume gate.
 */
export interface DashboardNavItem {
  id: string;
  label: string;
  /** Value of the `view` search param, or null for the hub. */
  view: string | null;
  href: string;
  icon: LucideIcon;
  /** Shown under the label in the command palette. */
  description: string;
  /** Extra terms the command palette matches against. */
  keywords: string[];
  /**
   * Views that need the full width of the screen collapse the sidebar to the
   * rail when opened.
   */
  prefersRail?: boolean;
}

export const DASHBOARD_NAV: readonly DashboardNavItem[] = [
  {
    id: "home",
    label: "Home",
    view: "home",
    href: "/dashboard?view=home",
    icon: LayoutGrid,
    description: "Your courses and recent work",
    keywords: ["home", "dashboard", "hub", "overview", "main"],
  },
  {
    id: "studio",
    label: "Studio",
    view: "studio",
    href: "/dashboard?view=studio",
    icon: PenLine,
    description: "Draft and generate notes",
    keywords: ["studio", "workspace", "write", "generate", "capture"],
  },
  {
    id: "calendar",
    label: "Calendar",
    view: "calendar",
    href: "/dashboard?view=calendar",
    icon: Calendar,
    description: "Deadlines and study schedule",
    keywords: ["calendar", "schedule", "deadline", "due", "agenda"],
    prefersRail: true,
  },
  {
    id: "flashcards",
    label: "Flashcards",
    view: "flashcards",
    href: "/dashboard?view=flashcards",
    icon: Layers,
    description: "Review your decks",
    keywords: ["flashcards", "cards", "deck", "study", "recall"],
  },
  {
    id: "quizzes",
    label: "Quizzes",
    view: "quizzes",
    href: "/dashboard?view=quizzes",
    icon: ClipboardList,
    description: "Test yourself on a topic",
    keywords: ["quiz", "quizzes", "test", "exam", "practice"],
  },
  {
    id: "archive",
    label: "Archive",
    view: "archive",
    href: "/dashboard?view=archive",
    icon: Archive,
    description: "Archived notes and files",
    keywords: ["archive", "archived", "trash", "deleted", "hidden"],
  },
] as const;

/**
 * Which destination the current URL belongs to, or null when the URL points at
 * a note or a course/module folder rather than a destination.
 */
export function activeDashboardNavId(params: {
  view: string | null;
  noteId: string | null;
  contextId: string | null;
}): string | null {
  if (params.noteId) return null;
  if (params.view) {
    return DASHBOARD_NAV.find((item) => item.view === params.view)?.id ?? null;
  }
  if (params.contextId) return null;
  return "home";
}
