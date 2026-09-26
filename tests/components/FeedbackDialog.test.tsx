import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/use-api-token", () => ({
  useApiToken: () => ({ getApiToken: async () => "token", isReady: true }),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

import { FeedbackDialog } from "@/components/dashboard/dialogs/FeedbackDialog";
import { notifyLimitReached } from "@/lib/api/limits";
import { ApiError } from "@/lib/api/errors";
import { dispatchAppCommand } from "@/lib/appCommands";

let sent: Array<Record<string, unknown>>;

beforeEach(() => {
  sent = [];
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test/api/v1");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_input: string, init?: RequestInit) => {
      sent.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ id: "f1" }), { status: 201, headers: { "Content-Type": "application/json" } });
    }),
  );
  Object.values(toast).forEach((fn) => fn.mockReset());
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function renderDialog() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <FeedbackDialog />
    </QueryClientProvider>,
  );
}

describe("FeedbackDialog", () => {
  it("opens on the feedback command and sends the message with where it came from", async () => {
    renderDialog();
    expect(screen.queryByText("Send feedback")).toBeNull();
    act(() => dispatchAppCommand("feedback"));

    const send = screen.getByRole("button", { name: "Send" });
    expect(send).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("radio", { name: "Bug" }));
    fireEvent.change(screen.getByLabelText("Your feedback"), { target: { value: "  Export button does nothing  " } });
    fireEvent.click(screen.getByRole("radio", { name: "4 out of 5" }));
    fireEvent.click(send);

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(sent).toEqual([
      expect.objectContaining({ kind: "bug", message: "Export button does nothing", rating: 4, page: "/", app: expect.stringMatching(/^web · /) }),
    ]);
    await waitFor(() => expect(screen.queryByText("Send feedback")).toBeNull());
  });

  it("starts as a request for more when opened from a limit notice, naming the limit", async () => {
    renderDialog();
    notifyLimitReached(new ApiError("You've used all 300 audio minutes for this month.", 403, "audio_limit_exceeded"));
    act(() => dispatchAppCommand("feedback:more"));

    expect(screen.getByRole("radio", { name: "Need more" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText(/About: You've used all 300 audio minutes/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Your feedback"), { target: { value: "I record every lecture" } });
    fireEvent.keyDown(screen.getByLabelText("Your feedback"), { key: "Enter", ctrlKey: true });

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({ kind: "more", limitCode: "audio_limit_exceeded" });
    expect(sent[0]).not.toHaveProperty("rating");
  });
});
