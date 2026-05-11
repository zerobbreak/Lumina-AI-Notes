import type { ReactNode } from "react";

/** Required for `output: 'export'` (Electron packaging). Clerk still hydrates client-side. */
export function generateStaticParams() {
  return [{ "sign-up": [] as string[] }];
}

export default function SignUpCatchAllLayout({ children }: { children: ReactNode }) {
  return children;
}
