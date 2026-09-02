import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useMicLevels } from "@/hooks/useMicLevels";

const originalMediaDevices = navigator.mediaDevices;

afterEach(() => {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: originalMediaDevices,
  });
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useMicLevels", () => {
  it("fails startup and releases the microphone when recording is unavailable", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const stopTrack = vi.fn();
    const stream = {
      getTracks: () => [{ stop: stopTrack }],
    } as unknown as MediaStream;

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue(stream),
      },
    });

    class AudioContextStub {
      resume = vi.fn().mockResolvedValue(undefined);
      close = vi.fn().mockResolvedValue(undefined);
      createAnalyser() {
        return {
          fftSize: 0,
          smoothingTimeConstant: 0,
          minDecibels: 0,
          maxDecibels: 0,
          frequencyBinCount: 32,
          getByteFrequencyData: vi.fn(),
        };
      }
      createMediaStreamSource() {
        return { connect: vi.fn() };
      }
    }

    vi.stubGlobal("AudioContext", AudioContextStub);
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal(
      "MediaRecorder",
      class {
        static isTypeSupported() {
          return false;
        }
        constructor() {
          throw new Error("MediaRecorder unavailable");
        }
      },
    );

    const { result } = renderHook(() => useMicLevels(4));
    let started = true;

    await act(async () => {
      started = await result.current.start();
    });

    expect(started).toBe(false);
    expect(stopTrack).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(
      "[useMicLevels] MediaRecorder unavailable:",
      expect.any(Error),
    );
  });
});
