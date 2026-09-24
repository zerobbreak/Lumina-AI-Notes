import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { act, render } from "@testing-library/react";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { freshToken, sessionLost } from "@/lib/api/session";

/** What Clerk's useAuth reports; tests change it to simulate sign-in/out. */
let auth: { isLoaded: boolean; userId: string | null } = { isLoaded: true, userId: "user_a" };

const getToken = vi.fn(async () => "fresh");
const signOut = vi.fn(async () => {});
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ ...auth, getToken }),
  useClerk: () => ({ signOut }),
}));

/** The client the tree is currently using, captured after each render. */
const seen: { client?: QueryClient } = {};
function Probe() {
  const queryClient = useQueryClient();
  useEffect(() => {
    seen.client = queryClient;
  });
  return null;
}

const NOTES = ["notes", "recent"];

function renderProvider() {
  const view = render(
    <QueryProvider>
      <Probe />
    </QueryProvider>,
  );
  return { rerender: () => view.rerender(<QueryProvider><Probe /></QueryProvider>) };
}

beforeEach(() => {
  auth = { isLoaded: true, userId: "user_a" };
});

describe("QueryProvider", () => {
  it("keeps the cache while the same user stays signed in", () => {
    const { rerender } = renderProvider();
    seen.client!.setQueryData(NOTES, ["A's private note"]);
    rerender();
    expect(seen.client!.getQueryData(NOTES)).toEqual(["A's private note"]);
  });

  it("gives the next user on this device an empty cache after sign-out", () => {
    const { rerender } = renderProvider();
    const aClient = seen.client!;
    aClient.setQueryData(NOTES, ["A's private note"]);

    act(() => {
      auth = { isLoaded: true, userId: null };
      rerender();
    });
    act(() => {
      auth = { isLoaded: true, userId: "user_b" };
      rerender();
    });

    expect(seen.client).not.toBe(aClient);
    expect(seen.client!.getQueryData(NOTES)).toBeUndefined();
    // And A's data isn't left sitting in memory either.
    expect(aClient.getQueryData(NOTES)).toBeUndefined();
  });

  it("swaps the cache on a direct account switch", () => {
    const { rerender } = renderProvider();
    seen.client!.setQueryData(NOTES, ["A's private note"]);
    act(() => {
      auth = { isLoaded: true, userId: "user_b" };
      rerender();
    });
    expect(seen.client!.getQueryData(NOTES)).toBeUndefined();
  });

  it("doesn't throw the cache away while Clerk is still loading", () => {
    auth = { isLoaded: false, userId: null };
    const { rerender } = renderProvider();
    const first = seen.client;
    act(() => {
      auth = { isLoaded: true, userId: "user_a" };
      rerender();
    });
    seen.client!.setQueryData(NOTES, ["A's note"]);
    rerender();
    expect(seen.client!.getQueryData(NOTES)).toEqual(["A's note"]);
    expect(first).toBeDefined();
  });

  // Hooks such as useQuery keep the client they first rendered with. Swapping
  // the cache when Clerk finished loading left root providers (appearance)
  // reading a cleared cache, so saved changes never showed.
  it("keeps the same client when Clerk finishes loading", () => {
    auth = { isLoaded: false, userId: null };
    const { rerender } = renderProvider();
    const first = seen.client;
    act(() => {
      auth = { isLoaded: true, userId: "user_a" };
      rerender();
    });
    expect(seen.client).toBe(first);
  });

  it("remounts everything below on a user switch, so no hook reads the old cache", () => {
    let mounts = 0;
    function Counter() {
      useEffect(() => {
        mounts += 1;
      }, []);
      return null;
    }
    const tree = () => (
      <QueryProvider>
        <Counter />
      </QueryProvider>
    );
    const view = render(tree());
    act(() => {
      auth = { isLoaded: true, userId: "user_b" };
      view.rerender(tree());
    });
    expect(mounts).toBe(2);
  });

  it("wires apiFetch's session recovery to Clerk", async () => {
    renderProvider();
    await expect(freshToken()).resolves.toBe("fresh");
    expect(getToken).toHaveBeenCalledWith({ skipCache: true });

    // Several failing requests at once must only sign out once.
    sessionLost();
    sessionLost();
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledWith({ redirectUrl: "/sign-in" });
  });
});
