import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, renderHook } from "@testing-library/react";
import { useEffect, useState, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCourseActions } from "@/lib/hooks/mutations/useCourseActions";
import { useDeadlineActions } from "@/lib/hooks/mutations/useDeadlineActions";
import { useFileActions } from "@/lib/hooks/mutations/useFileActions";
import { useNoteActions } from "@/lib/hooks/mutations/useNoteActions";
import { useTagActions } from "@/lib/hooks/mutations/useTagActions";
import { useUserPreferencesActions } from "@/lib/hooks/mutations/useUserPreferencesActions";
import { noteKeys } from "@/lib/query-keys/notes";
import type { Id } from "@/types/data-model";

const getToken = async () => "token";
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken, isLoaded: true, isSignedIn: true, userId: "user_a" }),
}));

/** Requests sent, as "METHOD /path". */
let requests: string[];
let client: QueryClient;

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.test/api/v1");
  requests = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      requests.push(`${init.method ?? "GET"} ${new URL(url).pathname.replace("/api/v1", "")}`);
      const body = init.method === "PATCH" ? { id: "n1", title: "t", content: "", version: 1 } : {};
      return init.method === "POST" && url.endsWith("/touch")
        ? new Response(null, { status: 204 })
        : new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
    }),
  );
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

const wait = (ms: number) => act(() => new Promise((resolve) => setTimeout(resolve, ms)));

describe("action hook callbacks are stable across renders", () => {
  // useMutation returns a new object on every render, so a callback that
  // depends on it is new every render too, and any effect using it re-fires.
  it.each([
    ["useNoteActions", useNoteActions],
    ["useCourseActions", useCourseActions],
    ["useDeadlineActions", useDeadlineActions],
    ["useFileActions", useFileActions],
    ["useTagActions", useTagActions],
    ["useUserPreferencesActions", useUserPreferencesActions],
  ] as const)("%s", (_name, useActions) => {
    const { result, rerender } = renderHook(() => useActions() as Record<string, unknown>, { wrapper });
    const first = { ...result.current };
    rerender();
    rerender();
    for (const [key, value] of Object.entries(result.current)) {
      expect(value, key).toBe(first[key]);
    }
  });
});

describe("NoteView's effects", () => {
  /** The touch-on-open effect, as NoteView has it. */
  function TouchOnOpen({ noteId }: { noteId: Id<"notes"> }) {
    const { touchNote } = useNoteActions();
    useEffect(() => {
      touchNote({ noteId }).catch(() => {});
    }, [noteId, touchNote]);
    return null;
  }

  it("touches an opened note once, not in a loop", async () => {
    render(<TouchOnOpen noteId={"n1" as Id<"notes">} />, { wrapper });
    await wait(300);
    expect(requests.filter((r) => r === "POST /notes/n1/touch")).toHaveLength(1);
  });

  /**
   * The debounced autosave, as NoteView has it, in a component that keeps
   * re-rendering (as NoteView did, and does whenever anything on it changes).
   */
  function Autosave({ noteId, content }: { noteId: Id<"notes">; content: string }) {
    const { updateNote } = useNoteActions();
    const [, setTick] = useState(0);
    useEffect(() => {
      const busy = setInterval(() => setTick((n) => n + 1), 20);
      return () => clearInterval(busy);
    }, []);
    useEffect(() => {
      const handler = setTimeout(() => {
        void updateNote({ noteId, content }).catch(() => {});
      }, 200);
      return () => clearTimeout(handler);
    }, [noteId, content, updateNote]);
    return null;
  }

  it("saves edits even while the page keeps re-rendering", async () => {
    client.setQueryData(noteKeys.detail("n1"), { _id: "n1", version: 0 });
    render(<Autosave noteId={"n1" as Id<"notes">} content="<p>Lecture notes</p>" />, { wrapper });
    await wait(700);
    expect(requests.filter((r) => r === "PATCH /notes/n1")).toHaveLength(1);
  });
});
