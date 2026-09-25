import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BrightspaceStatusDto } from "@/types/api/integrations";

vi.mock("@/lib/api/use-api-token", () => ({
  useApiToken: () => ({ getApiToken: async () => "token", isReady: true }),
}));
vi.mock("@/lib/queries/users/useCurrentUser", () => ({
  useCurrentUser: () => ({
    data: { courses: [{ id: "c-hist", name: "History", code: "HIST 101" }] },
  }),
}));

import { IntegrationsTab } from "@/components/dashboard/settings/IntegrationsTab";

const connected: BrightspaceStatusDto = {
  connected: true,
  kind: "ical",
  host: "school.brightspace.com",
  status: "active",
  lastSyncedAt: Date.now() - 5 * 60_000,
  deadlineCount: 2,
  courses: [
    { id: "l1", name: "HIST101 - History of Africa", courseId: "c-hist", ignored: false },
    { id: "l2", name: "MATH201 - Calculus", courseId: null, ignored: false },
  ],
};

/** A stand-in for the API: answers by method and path, records what was sent. */
let server: {
  status: BrightspaceStatusDto;
  connectError?: { status: number; code: string; message: string };
  calls: Array<{ method: string; path: string; body?: unknown }>;
};

const json = (status: number, body: unknown) =>
  new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => {
  server = { status: { connected: false }, calls: [] };
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test/api/v1");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const path = new URL(input).pathname.replace(/^.*\/api\/v1/, "");
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      server.calls.push({ method, path, body });

      if (path === "/integrations/brightspace" && method === "GET") return json(200, server.status);
      if (path === "/integrations/brightspace/feed") {
        if (server.connectError) {
          const { status, code, message } = server.connectError;
          return json(status, { error: { code, message } });
        }
        server.status = connected;
        return json(201, { ...connected, sync: { ok: true, added: 2, updated: 0, removed: 0, courses: 2 } });
      }
      if (path === "/integrations/brightspace/courses/import") {
        server.status = {
          ...connected,
          courses: connected.courses.map((course) => ({ ...course, courseId: course.courseId ?? "c-new" })),
        };
        return json(200, { ...server.status, sync: { ok: true, added: 0, updated: 1, removed: 0, courses: 2 }, imported: 1 });
      }
      if (path === "/integrations/brightspace" && method === "DELETE") {
        server.status = { connected: false };
        return json(204, null);
      }
      return json(404, { error: { code: "not_found", message: "no route" } });
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function renderTab() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <IntegrationsTab />
    </QueryClientProvider>,
  );
}

describe("IntegrationsTab", () => {
  it("connects with a pasted calendar link and shows the courses it found", async () => {
    renderTab();
    const input = await screen.findByLabelText("Calendar link");
    const connect = screen.getByRole("button", { name: /connect/i });
    expect(connect).toBeDisabled();

    fireEvent.change(input, { target: { value: "  https://school.brightspace.com/feed.ics?token=x  " } });
    fireEvent.click(connect);

    expect(await screen.findByText("school.brightspace.com")).toBeInTheDocument();
    expect(screen.getByText(/2 deadlines/)).toBeInTheDocument();
    expect(screen.getByText("HIST101 - History of Africa")).toBeInTheDocument();
    expect(screen.getByText("MATH201 - Calculus")).toBeInTheDocument();
    expect(server.calls).toContainEqual({
      method: "POST",
      path: "/integrations/brightspace/feed",
      body: { url: "https://school.brightspace.com/feed.ics?token=x" },
    });
  });

  it("shows the server's reason when a link is rejected, next to the field", async () => {
    server.connectError = {
      status: 400,
      code: "invalid_feed",
      message: "That link didn't return a calendar.",
    };
    renderTab();
    fireEvent.change(await screen.findByLabelText("Calendar link"), { target: { value: "https://x.test/a" } });
    fireEvent.click(screen.getByRole("button", { name: /connect/i }));

    expect(await screen.findByText("That link didn't return a calendar.")).toBeInTheDocument();
    expect(screen.getByLabelText("Calendar link")).toHaveAttribute("aria-invalid", "true");
  });

  it("flags a connection whose last sync failed", async () => {
    server.status = { ...connected, status: "error", lastError: "Brightspace refused the calendar link." };
    renderTab();
    expect(await screen.findByRole("alert")).toHaveTextContent("Brightspace refused the calendar link.");
  });

  it("pre-selects the matched course", async () => {
    server.status = connected;
    renderTab();
    const hist = await screen.findByRole("combobox", { name: /HIST101/ });
    expect(hist).toHaveTextContent("HIST 101 · History");
    expect(screen.getByRole("combobox", { name: /MATH201/ })).toHaveTextContent("No module");
  });

  it("disconnects only after confirming", async () => {
    server.status = connected;
    renderTab();
    fireEvent.click(await screen.findByRole("button", { name: /disconnect/i }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent(/removes the 2 deadlines/);
    expect(server.calls.some((call) => call.method === "DELETE")).toBe(false);

    fireEvent.click(within(dialog).getByRole("button", { name: "Disconnect" }));
    await waitFor(() => expect(server.calls.some((call) => call.method === "DELETE")).toBe(true));
    expect(await screen.findByLabelText("Calendar link")).toBeInTheDocument();
  });

  it("creates Lumina courses for unmatched Brightspace courses", async () => {
    server.status = connected;
    renderTab();
    fireEvent.click(await screen.findByRole("button", { name: "Create 1 module from Brightspace" }));

    await waitFor(() =>
      expect(server.calls).toContainEqual({ method: "POST", path: "/integrations/brightspace/courses/import", body: undefined }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /from Brightspace/ })).not.toBeInTheDocument(),
    );
  });

  it("offers nothing to create when every course is matched or skipped", async () => {
    server.status = {
      ...connected,
      courses: [
        { id: "l1", name: "HIST101", courseId: "c-hist", ignored: false },
        { id: "l2", name: "MATH201", courseId: null, ignored: true },
      ],
    };
    renderTab();
    await screen.findByText("school.brightspace.com");
    expect(screen.queryByRole("button", { name: /from Brightspace/ })).not.toBeInTheDocument();
  });
});
