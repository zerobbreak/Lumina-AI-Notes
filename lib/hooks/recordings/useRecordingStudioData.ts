"use client";

import { useRecordings } from "@/lib/queries/recordings/useRecordings";

/** Saved recordings for SidebarStudio (REST). */
export function useRecordingStudioData() {
  const restRecordings = useRecordings();
  return restRecordings.data;
}
