"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Sparkles } from "lucide-react";

import NoteView from "@/components/dashboard/NoteView";
import FolderView from "@/components/dashboard/FolderView";
import SmartFolderHub from "@/components/dashboard/SmartFolderHub";

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const noteId = searchParams.get("noteId");
  const contextId = searchParams.get("contextId");
  const contextType = searchParams.get("contextType") as
    | "course"
    | "module"
    | null;

  const userData = useQuery(api.users.getUser);
  const router = useRouter();

  // Loading State
  if (userData === undefined) {
    return (
      <div className="h-full bg-black flex items-center justify-center text-gray-500">
        <div className="flex items-center gap-2 animate-pulse">
          <Sparkles className="w-5 h-5" />
          <span>Loading Workspace...</span>
        </div>
      </div>
    );
  }

  // --- VIEW 1: NOTE EDITOR ---
  if (noteId) {
    // NoteView handles its own loading states for the note data
    return (
      <NoteView
        noteId={noteId as Id<"notes">}
        onBack={() => router.push("/dashboard")}
      />
    );
  }

  // --- VIEW 2: SMART FOLDER OVERVIEW ---
  if (contextId) {
    return (
      <FolderView contextId={contextId} contextType={contextType || "course"} />
    );
  }

  // --- VIEW 3: SMART FOLDER HUB (HOME) ---
  return <SmartFolderHub />;
}
