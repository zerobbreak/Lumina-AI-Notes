"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { coursesApi } from "@/lib/api/domains/courses.api";
import { useApiToken } from "@/lib/api/use-api-token";
import type { AccentSwatch } from "@/lib/appearance/model";
import { userKeys } from "@/lib/query-keys/users";
import type { UserData } from "@/types";

type Input = { courseId: string; color: AccentSwatch };

const withColor = (user: UserData, { courseId, color }: Input): UserData => ({
  ...user,
  courses: user.courses?.map((c) => (c.id === courseId ? { ...c, color } : c)),
});

/** Changes a course's colour at once, and puts it back if the save fails. */
export function useRecolorCourse() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async ({ courseId, color }: Input) => {
      const token = await getApiToken();
      return coursesApi.recolor(token, courseId, color);
    },
    onMutate: async (input) => {
      // A fetch already in flight would land after this and undo it.
      await queryClient.cancelQueries({ queryKey: userKeys.me() });
      const previous = queryClient.getQueryData<UserData>(userKeys.me());
      if (previous) queryClient.setQueryData(userKeys.me(), withColor(previous, input));
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(userKeys.me(), context.previous);
    },
  });
}
