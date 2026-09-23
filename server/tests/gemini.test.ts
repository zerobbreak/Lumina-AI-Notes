import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_GEMINI_MODELS, getGeminiModel, parseGeminiModels } from "../src/ai/gemini.js";

/** What each model name does when called: a reply, or an error to throw. */
const behaviour = new Map<string, string | Error>();
const called: string[] = [];

vi.mock("@google/generative-ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@google/generative-ai")>();
  class FakeGoogleGenerativeAI {
    getGenerativeModel({ model }: { model: string }) {
      const run = async () => {
        called.push(model);
        const outcome = behaviour.get(model) ?? `reply from ${model}`;
        if (outcome instanceof Error) throw outcome;
        return { response: { text: () => outcome } };
      };
      return { generateContent: run, generateContentStream: run };
    }
  }
  return { ...actual, GoogleGenerativeAI: FakeGoogleGenerativeAI };
});

const httpError = (status: number) => Object.assign(new Error(`[${status}]`), { status });
const CHAIN = ["primary", "backup", "last"];

beforeEach(() => {
  behaviour.clear();
  called.length = 0;
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("getGeminiModel", () => {
  it("uses the first model when it answers", async () => {
    const result = await getGeminiModel("key", undefined, CHAIN).generateContent("hi");
    expect(result.response.text()).toBe("reply from primary");
    expect(called).toEqual(["primary"]);
  });

  it.each([503, 429, 404])("falls back to the next model on %i", async (status) => {
    behaviour.set("primary", httpError(status));
    const result = await getGeminiModel("key", undefined, CHAIN).generateContent("hi");
    expect(result.response.text()).toBe("reply from backup");
    expect(called).toEqual(["primary", "backup"]);
  });

  it("falls back for streams too", async () => {
    behaviour.set("primary", httpError(503));
    await getGeminiModel("key", undefined, CHAIN).generateContentStream("hi");
    expect(called).toEqual(["primary", "backup"]);
  });

  it("throws the last error when every model is busy", async () => {
    for (const model of CHAIN) behaviour.set(model, httpError(503));
    await expect(getGeminiModel("key", undefined, CHAIN).generateContent("hi")).rejects.toMatchObject({ status: 503 });
    expect(called).toEqual(CHAIN);
  });

  it("does not fall back on errors another model wouldn't fix", async () => {
    behaviour.set("primary", httpError(400));
    await expect(getGeminiModel("key", undefined, CHAIN).generateContent("hi")).rejects.toMatchObject({ status: 400 });
    expect(called).toEqual(["primary"]);
  });

  it("requires an API key", () => {
    expect(() => getGeminiModel(undefined)).toThrow("GEMINI_API_KEY environment variable not set");
  });
});

describe("parseGeminiModels", () => {
  it("reads a comma-separated list", () => {
    expect(parseGeminiModels(" a , b,,c ")).toEqual(["a", "b", "c"]);
  });

  it("uses the defaults when unset or empty", () => {
    expect(parseGeminiModels(undefined)).toEqual(DEFAULT_GEMINI_MODELS);
    expect(parseGeminiModels(" , ")).toEqual(DEFAULT_GEMINI_MODELS);
  });
});
