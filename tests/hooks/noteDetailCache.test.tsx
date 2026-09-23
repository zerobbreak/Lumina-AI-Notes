import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNote } from "@/lib/queries/notes/useNote";
import { useNoteDetail } from "@/lib/queries/notes/useNoteDetail";
import { noteKeys } from "@/lib/query-keys/notes";

const getToken = async () => "token";
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken, isLoaded: true, isSignedIn: true, userId: "user_a" }),
}));

const CREATED_AT = 1_790_000_000_000;
let client: QueryClient;

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.test/api/v1");
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: "n1",
            userId: "u1",
            title: "Mitosis",
            content: "<p>hi</p>",
            courseId: "c1",
            createdAt: CREATED_AT,
            updatedAt: CREATED_AT,
            version: 3,
            isPinned: false,
            isArchived: false,
            isShared: false,
            linkedDocumentIds: [],
            tagIds: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    ),
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

describe("noteKeys.detail cache", () => {
  // useNote (sidebar, command palette) shares the editor's key. It used to cache
  // a slim placement object there, wiping the editor's createdAt ("Invalid
  // Date") and version (false save conflicts).
  it("keeps the full editor note when useNote reads the same key", async () => {
    const { result } = renderHook(
      () => ({ open: useNote("n1"), detail: useNoteDetail("n1") }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.open.data).toBeTruthy());
    await waitFor(() => expect(result.current.detail.data).toBeTruthy());

    expect(result.current.open.data).toEqual({
      _id: "n1",
      title: "Mitosis",
      courseId: "c1",
      moduleId: undefined,
      parentNoteId: undefined,
    });
    const cached = client.getQueryData(noteKeys.detail("n1")) as Record<string, unknown>;
    expect(cached).toMatchObject({ createdAt: CREATED_AT, version: 3, content: "<p>hi</p>" });
    expect(result.current.detail.data).toMatchObject({ createdAt: CREATED_AT, version: 3 });
  });
});
