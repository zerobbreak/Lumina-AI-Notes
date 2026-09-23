"use client";

import { focusManager, onlineManager } from "@tanstack/react-query";
import { useEffect } from "react";

/**
 * Keeps TanStack Query's focus/online managers aligned with the browser tab.
 * Polling queries with `refetchIntervalInBackground: false` pause automatically
 * when the tab is hidden.
 */
export function useDashboardRealtime() {
  useEffect(() => {
    const onVisibility = () => {
      focusManager.setFocused(document.visibilityState === "visible");
    };

    const onOnline = () => onlineManager.setOnline(navigator.onLine);

    onVisibility();
    onOnline();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOnline);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOnline);
    };
  }, []);
}
