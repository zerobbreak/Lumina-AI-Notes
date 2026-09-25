"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { Id } from "@/types/data-model";
import { useNoteActions } from "@/lib/hooks/mutations/useNoteActions";
import { useCurrentUser } from "@/lib/queries/users/useCurrentUser";
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
 * Promotes a quick capture into a full note filed under a module, leaving the
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
  const { data: userData } = useCurrentUser();
  const { updateNote } = useNoteActions();
  const { createNoteFlow } = useCreateNoteFlow();

  const [courseId, setCourseId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // A fresh target is a fresh decision — don't inherit the last selection.
  useEffect(() => {
    if (target) {
      setCourseId("");
    }
  }, [target]);

  const handleExpand = async () => {
    if (!target || !courseId) return;
    setIsSubmitting(true);
    try {
      const result = await createNoteFlow({
        title: target.title || "Quick Capture",
        major: userData?.major || "general",
        courseId,
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
            <Label htmlFor="expand-course">Module</Label>
            <Select
              value={courseId}
              onValueChange={setCourseId}
            >
              <SelectTrigger id="expand-course">
                <SelectValue placeholder="Select module" />
              </SelectTrigger>
              <SelectContent>
                {userData?.courses?.map((course: Course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.code ? `${course.code} — ` : ""}{course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
