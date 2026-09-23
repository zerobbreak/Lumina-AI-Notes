"use client";

import { usePendingFiles } from "@/lib/queries/files/usePendingFiles";

/** Pending PDF files awaiting processing (REST). */
export function usePendingFilesData() {
  const restPending = usePendingFiles();
  return restPending.data;
}
