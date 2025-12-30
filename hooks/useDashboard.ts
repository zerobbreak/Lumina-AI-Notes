"use client";

import { useContext } from "react";
import { DashboardContext } from "@/components/dashboard/DashboardContext";

/**
 * Hook to access dashboard state and controls
 * Must be used within a DashboardProvider
 */
export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}
