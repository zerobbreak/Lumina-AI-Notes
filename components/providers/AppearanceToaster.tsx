"use client";

import { Toaster } from "sonner";
import { useAppearance } from "./AppearanceProvider";

export function AppearanceToaster() {
  const { resolvedMode } = useAppearance();
  return <Toaster theme={resolvedMode} position="bottom-right" />;
}
