"use client";

import { useDashboardRealtime } from "@/lib/hooks/realtime/useDashboardRealtime";

/** Mount inside the dashboard to pause REST polling when the tab is hidden. */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  useDashboardRealtime();
  return children;
}
