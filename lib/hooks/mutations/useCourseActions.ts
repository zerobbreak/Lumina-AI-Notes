"use client";

import { useMutation } from "convex/react";
import { useCallback } from "react";
import { api } from "@/convex/_generated/api";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useAddModule } from "@/lib/mutations/courses/useAddModule";
import { useCreateCourse } from "@/lib/mutations/courses/useCreateCourse";
import { useDeleteCourse } from "@/lib/mutations/courses/useDeleteCourse";
import { useDeleteModule } from "@/lib/mutations/courses/useDeleteModule";
import { useRenameCourse } from "@/lib/mutations/courses/useRenameCourse";
import { useRenameModule } from "@/lib/mutations/courses/useRenameModule";

export function useCourseActions() {
  const useRest = isRestApiEnabled();

  const createCourseConvex = useMutation(api.users.createCourse);
  const renameCourseConvex = useMutation(api.users.renameCourse);
  const deleteCourseConvex = useMutation(api.users.deleteCourse);
  const addModuleConvex = useMutation(api.users.addModuleToCourse);
  const renameModuleConvex = useMutation(api.users.renameModule);
  const deleteModuleConvex = useMutation(api.users.deleteModule);

  const createCourseRest = useCreateCourse();
  const renameCourseRest = useRenameCourse();
  const deleteCourseRest = useDeleteCourse();
  const addModuleRest = useAddModule();
  const renameModuleRest = useRenameModule();
  const deleteModuleRest = useDeleteModule();

  const createCourse = useCallback(
    async (args: { name: string; code: string }) => {
      if (useRest) {
        await createCourseRest.mutateAsync(args);
      } else {
        await createCourseConvex(args);
      }
    },
    [useRest, createCourseConvex, createCourseRest],
  );

  const renameCourse = useCallback(
    async (args: { courseId: string; name: string }) => {
      if (useRest) {
        await renameCourseRest.mutateAsync(args);
      } else {
        await renameCourseConvex(args);
      }
    },
    [useRest, renameCourseConvex, renameCourseRest],
  );

  const deleteCourse = useCallback(
    async (args: { courseId: string }) => {
      if (useRest) {
        await deleteCourseRest.mutateAsync(args.courseId);
      } else {
        await deleteCourseConvex(args);
      }
    },
    [useRest, deleteCourseConvex, deleteCourseRest],
  );

  const addModuleToCourse = useCallback(
    async (args: { courseId: string; title: string }) => {
      if (useRest) {
        await addModuleRest.mutateAsync(args);
      } else {
        await addModuleConvex(args);
      }
    },
    [useRest, addModuleConvex, addModuleRest],
  );

  const renameModule = useCallback(
    async (args: { courseId: string; moduleId: string; title: string }) => {
      if (useRest) {
        await renameModuleRest.mutateAsync(args);
      } else {
        await renameModuleConvex(args);
      }
    },
    [useRest, renameModuleConvex, renameModuleRest],
  );

  const deleteModule = useCallback(
    async (args: { courseId: string; moduleId: string }) => {
      if (useRest) {
        await deleteModuleRest.mutateAsync(args);
      } else {
        await deleteModuleConvex(args);
      }
    },
    [useRest, deleteModuleConvex, deleteModuleRest],
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
