"use client";

import { useCallback } from "react";
import { useAddModule } from "@/lib/mutations/courses/useAddModule";
import { useCreateCourse } from "@/lib/mutations/courses/useCreateCourse";
import { useDeleteCourse } from "@/lib/mutations/courses/useDeleteCourse";
import { useDeleteModule } from "@/lib/mutations/courses/useDeleteModule";
import { useRenameCourse } from "@/lib/mutations/courses/useRenameCourse";
import { useRenameModule } from "@/lib/mutations/courses/useRenameModule";

export function useCourseActions() {
  const createCourseMutation = useCreateCourse();
  const renameCourseMutation = useRenameCourse();
  const deleteCourseMutation = useDeleteCourse();
  const addModuleMutation = useAddModule();
  const renameModuleMutation = useRenameModule();
  const deleteModuleMutation = useDeleteModule();

  const createCourse = useCallback(
    async (args: { name: string; code: string }) => {
      await createCourseMutation.mutateAsync(args);
    },
    [createCourseMutation],
  );

  const renameCourse = useCallback(
    async (args: { courseId: string; name: string }) => {
      await renameCourseMutation.mutateAsync(args);
    },
    [renameCourseMutation],
  );

  const deleteCourse = useCallback(
    async (args: { courseId: string }) => {
      await deleteCourseMutation.mutateAsync(args.courseId);
    },
    [deleteCourseMutation],
  );

  const addModuleToCourse = useCallback(
    async (args: { courseId: string; title: string }) => {
      await addModuleMutation.mutateAsync(args);
    },
    [addModuleMutation],
  );

  const renameModule = useCallback(
    async (args: { courseId: string; moduleId: string; title: string }) => {
      await renameModuleMutation.mutateAsync(args);
    },
    [renameModuleMutation],
  );

  const deleteModule = useCallback(
    async (args: { courseId: string; moduleId: string }) => {
      await deleteModuleMutation.mutateAsync(args);
    },
    [deleteModuleMutation],
  );

  return {
    createCourse,
    renameCourse,
    deleteCourse,
    addModuleToCourse,
    renameModule,
    deleteModule,
  };
}
