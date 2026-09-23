"use client";

import { useCallback } from "react";
import { useAddModule } from "@/lib/mutations/courses/useAddModule";
import { useCreateCourse } from "@/lib/mutations/courses/useCreateCourse";
import { useDeleteCourse } from "@/lib/mutations/courses/useDeleteCourse";
import { useDeleteModule } from "@/lib/mutations/courses/useDeleteModule";
import { useRenameCourse } from "@/lib/mutations/courses/useRenameCourse";
import { useRenameModule } from "@/lib/mutations/courses/useRenameModule";

export function useCourseActions() {
  const { mutateAsync: createCourseAsync } = useCreateCourse();
  const { mutateAsync: renameCourseAsync } = useRenameCourse();
  const { mutateAsync: deleteCourseAsync } = useDeleteCourse();
  const { mutateAsync: addModuleAsync } = useAddModule();
  const { mutateAsync: renameModuleAsync } = useRenameModule();
  const { mutateAsync: deleteModuleAsync } = useDeleteModule();

  const createCourse = useCallback(
    async (args: { name: string; code: string }) => {
      await createCourseAsync(args);
    },
    [createCourseAsync],
  );

  const renameCourse = useCallback(
    async (args: { courseId: string; name: string }) => {
      await renameCourseAsync(args);
    },
    [renameCourseAsync],
  );

  const deleteCourse = useCallback(
    async (args: { courseId: string }) => {
      await deleteCourseAsync(args.courseId);
    },
    [deleteCourseAsync],
  );

  const addModuleToCourse = useCallback(
    async (args: { courseId: string; title: string }) => {
      await addModuleAsync(args);
    },
    [addModuleAsync],
  );

  const renameModule = useCallback(
    async (args: { courseId: string; moduleId: string; title: string }) => {
      await renameModuleAsync(args);
    },
    [renameModuleAsync],
  );

  const deleteModule = useCallback(
    async (args: { courseId: string; moduleId: string }) => {
      await deleteModuleAsync(args);
    },
    [deleteModuleAsync],
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
