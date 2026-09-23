/**
 * The code-split dashboard views. `page.tsx` renders them through `lazy()`,
 * and the sidebar calls the same loaders on hover, so a view's chunk is
 * usually downloaded before the click instead of after it. `import()` caches
 * the module, so loading one twice costs nothing.
 */
export const viewLoaders = {
  note: () => import("@/components/dashboard/editor/NoteView"),
  folder: () => import("@/components/dashboard/views/FolderView"),
  home: () => import("@/components/dashboard/views/SmartFolderHub"),
  flashcards: () => import("@/components/dashboard/flashcards/FlashcardsView"),
  flashcardStudy: () => import("@/components/dashboard/flashcards/FlashcardStudy"),
  quizzes: () => import("@/components/dashboard/quizzes/QuizzesView"),
  quizTaking: () => import("@/components/dashboard/quizzes/QuizTaking"),
  archive: () => import("@/components/dashboard/views/ArchiveView"),
  calendar: () => import("@/components/dashboard/views/CalendarView"),
  studio: () => import("@/components/dashboard/views/NoteStudioView"),
} as const;

export type DashboardViewName = keyof typeof viewLoaders;

/** The view a `view` search param opens; null is the hub. */
export function viewForParam(view: string | null): DashboardViewName | null {
  if (view === null) return "home";
  return view in viewLoaders ? (view as DashboardViewName) : null;
}

/** Starts downloading a view's chunk. Failures are left to the real render. */
export function preloadView(name: DashboardViewName | null): void {
  if (!name) return;
  viewLoaders[name]().catch(() => {});
}

/**
 * Downloads every view's chunk once the browser is idle, so even a view the
 * pointer never hovered (keyboard, command palette) opens without a fetch.
 */
export function preloadAllViewsWhenIdle(): () => void {
  const run = () => {
    for (const name of Object.keys(viewLoaders) as DashboardViewName[]) preloadView(name);
  };
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(run, { timeout: 5000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(run, 2000);
  return () => window.clearTimeout(id);
}
