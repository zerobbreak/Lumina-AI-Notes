import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_APPEARANCE, type Appearance } from "@/lib/appearance/model";
import { useUpdateAppearance } from "@/lib/mutations/users/useUpdateAppearance";
import { useCurrentUser } from "@/lib/queries/users/useCurrentUser";
import { userKeys } from "@/lib/query-keys/users";
import type { UserData } from "@/types";

const getToken = async () => "token";
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken, isLoaded: true, isSignedIn: true, userId: "user_a" }),
}));

const BLUE: Appearance = { ...DEFAULT_APPEARANCE, accent: { kind: "swatch", id: "blue" } };
const PURPLE: Appearance = { ...DEFAULT_APPEARANCE, accent: { kind: "swatch", id: "purple" } };

const userDto = (appearance: Appearance) => ({
  id: "u1",
  clerkUserId: "user_a",
  email: "a@example.test",
  onboardingComplete: true,
  courses: [],
  appearance,
  enabledBlocks: [],
  tourCompleted: true,
  tourStep: 0,
});
const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

let client: QueryClient;
/** GETs after the first wait here until the test releases them. */
let releaseGet: (() => void) | null;
let getCount: number;

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.test/api/v1");
  getCount = 0;
  releaseGet = null;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") return json(userDto(PURPLE));
      getCount += 1;
      if (getCount === 1) return json(userDto(BLUE));
      // A refetch the server answered before the save landed: still blue.
      await new Promise<void>((resolve) => (releaseGet = resolve));
      return json(userDto(BLUE));
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

describe("saving the look", () => {
  // On a slow API, a user refetch already in flight used to land after the
  // save and put the old accent back: pick purple, watch it snap to blue.
  it("isn't undone by a user refetch that was already in flight", async () => {
    const { result } = renderHook(
      () => ({ user: useCurrentUser(), save: useUpdateAppearance() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.user.data).toBeTruthy());

    void client.refetchQueries({ queryKey: userKeys.me() });
    await waitFor(() => expect(releaseGet).not.toBeNull());

    await act(() => result.current.save.mutateAsync({ accent: PURPLE.accent }));
    await act(async () => releaseGet!());

    await waitFor(() => expect(client.isFetching({ queryKey: userKeys.me() })).toBe(0));
    expect(client.getQueryData<UserData>(userKeys.me())?.appearance.accent).toEqual(
      PURPLE.accent,
    );
  });
});
