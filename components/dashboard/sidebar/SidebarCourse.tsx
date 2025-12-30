"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Course, Module } from "@/lib/types";
import { SidebarModule } from "./SidebarModule";
import { SidebarNote } from "./SidebarNote";

interface SidebarCourseProps {
  course: Course;
  isExpanded: boolean;
  onToggle: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onRenameModule: (id: string, name: string, parentId: string) => void;
  onDeleteModule: (id: string, parentId: string) => void;
  onRenameNote: (id: string, title: string) => void;
  onDeleteNote: (id: string) => void;
  onArchiveNote: (id: string) => void;
}

export function SidebarCourse({
  course,
  isExpanded,
  onToggle,
  onRename,
  onDelete,
  onRenameModule,
  onDeleteModule,
  onRenameNote,
  onDeleteNote,
  onArchiveNote,
}: SidebarCourseProps) {
  const router = useRouter();

  // Fetch notes strictly for this course (not in a module)
  // The API `getNotesByContext` with just `courseId` returns ALL notes in the course?
  // Let's check api.notes.getNotesByContext behavior from my earlier read.
  // It says:
  // if (args.courseId) { ... .withIndex("by_courseId", ...) ... }
  // This likely includes notes in modules if they also have courseId set.
  // We need to filter client-side or check if `getNotesByContext` can filter by nullable moduleId.
  // The schema says `moduleId` is optional.
  // If a note is in a module, it has `moduleId`.
  // If it's just in the course, `moduleId` is undefined/null.
  // The current `getNotesByContext` does NOT filter for `moduleId` being unset when `courseId` is provided.
  // So we should filter here for now.
  const courseNotes = useQuery(api.notes.getNotesByContext, {
    courseId: course.id,
  });

  const addModule = useMutation(api.users.addModuleToCourse);

  const handleCreateModule = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await addModule({ courseId: course.id, title: "New Module" });
      if (!isExpanded) onToggle();
    } catch (e) {
      console.error(e);
    }
  };

  // Filter notes that don't belong to any module
  const rootCourseNotes = courseNotes?.filter((note) => !note.moduleId);

  return (
    <div className="space-y-1 relative group/item">
      <div className="relative flex items-center">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start h-9 px-2.5 text-[13px] font-medium transition-all duration-200 border-l-2 gap-3", // Increased gap
            isExpanded
              ? "bg-indigo-500/10 text-indigo-400 border-indigo-500 hover:bg-indigo-500/20 hover:text-indigo-300"
              : "border-transparent text-gray-400 hover:text-white hover:bg-white/4"
          )}
        >
          {/* Toggle Button */}
          <div
            className={cn(
              "p-0.5 rounded-md transition-colors",
              isExpanded
                ? "text-indigo-400"
                : "text-gray-500 hover:bg-white/10 hover:text-gray-300"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </div>

          {/* Title Link */}
          <span
            className="truncate flex-1 text-left cursor-pointer"
            onClick={() =>
              router.push(
                `/dashboard?contextId=${course.id}&contextType=course`
              )
            }
          >
            {course.code}
          </span>
        </Button>
        <div className="absolute right-1 opacity-100 lg:opacity-0 lg:group-hover/item:opacity-100 transition-all duration-200">
          <ActionMenu
            onRename={() => onRename(course.id, course.name)}
            onDelete={() => onDelete(course.id)}
          />
        </div>
      </div>

      {isExpanded && (
        <div className="pl-4 space-y-0.5 ml-2 border-l border-white/5">
          {/* MODULES */}
          {course.modules?.map((mod: Module) => (
            <SidebarModule
              key={mod.id}
              module={mod}
              courseId={course.id}
              onRename={onRenameModule}
              onDelete={onDeleteModule}
              onRenameNote={onRenameNote}
              onDeleteNote={onDeleteNote}
              onArchiveNote={onArchiveNote}
            />
          ))}

          {/* COURSE NOTES (ROOT) */}
          {rootCourseNotes?.map((note) => (
            <SidebarNote
              key={note._id}
              note={note}
              onRename={() => onRenameNote(note._id, note.title)}
              onDelete={() => onDeleteNote(note._id)}
              onArchive={() => onArchiveNote(note._id)}
            />
          ))}

          {/* ADD MODULE BUTTON */}
          <Button
            variant="ghost"
            className="w-full justify-start h-8 px-2 text-[11px] text-gray-600 hover:text-indigo-400 hover:bg-indigo-500/5 gap-2 transition-all ml-0.5"
            onClick={handleCreateModule}
          >
            <Plus className="w-3 h-3" /> Add Module
          </Button>
        </div>
      )}
    </div>
  );
}
