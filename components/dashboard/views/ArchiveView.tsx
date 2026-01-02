"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { Archive, RotateCcw, Trash2, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ArchiveView() {
  const archivedNotes = useQuery(api.notes.getArchivedNotes);
  const unarchiveNote = useMutation(api.notes.toggleArchiveNote);
  const deleteNote = useMutation(api.notes.deleteNote);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredNotes = archivedNotes?.filter((note) =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUnarchive = async (noteId: Id<"notes">, title: string) => {
    try {
      await unarchiveNote({ noteId });
      toast.success(`Restored "${title}"`);
    } catch (error) {
      toast.error("Failed to restore note");
    }
  };

  const handleDelete = async (noteId: Id<"notes">) => {
    try {
      await deleteNote({ noteId });
      toast.success("Note deleted permanently");
    } catch (error) {
      toast.error("Failed to delete note");
    }
  };

  if (archivedNotes === undefined) {
    return (
      <div className="flex-1 h-full bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-gray-500 animate-pulse">Loading archive...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full bg-[#0A0A0A] flex flex-col overflow-hidden relative z-0">
      {/* Header */}
      <div className="h-16 border-b border-white/6 flex items-center justify-between px-6 shrink-0 bg-[#0A0A0A]/50 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <Archive className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <h1 className="text-white font-semibold flex items-center gap-2">
              Archive
              <span className="text-xs font-normal text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                {archivedNotes.length}
              </span>
            </h1>
          </div>
        </div>

        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Search archive..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white/5 border-white/5 text-sm"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {filteredNotes && filteredNotes.length > 0 ? (
            <div className="grid gap-3">
              {filteredNotes.map((note) => (
                <div
                  key={note._id}
                  className="group flex items-center justify-between p-4 rounded-xl bg-white/3 border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium mb-1">
                        {note.title}
                      </h3>
                      <p className="text-xs text-gray-500">
                        Archived {formatDistanceToNow(note._creationTime)} ago
                        {note.courseId && " • Course related"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnarchive(note._id, note.title)}
                      className="text-gray-400 hover:text-green-400 hover:bg-green-500/10 gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Restore
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-red-400 hover:bg-red-500/10 gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Forever
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-[#121212] border-white/10 text-white">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete forever?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This note will be
                            permanently deleted from our servers.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/5">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(note._id)}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            Delete Forever
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Archive className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="text-white font-medium mb-2">No archived notes</h3>
              <p className="text-gray-500 text-sm max-w-xs">
                {searchQuery
                  ? "No notes found matching your search."
                  : "Notes you archive will appear here."}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
