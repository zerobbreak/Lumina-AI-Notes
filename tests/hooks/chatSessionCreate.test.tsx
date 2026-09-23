import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChatActions } from "@/lib/hooks/chats/useChatActions";
import { useChatSessions } from "@/lib/queries/chats/useChatSessions";
import { chatKeys } from "@/lib/query-keys/chats";

const getToken = async () => "token";
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken, isLoaded: true, isSignedIn: true, userId: "user_a" }),
}));

/** Session ids the fake server holds, newest first. */
let serverSessions: string[];
let posts: number;
/** DELETE requests wait on this, so a test can look at the UI state mid-delete. */
let deleteGate: Promise<void>;
let client: QueryClient;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const row = (id: string) => ({
  id,
  userId: "user_a",
  title: "New Chat",
  pinnedNoteIds: [],
  mode: "explain",
  createdAt: 0,
  updatedAt: 0,
});

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.test/api/v1");
  serverSessions = ["s0"];
  posts = 0;
  deleteGate = Promise.resolve();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const path = new URL(url).pathname.replace("/api/v1", "");
      if (init.method === "POST" && path === "/chats/sessions") {
        posts += 1;
        const id = `s${posts}`;
        serverSessions = [id, ...serverSessions];
        return json({ id }, 201);
      }
      if (init.method === "DELETE" && path === "/chats/sessions") {
        await deleteGate;
        const deleted = serverSessions.length;
        serverSessions = [];
        return json({ deleted });
      }
      if (init.method === "DELETE") {
        await deleteGate;
        const id = path.split("/").pop()!;
        if (!serverSessions.includes(id)) {
          return json({ error: { message: "Chat session not found", code: "not_found" } }, 404);
        }
        serverSessions = serverSessions.filter((s) => s !== id);
        return json({ ok: true });
      }
      // Slow list reads, so a caller that doesn't wait for the refetch sees the stale list.
      await new Promise((resolve) => setTimeout(resolve, 30));
      return json(serverSessions.map(row));
    }),
  );
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

/** Session ids in the cache, which is what the view reads on its next render. */
const cachedIds = () =>
  client.getQueryData<{ _id: string }[]>(chatKeys.sessions())?.map((s) => s._id);

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

function useStudio() {
  return { sessions: useChatSessions(), actions: useChatActions() };
}

describe("chat session actions", () => {
  // The Studio selects the new chat as soon as createSession resolves. If the
  // sessions list doesn't have it yet, the view treats it as missing, which
  // used to spawn another chat, over and over.
  it("createSession resolves only once the sessions list includes the new chat", async () => {
    const { result } = renderHook(useStudio, { wrapper });
    await waitFor(() => expect(result.current.sessions.data).toHaveLength(1));

    let idsWhenResolved: string[] | undefined;
    let id = "";
    await act(async () => {
      id = await result.current.actions.createSession({ title: "New Chat" });
      idsWhenResolved = cachedIds();
    });

    expect(idsWhenResolved).toContain(id);
    expect(posts).toBe(1);
  });

  it("deleteSession resolves only once the sessions list drops the chat", async () => {
    const { result } = renderHook(useStudio, { wrapper });
    await waitFor(() => expect(result.current.sessions.data).toHaveLength(1));

    let idsWhenResolved: string[] | undefined;
    await act(async () => {
      await result.current.actions.deleteSession({ sessionId: "s0" as never });
      idsWhenResolved = cachedIds();
    });

    expect(idsWhenResolved).toEqual([]);
  });

  it("deleteSession drops the chat from the list before the server answers", async () => {
    const { result } = renderHook(useStudio, { wrapper });
    await waitFor(() => expect(result.current.sessions.data).toHaveLength(1));

    let releaseDelete = () => {};
    deleteGate = new Promise((resolve) => {
      releaseDelete = resolve;
    });
    let pending: Promise<void> | undefined;
    act(() => {
      pending = result.current.actions.deleteSession({ sessionId: "s0" as never });
    });
    await waitFor(() => expect(cachedIds()).toEqual([]));
    expect(serverSessions).toEqual(["s0"]);

    releaseDelete();
    await act(async () => {
      await pending;
    });
    expect(serverSessions).toEqual([]);
  });

  it("deleting a chat that's already gone doesn't throw", async () => {
    const { result } = renderHook(useStudio, { wrapper });
    await waitFor(() => expect(result.current.sessions.data).toHaveLength(1));

    await act(async () => {
      await Promise.all([
        result.current.actions.deleteSession({ sessionId: "s0" as never }),
        result.current.actions.deleteSession({ sessionId: "s0" as never }),
      ]);
    });

    expect(cachedIds()).toEqual([]);
  });

  it("deleteAllSessions empties the list before the server answers", async () => {
    serverSessions = ["s0", "sx"];
    const { result } = renderHook(useStudio, { wrapper });
    await waitFor(() => expect(result.current.sessions.data).toHaveLength(2));

    let releaseDelete = () => {};
    deleteGate = new Promise((resolve) => {
      releaseDelete = resolve;
    });
    let pending: Promise<void> | undefined;
    act(() => {
      pending = result.current.actions.deleteAllSessions();
    });
    await waitFor(() => expect(cachedIds()).toEqual([]));
    expect(serverSessions).toHaveLength(2);

    releaseDelete();
    await act(async () => {
      await pending;
    });
    expect(serverSessions).toEqual([]);
    expect(cachedIds()).toEqual([]);
  });
});
