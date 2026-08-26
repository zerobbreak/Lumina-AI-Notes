import type { ReactNode } from "react";

/**
 * Public share links are unbounded (any note ID) and only make sense on the
 * live web server — nothing inside the desktop app links here. `output:
 * 'export'` (Electron packaging) requires at least one static param for a
 * dynamic segment, so this is a single unreachable placeholder purely to
 * satisfy that build requirement; normal server deployments ignore it and
 * still render real note IDs on demand since dynamicParams defaults to true.
 */
export function generateStaticParams() {
  return [{ noteId: "_static-export-placeholder" }];
}

export default function ShareNoteLayout({ children }: { children: ReactNode }) {
  return children;
}
