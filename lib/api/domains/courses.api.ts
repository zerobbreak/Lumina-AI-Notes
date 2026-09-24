import { apiFetch } from "@/lib/api/client";
import { apiPath } from "@/lib/api/path";
import type { AccentSwatch } from "@/lib/appearance/model";
import type { Course } from "@/types";

export const coursesApi = {
  create(token: string, body: { name: string; code: string }) {
    return apiFetch<Course>(apiPath`/courses`, { method: "POST", token, body });
  },

  rename(token: string, courseId: string, name: string) {
    return apiFetch<Course>(apiPath`/courses/${courseId}`, {
      method: "PATCH",
      token,
      body: { name },
    });
  },

  recolor(token: string, courseId: string, color: AccentSwatch) {
    return apiFetch<Course>(apiPath`/courses/${courseId}`, {
      method: "PATCH",
      token,
      body: { color },
    });
  },

  delete(token: string, courseId: string) {
    return apiFetch<void>(apiPath`/courses/${courseId}`, { method: "DELETE", token });
  },

  addModule(token: string, courseId: string, body: { title: string }) {
    return apiFetch<{ id: string; title: string }>(
      apiPath`/courses/${courseId}/modules`,
      { method: "POST", token, body },
    );
  },

  renameModule(
    token: string,
    courseId: string,
    moduleId: string,
    body: { title: string },
  ) {
    return apiFetch<{ id: string; title: string }>(
      apiPath`/courses/${courseId}/modules/${moduleId}`,
      { method: "PATCH", token, body },
    );
  },

  deleteModule(token: string, courseId: string, moduleId: string) {
    return apiFetch<void>(apiPath`/courses/${courseId}/modules/${moduleId}`, {
      method: "DELETE",
      token,
    });
  },
};
