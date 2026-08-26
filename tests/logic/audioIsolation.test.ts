import { describe, it, expect } from "vitest";

import {
  isolationErrorMessage,
  isolationFileName,
  shouldAttemptIsolation,
  MAX_ISOLATION_BYTES,
  MIN_ISOLATION_BYTES,
} from "@/convex/shared/audioIsolation";
import {
  pickRecorderMimeType,
  recorderContainerMime,
  RECORDER_MIME_CANDIDATES,
} from "@/lib/sessionAudio";

describe("isolationFileName", () => {
  it("maps common lecture containers to a named file", () => {
    expect(isolationFileName("audio/webm;codecs=opus")).toBe("session.webm");
    expect(isolationFileName("audio/mpeg")).toBe("session.mp3");
    expect(isolationFileName("audio/mp4")).toBe("session.m4a");
    expect(isolationFileName("audio/wav")).toBe("session.wav");
  });

  it("falls back when the MIME type is unknown", () => {
    expect(isolationFileName("application/octet-stream")).toBe("session.audio");
  });
});

describe("shouldAttemptIsolation", () => {
  it("rejects empty and oversized blobs", () => {
    expect(shouldAttemptIsolation(0)).toBe(false);
    expect(shouldAttemptIsolation(MIN_ISOLATION_BYTES - 1)).toBe(false);
    expect(shouldAttemptIsolation(MAX_ISOLATION_BYTES + 1)).toBe(false);
  });

  it("accepts a normal session recording", () => {
    expect(shouldAttemptIsolation(MIN_ISOLATION_BYTES)).toBe(true);
    expect(shouldAttemptIsolation(1024 * 1024)).toBe(true);
  });
});

describe("isolationErrorMessage", () => {
  it("does not leak raw API bodies", () => {
    const message = isolationErrorMessage(401, "sk_live_secret_token");
    expect(message.toLowerCase()).toContain("api key");
    expect(message).not.toContain("sk_live");
  });

  it("maps rate limits and oversize responses", () => {
    expect(isolationErrorMessage(429, "")).toMatch(/rate-limited/i);
    expect(isolationErrorMessage(413, "")).toMatch(/too large/i);
  });
});

describe("pickRecorderMimeType", () => {
  it("prefers the first supported candidate", () => {
    expect(pickRecorderMimeType((type) => type === "audio/mp4")).toBe(
      "audio/mp4",
    );
  });

  it("returns empty when nothing is supported so MediaRecorder can pick", () => {
    expect(pickRecorderMimeType(() => false)).toBe("");
  });

  it("lists webm first for Chromium", () => {
    expect(RECORDER_MIME_CANDIDATES[0]).toContain("webm");
  });
});

describe("recorderContainerMime", () => {
  it("strips codec parameters", () => {
    expect(recorderContainerMime("audio/webm;codecs=opus")).toBe("audio/webm");
  });
});
