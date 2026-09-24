import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_APPEARANCE } from "@/lib/appearance/model";
import { useRecolorCourse } from "@/lib/mutations/courses/useRecolorCourse";
import { userKeys } from "@/lib/query-keys/users";
import type { UserData } from "@/types";

const getToken = async () => "token";
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken, isLoaded: true, isSignedIn: true, userId: "user_a" }),
}));

const user: UserData = {
  _id: "u1",
  tokenIdentifier: "user_a",
  email: "a@example.test",
  onboardingComplete: true,
  appearance: DEFAULT_APPEARANCE,
  courses: [
    { id: "c1", name: "Cell Biology", code: "BIO-101", color: "indigo" },
    { id: "c2", name: "Genetics", code: "BIO-102", color: "emerald" },
  ],
};

let client: QueryClient;
let respond: (res: Response) => void;

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.test/api/v1");
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise<Response>((resolve) => (respond = resolve))),
  );
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(userKeys.me(), user);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);
const colors = () => client.getQueryData<UserData>(userKeys.me())?.courses?.map((c) => c.color);

describe("useRecolorCourse", () => {
  it("shows the new colour before the server answers", async () => {
    const { result } = renderHook(() => useRecolorCourse(), { wrapper });
    act(() => result.current.mutate({ courseId: "c1", color: "rose" }));
    await vi.waitFor(() => expect(colors()).toEqual(["rose", "emerald"]));

    await act(async () =>
      respond(new Response(JSON.stringify({ ...user.courses![0], color: "rose" }), { status: 200 })),
    );
    expect(colors()).toEqual(["rose", "emerald"]);
  });

  it("puts the old colour back when the save fails", async () => {
    const { result } = renderHook(() => useRecolorCourse(), { wrapper });
    act(() => result.current.mutate({ courseId: "c1", color: "rose" }));
    await vi.waitFor(() => expect(colors()).toEqual(["rose", "emerald"]));

    await act(async () =>
      respond(new Response(JSON.stringify({ error: { message: "nope" } }), { status: 400 })),
    );
    await vi.waitFor(() => expect(colors()).toEqual(["indigo", "emerald"]));
  });
});
