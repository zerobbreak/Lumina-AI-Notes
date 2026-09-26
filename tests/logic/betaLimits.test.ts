import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { isLimitError, lastLimitHit } from "@/lib/api/limits";
import { apiPath } from "@/lib/api/path";
import { formatBytes } from "@/lib/utils";

const toast = vi.hoisted(() => ({ warning: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

const refusal = (status: number, code: string, message: string) =>
  new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.test/api/v1");
  toast.warning.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("beta limit notice", () => {
  it("shows one deduplicated toast whose action opens feedback about that limit", async () => {
    const message = "You've used all 100 AI requests for today. They reset at midnight UTC.";
    vi.stubGlobal("fetch", vi.fn(async () => refusal(429, "daily_limit_reached", message)));
    const commands: string[] = [];
    const listener = (e: Event) => commands.push((e as CustomEvent<string>).detail);
    window.addEventListener("lumina:command", listener);

    await expect(apiFetch(apiPath`/ai/simplify-text`, { method: "POST" })).rejects.toMatchObject({
      status: 429,
      code: "daily_limit_reached",
    });
    const [title, options] = toast.warning.mock.calls[0];
    expect(title).toBe("You've hit a beta limit");
    expect(options).toMatchObject({ id: "beta-limit-reached", description: message, action: { label: "Ask for more" } });
    expect(lastLimitHit()).toEqual({ code: "daily_limit_reached", message });

    options.action.onClick();
    expect(commands).toEqual(["feedback:more"]);
    window.removeEventListener("lumina:command", listener);
  });

  it("stays quiet for ordinary errors, including the per-minute burst limit", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => refusal(429, "rate_limited", "Slow down")));
    await expect(apiFetch(apiPath`/ai/simplify-text`)).rejects.toBeInstanceOf(ApiError);
    expect(toast.warning).not.toHaveBeenCalled();
    expect(isLimitError(new ApiError("x", 404, "not_found"))).toBe(false);
    expect(isLimitError(new ApiError("x", 429, "feedback_limit"))).toBe(false);
  });
});

describe("formatBytes", () => {
  it("formats storage sizes", () => {
    expect(formatBytes(0)).toBe("0 Bytes");
    expect(formatBytes(1024 ** 3)).toBe("1 GB");
    expect(formatBytes(1.5 * 1024 ** 2)).toBe("1.5 MB");
  });
});
