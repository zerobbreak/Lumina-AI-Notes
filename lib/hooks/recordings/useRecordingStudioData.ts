"use client";

import { useRecordings } from "@/lib/queries/recordings/useRecordings";

/** Saved recordings for the sidebar's Capture section (REST). */
export function useRecordingStudioData() {
  const restRecordings = useRecordings();
  return restRecordings.data;
}
