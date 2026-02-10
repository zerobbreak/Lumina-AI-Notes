"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useTemplateRecommendation } from "@/hooks/useTemplateRecommendation";
import { TemplateSelectorModal, TemplateType } from "@/components/dashboard/templates/TemplateSelectorModal";
import type { Id } from "@/convex/_generated/dataModel";

interface CreateNoteInput {
  title: string;
  major?: string;
  courseId?: string;
  moduleId?: string;
  noteType?: string;
  styleOverride?: string;
}

export function useCreateNoteFlow(): {
  createNoteFlow: (
    input: CreateNoteInput,
  ) => Promise<{ noteId: Id<"notes">; style: string } | null>;
  TemplateSelector: () => JSX.Element;
} {
  const userData = useQuery(api.users.getUser);
  const createNote = useMutation(api.notes.createNote);
  const updateCourseStyle = useMutation(api.users.updateCourseStyle);

  const [pendingRequest, setPendingRequest] = useState<CreateNoteInput | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const resolverRef = useRef<
    ((result: { noteId: Id<"notes">; style: string } | null) => void) | undefined
  >();

  const recommendation = useTemplateRecommendation({
    major: userData?.major,
    courseId: pendingRequest?.courseId,
    courses: userData?.courses,
  });

  const coursePrefs = useMemo(() => {
    const course = userData?.courses?.find((c) => c.id === pendingRequest?.courseId);
    return {
      defaultNoteStyle: course?.defaultNoteStyle,
      templatePromptDisabled: course?.templatePromptDisabled,
    };
  }, [userData?.courses, pendingRequest?.courseId]);

  const createNoteFlow = useCallback(
    async (input: CreateNoteInput) => {
      return new Promise<{ noteId: Id<"notes">; style: string } | null>((resolve) => {
        const course = userData?.courses?.find((c) => c.id === input.courseId);
        const shouldSkip = course?.templatePromptDisabled;
        const defaultStyle =
          input.styleOverride ||
          course?.defaultNoteStyle ||
          userData?.noteStyle ||
          "standard";

        if (shouldSkip) {
          createNote({
            title: input.title,
            major: input.major || userData?.major || "general",
            courseId: input.courseId,
            moduleId: input.moduleId,
            noteType: input.noteType,
            style: defaultStyle,
          }).then((noteId) => resolve({ noteId, style: defaultStyle }));
          return;
        }

        resolverRef.current = resolve;
        setPendingRequest(input);
        setIsOpen(true);
      });
    },
    [createNote, userData],
  );

  const handleConfirm = useCallback(
    async (template: TemplateType, disablePrompt: boolean) => {
      if (!pendingRequest) return;
      const style = template;
      const noteId = await createNote({
        title: pendingRequest.title,
        major: pendingRequest.major || userData?.major || "general",
        courseId: pendingRequest.courseId,
        moduleId: pendingRequest.moduleId,
        noteType: pendingRequest.noteType,
        style,
      });

      if (disablePrompt && pendingRequest.courseId) {
        await updateCourseStyle({
          courseId: pendingRequest.courseId,
          style,
          templatePromptDisabled: true,
        });
      }

      setIsOpen(false);
      setPendingRequest(null);
      resolverRef.current?.({ noteId, style });
    },
    [createNote, pendingRequest, updateCourseStyle, userData?.major],
  );

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open && resolverRef.current) {
      resolverRef.current(null);
      resolverRef.current = undefined;
      setPendingRequest(null);
    }
  }, []);

  const TemplateSelector = useCallback(() => {
    const recommended =
      recommendation.recommendedTemplate || coursePrefs.defaultNoteStyle || null;
    return (
      <TemplateSelectorModal
        open={isOpen}
        onOpenChange={handleOpenChange}
        recommendedTemplate={recommended as TemplateType | null}
        onConfirm={handleConfirm}
      />
    );
  }, [coursePrefs.defaultNoteStyle, handleConfirm, handleOpenChange, isOpen, recommendation.recommendedTemplate]);

  return { createNoteFlow, TemplateSelector };
}
