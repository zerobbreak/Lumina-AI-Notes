"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Course } from "@/types";
import { useCreateNoteFlow } from "@/hooks/useCreateNoteFlow";

export interface ExpandCaptureTarget {
  id: Id<"notes">;
  title: string;
  content?: string;
}

/**
 * Promotes a quick capture into a full note filed under a course, leaving the
 * original marked as expanded so it isn't promoted twice.
 */
export function ExpandCaptureDialog({
  target,
  onOpenChange,
}: {
  target: ExpandCaptureTarget | null;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const userData = useQuery(api.users.getUser);
  const updateNote = useMutation(api.notes.updateNote);
  const { createNoteFlow } = useCreateNoteFlow();

  const [courseId, setCourseId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // A fresh target is a fresh decision — don't inherit the last selection.
  useEffect(() => {
    if (target) {
      setCourseId("");
      setModuleId("");
    }
  }, [target]);

  const modules =
    userData?.courses?.find((c: Course) => c.id === courseId)?.modules ?? [];

  const handleExpand = async () => {
    if (!target || !courseId) return;
    setIsSubmitting(true);
    try {
      const result = await createNoteFlow({
        title: target.title || "Quick Capture",
        major: userData?.major || "general",
        courseId,
        moduleId: moduleId || undefined,
        noteType: "page",
      });
      if (!result?.noteId) return;

      const content = target.content || "";
      await updateNote({
        noteId: result.noteId,
        content: content ? `<p>${content}</p>` : "",
      });
      await updateNote({
        noteId: target.id,
        quickCaptureStatus: "expanded",
        quickCaptureExpandedNoteId: result.noteId,
      });

      onOpenChange(false);
      toast.success("Capture expanded into full note");
      router.push(`/dashboard?noteId=${result.noteId}`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to expand capture");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Expand quick capture</DialogTitle>
          <DialogDescription>
            Choose where this capture should live. It becomes a full note you can
            edit and generate from.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="expand-course">Course</Label>
            <Select
              value={courseId}
              onValueChange={(value) => {
                setCourseId(value);
                setModuleId("");
              }}
            >
              <SelectTrigger id="expand-course">
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent>
                {userData?.courses?.map((course: Course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.code} — {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {courseId && modules.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="expand-module">Module (optional)</Label>
              <Select value={moduleId} onValueChange={setModuleId}>
                <SelectTrigger id="expand-module">
                  <SelectValue placeholder="Select module" />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((mod) => (
                    <SelectItem key={mod.id} value={mod.id}>
                      {mod.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!courseId || isSubmitting} onClick={handleExpand}>
            {isSubmitting ? "Expanding…" : "Expand"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
