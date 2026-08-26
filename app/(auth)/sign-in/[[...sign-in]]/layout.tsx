import type { ReactNode } from "react";

/** Required for `output: 'export'` (Electron packaging). Clerk still hydrates client-side. */
export function generateStaticParams() {
  return [{ "sign-in": [] as string[] }];
}

export default function SignInCatchAllLayout({ children }: { children: ReactNode }) {
  return children;
}
