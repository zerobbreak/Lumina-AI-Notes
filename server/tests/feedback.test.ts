import { eq } from "drizzle-orm";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "../src/db/client.js";
import { feedback, users } from "../src/db/schema/index.js";
import { loadEnv } from "../src/env.js";
import { parseFormPrefillUrl } from "../src/feedback/googleForm.js";
import { MAX_FEEDBACK_PER_DAY } from "../src/routes/feedback.js";
import { bearer, buildApp, createTestDb, testEnv } from "./helpers.js";

const ALICE = "user_alice";
const FORM = "https://docs.google.com/forms/d/e/1FAIpQLSabc-123_x/viewform";
const PREFILL =
  `${FORM}?usp=pp_url&entry.111=type&entry.222=message&entry.333=rating&entry.444=email` +
  "&entry.555=userId&entry.666=page&entry.777=limit&entry.888=app&entry.999=name";

let db: Db;
let closeDb: () => Promise<void>;
let fetchMock: ReturnType<typeof vi.fn>;

beforeAll(async () => {
  ({ db, close: closeDb } = await createTestDb());
});
afterAll(() => closeDb?.());

beforeEach(async () => {
  await db.delete(users);
  fetchMock = vi.fn(async () => new Response("Your response has been recorded.", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const app = (formUrl?: string) => buildApp({ db, env: { ...testEnv, FEEDBACK_FORM_URL: formUrl } });
const send = (a: ReturnType<typeof buildApp>, body: object) =>
  request(a).post("/api/v1/feedback").set("Authorization", bearer(ALICE)).send(body);
const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

describe("parseFormPrefillUrl", () => {
  it("maps each answered field to its entry and targets formResponse", () => {
    const form = parseFormPrefillUrl(PREFILL);
    expect(form?.action).toBe("https://docs.google.com/forms/d/e/1FAIpQLSabc-123_x/formResponse");
    expect(form?.entries).toMatchObject({ type: "entry.111", message: "entry.222", limit: "entry.777", name: "entry.999" });
  });

  it("matches answers loosely and ignores ones it doesn't know", () => {
    const form = parseFormPrefillUrl(`${FORM}?usp=pp_url&entry.1=%20Message%20&entry.2=favourite+colour`);
    expect(form?.entries).toEqual({ message: "entry.1" });
  });

  it("refuses links it can't submit to", () => {
    expect(parseFormPrefillUrl("not a url")).toBeNull();
    expect(parseFormPrefillUrl(`${FORM}?usp=pp_url&entry.1=type`)).toBeNull(); // no message field
    expect(parseFormPrefillUrl("https://forms.gle/abc123")).toBeNull(); // short link has no entry ids
    expect(parseFormPrefillUrl(PREFILL.replace("docs.google.com", "evil.example"))).toBeNull();
  });

  it("fails boot on a bad FEEDBACK_FORM_URL", () => {
    expect(() => loadEnv({ ...testEnv, FEEDBACK_FORM_URL: "https://forms.gle/abc" } as never)).toThrow(/FEEDBACK_FORM_URL/);
  });
});

describe("POST /api/v1/feedback", () => {
  it("stores the feedback and sends it to the Google Form with the user's details", async () => {
    const res = await send(app(PREFILL), {
      kind: "more",
      message: "  I record 3 lectures a day  ",
      rating: 4,
      page: "/dashboard?view=home",
      limitCode: "audio_limit_exceeded",
      app: "web · Chrome",
    });
    expect(res.status).toBe(201);
    await settle();

    const [row] = await db.select().from(feedback);
    expect(row).toMatchObject({ kind: "more", message: "I record 3 lectures a day", rating: 4 });
    expect(row.forwardedAt).toBeInstanceOf(Date);

    const [user] = await db.select().from(users).where(eq(users.clerkUserId, ALICE));
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://docs.google.com/forms/d/e/1FAIpQLSabc-123_x/formResponse");
    const sent = Object.fromEntries(init.body as URLSearchParams);
    expect(sent).toMatchObject({
      "entry.111": "Needs higher limits",
      "entry.222": "I record 3 lectures a day",
      "entry.333": "4",
      "entry.444": user.email,
      "entry.555": user.id,
      "entry.666": "/dashboard?view=home",
      "entry.777": "audio_limit_exceeded",
      "entry.888": "web · Chrome",
    });
  });

  it("keeps the feedback when the form refuses it", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockResolvedValue(new Response("gone", { status: 404 }));
    expect((await send(app(PREFILL), { kind: "bug", message: "Export crashed" })).status).toBe(201);
    await settle();
    const [row] = await db.select().from(feedback);
    expect(row.message).toBe("Export crashed");
    expect(row.forwardedAt).toBeNull();
  });

  it("only stores it when no form is configured", async () => {
    expect((await send(app(), { kind: "idea", message: "Dark mode for PDFs" })).status).toBe(201);
    await settle();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await db.select().from(feedback)).toHaveLength(1);
  });

  it("validates the body", async () => {
    expect((await send(app(), { kind: "idea", message: "   " })).status).toBe(400);
    expect((await send(app(), { kind: "rant", message: "hi" })).status).toBe(400);
    expect((await send(app(), { kind: "idea", message: "hi", rating: 9 })).status).toBe(400);
  });

  it("caps how much one user can send in a day", async () => {
    const a = app();
    for (let i = 0; i < MAX_FEEDBACK_PER_DAY; i++) {
      expect((await send(a, { kind: "other", message: `note ${i}` })).status).toBe(201);
    }
    const refused = await send(a, { kind: "other", message: "one more" });
    expect(refused.status).toBe(429);
    expect(refused.body.error.code).toBe("feedback_limit");
  });

  it("is removed with the account", async () => {
    await send(app(), { kind: "praise", message: "Love it" }).expect(201);
    await db.delete(users);
    expect(await db.select().from(feedback)).toHaveLength(0);
  });
});
