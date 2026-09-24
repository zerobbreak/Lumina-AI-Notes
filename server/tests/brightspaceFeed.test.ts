import { randomBytes } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/client.js";
import { deadlineReminders, deadlines, lmsConnections, lmsCourseLinks, users } from "../src/db/schema/index.js";
import { classify, cleanTitle, courseOf, parseFeed, parseFeedUrl } from "../src/integrations/brightspace/feed.js";
import { createFeedFetcher, syncFeedConnection, type FeedFetcher } from "../src/integrations/brightspace/sync.js";
import { createSecretBox } from "../src/integrations/secretBox.js";
import { createTestDb } from "./helpers.js";

const NOW = new Date("2026-09-24T10:00:00Z");
const HOST = "https://school.brightspace.com";

type Vevent = { uid: string; summary: string; start: string; location?: string; url?: string; extra?: string };

const vevent = (e: Vevent) =>
  [
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `SUMMARY:${e.summary}`,
    `DTSTART:${e.start}`,
    `DTEND:${e.start}`,
    e.location ? `LOCATION:${e.location}` : null,
    e.url ? `URL:${e.url}` : null,
    e.extra ?? null,
    "END:VEVENT",
  ]
    .filter(Boolean)
    .join("\r\n");

const calendar = (...events: Vevent[]) =>
  ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//D2L//Brightspace//EN", ...events.map(vevent), "END:VCALENDAR"].join(
    "\r\n",
  );

const essay: Vevent = {
  uid: "essay-1@d2l",
  summary: "Essay 1 - Due",
  start: "20261001T215900Z",
  location: "HIST101 - History of Africa",
  url: `${HOST}/d2l/le/calendar/12345/event/901/detailsview`,
};
const quiz: Vevent = {
  uid: "quiz-2@d2l",
  summary: "Quiz 2 - Availability Ends",
  start: "20261005T080000Z",
  location: "MATH201 - Calculus",
  url: `${HOST}/d2l/le/calendar/67890/event/902/detailsview`,
};

describe("parseFeedUrl", () => {
  it("accepts https and webcal links on any school domain", () => {
    expect(parseFeedUrl(" https://learn.example.ac.za/d2l/le/calendar/feed/user/feed.ics?token=x ").hostname).toBe(
      "learn.example.ac.za",
    );
    expect(parseFeedUrl("webcal://school.brightspace.com/feed.ics?token=x").protocol).toBe("https:");
  });

  it("rejects non-links, http, and embedded credentials", () => {
    expect(() => parseFeedUrl("not a link")).toThrow(/doesn't look like a link/);
    expect(() => parseFeedUrl("http://school.brightspace.com/feed.ics")).toThrow(/https/);
    expect(() => parseFeedUrl("https://a:b@school.brightspace.com/feed.ics")).toThrow(/username or password/);
  });
});

describe("parseFeed", () => {
  it("turns dated items into deadlines, keyed by course org unit", () => {
    const items = parseFeed(calendar(essay, quiz), NOW);
    expect(items).toEqual([
      {
        uid: "essay-1@d2l",
        title: "Essay 1",
        dueAt: new Date("2026-10-01T21:59:00Z"),
        kind: "assignment",
        course: { key: "ou:12345", name: "HIST101 - History of Africa" },
        url: essay.url,
      },
      {
        uid: "quiz-2@d2l",
        title: "Quiz 2",
        dueAt: new Date("2026-10-05T08:00:00Z"),
        kind: "exam",
        course: { key: "ou:67890", name: "MATH201 - Calculus" },
        url: quiz.url,
      },
    ]);
  });

  it("honours the feed's VTIMEZONE for local times", () => {
    const zone = [
      "BEGIN:VTIMEZONE",
      "TZID:South Africa Standard Time",
      "BEGIN:STANDARD",
      "DTSTART:16010101T000000",
      "TZOFFSETFROM:+0200",
      "TZOFFSETTO:+0200",
      "END:STANDARD",
      "END:VTIMEZONE",
    ].join("\r\n");
    const ics = calendar({ uid: "tz", summary: "Report - Due", start: "20261001T235900" })
      .replace("PRODID:-//D2L//Brightspace//EN", `PRODID:-//D2L//Brightspace//EN\r\n${zone}`)
      .replaceAll("DTSTART:20261001T235900", "DTSTART;TZID=South Africa Standard Time:20261001T235900")
      .replaceAll("DTEND:20261001T235900", "DTEND;TZID=South Africa Standard Time:20261001T235900");
    expect(parseFeed(ics, NOW)[0]!.dueAt).toEqual(new Date("2026-10-01T21:59:00Z"));
  });

  // Run under TZ=UTC as well: Railway's clock is UTC, and a floating time
  // read in the server's zone would pass on a South African laptop.
  it.each([
    ["Africa/Johannesburg", "20261001T235900", "2026-10-01T21:59:00Z"],
    // DST: New York is UTC-4 in October and UTC-5 in December.
    ["America/New_York", "20261001T235900", "2026-10-02T03:59:00Z"],
    ["America/New_York", "20261201T235900", "2026-12-02T04:59:00Z"],
  ])("resolves a TZID with no VTIMEZONE block (%s %s)", (tzid, local, utc) => {
    const ics = calendar({ uid: "tz", summary: "Report - Due", start: local })
      .replace(`DTSTART:${local}`, `DTSTART;TZID=${tzid}:${local}`)
      .replace(`DTEND:${local}`, `DTEND;TZID=${tzid}:${local}`);
    expect(parseFeed(ics, NOW)[0]!.dueAt).toEqual(new Date(utc));
  });

  it("skips repeating events, window starts, and items far outside the window", () => {
    const items = parseFeed(
      calendar(
        { uid: "lecture", summary: "Lecture", start: "20261001T080000Z", extra: "RRULE:FREQ=WEEKLY;COUNT=10" },
        { uid: "open", summary: "Quiz 2 - Availability Starts", start: "20261001T080000Z" },
        { uid: "old", summary: "Essay 0 - Due", start: "20260101T080000Z" },
        { uid: "far", summary: "Essay 9 - Due", start: "20280101T080000Z" },
        essay,
      ),
      NOW,
    );
    expect(items.map((item) => item.uid)).toEqual(["essay-1@d2l"]);
  });

  it("rejects a page that isn't a calendar (an expired link's login page)", () => {
    expect(() => parseFeed("<html><body>Log in</body></html>", NOW)).toThrow(/didn't return a calendar/);
  });

  it("drops non-https item links", () => {
    const [item] = parseFeed(calendar({ ...essay, url: "javascript:alert(1)" }), NOW);
    expect(item!.url).toBeUndefined();
  });
});

describe("Brightspace naming guesses", () => {
  it.each([
    ["Essay 1 - Due", "assignment"],
    ["Final Project - Due", "assignment"],
    ["Quiz 2 - Availability Ends", "exam"],
    ["Final Exam", "exam"],
    ["Guest lecture", "event"],
    ["Quiz 2 - Availability Starts", null],
    ["Module 3 - Start Date", null],
  ])("classifies %s as %s", (summary, kind) => {
    expect(classify(summary)).toBe(kind);
  });

  it("trims the Brightspace suffix from titles", () => {
    expect(cleanTitle("Essay 1 - Due")).toBe("Essay 1");
    expect(cleanTitle("Quiz 2 - Availability Ends")).toBe("Quiz 2");
    expect(cleanTitle("Lab report: Due Date")).toBe("Lab report");
    expect(cleanTitle("Due diligence reading")).toBe("Due diligence reading");
  });

  it("falls back from org unit to location to a catch-all course", () => {
    expect(courseOf(undefined, "HIST101")).toEqual({ key: "name:hist101", name: "HIST101" });
    expect(courseOf(`${HOST}/d2l/le/calendar/5/event/1/detailsview`, undefined)).toEqual({
      key: "ou:5",
      name: "Course 5",
    });
    expect(courseOf(undefined, "  ")).toEqual({ key: "other", name: "Other Brightspace events" });
  });
});

describe("createFeedFetcher", () => {
  let server: Server;
  let base: string;
  const routes: Record<string, [number, string]> = {
    "/feed.ics": [200, calendar(essay)],
    "/gone.ics": [403, "Forbidden"],
  };

  beforeAll(async () => {
    server = createServer((req, res) => {
      const [status, body] = routes[req.url ?? ""] ?? [404, ""];
      res.writeHead(status, { "Content-Type": "text/calendar" }).end(body);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  const loopbackAllowed = createFeedFetcher({ isAllowedAddress: () => true, protocols: ["http:"] });

  it("fetches the feed", async () => {
    expect(await loopbackAllowed(new URL(`${base}/feed.ics`))).toContain("Essay 1 - Due");
  });

  it("tells the student to reconnect when Brightspace refuses the link", async () => {
    await expect(loopbackAllowed(new URL(`${base}/gone.ics`))).rejects.toThrow(/new Subscribe link/);
  });

  it("refuses private addresses and plain http with the default policy", async () => {
    await expect(createFeedFetcher({ protocols: ["http:"] })(new URL(`${base}/feed.ics`))).rejects.toThrow(
      /not allowed/,
    );
    await expect(createFeedFetcher()(new URL(`${base}/feed.ics`))).rejects.toThrow(/Only https/);
  });
});

describe("syncFeedConnection", () => {
  const box = createSecretBox(randomBytes(32).toString("base64"));
  const FEED = `${HOST}/d2l/le/calendar/feed/user/feed.ics?token=abc`;
  let db: Db;
  let closeDb: () => Promise<void>;
  let userId: string;
  let feed: string;
  const fetcher: FeedFetcher = async () => feed;

  beforeAll(async () => {
    ({ db, close: closeDb } = await createTestDb());
  });
  afterAll(() => closeDb?.());

  beforeEach(async () => {
    await db.delete(users);
    [{ id: userId }] = await db
      .insert(users)
      .values({ clerkUserId: "user_alice", email: "alice@example.test" })
      .returning({ id: users.id });
    feed = calendar(essay, quiz);
  });

  const connect = async () => {
    const [row] = await db
      .insert(lmsConnections)
      .values({ userId, provider: "brightspace", kind: "ical", host: "school.brightspace.com", secret: box.seal(FEED) })
      .returning();
    return row!;
  };
  const reload = async (id: string) =>
    (await db.select().from(lmsConnections).where(eq(lmsConnections.id, id)))[0]!;
  const synced = () => db.select().from(deadlines).where(eq(deadlines.userId, userId)).orderBy(deadlines.dueAt);

  it("imports items as deadlines with reminders, creating a Lumina course for each new course", async () => {
    const connection = await connect();
    const result = await syncFeedConnection(db, box, connection, fetcher, NOW);
    expect(result).toEqual({ ok: true, added: 2, updated: 0, removed: 0, courses: 2 });

    const [owner] = await db.select().from(users).where(eq(users.id, userId));
    const created = owner!.courses!.map((course) => [course.name, course.code, typeof course.color]);
    expect(created).toEqual([
      ["History of Africa", "HIST101", "string"],
      ["Calculus", "MATH201", "string"],
    ]);
    const idByCode = new Map(owner!.courses!.map((course) => [course.code, course.id]));

    const rows = await synced();
    expect(rows.map((row) => [row.title, row.kind, row.source, row.courseId])).toEqual([
      ["Essay 1", "assignment", "brightspace", idByCode.get("HIST101")],
      ["Quiz 2", "exam", "brightspace", idByCode.get("MATH201")],
    ]);
    expect(await db.select().from(deadlineReminders).where(eq(deadlineReminders.deadlineId, rows[0]!.id))).not.toHaveLength(0);

    const links = await db.select().from(lmsCourseLinks).orderBy(lmsCourseLinks.externalKey);
    expect(links.map((link) => [link.externalKey, link.externalName, link.courseId])).toEqual([
      ["ou:12345", "HIST101 - History of Africa", idByCode.get("HIST101")],
      ["ou:67890", "MATH201 - Calculus", idByCode.get("MATH201")],
    ]);
    const after = await reload(connection.id);
    expect(after.status).toBe("active");
    expect(after.lastSyncedAt).toEqual(NOW);
  });

  it("leaves a known course's choice alone, even \"No course\"", async () => {
    const connection = await connect();
    await syncFeedConnection(db, box, connection, fetcher, NOW);
    await db.update(lmsCourseLinks).set({ courseId: null }).where(eq(lmsCourseLinks.externalKey, "ou:12345"));
    await db.update(users).set({ courses: [] }).where(eq(users.id, userId));

    await syncFeedConnection(db, box, connection, fetcher, NOW);
    const [owner] = await db.select().from(users).where(eq(users.id, userId));
    expect(owner!.courses).toEqual([]);
    const [link] = await db.select().from(lmsCourseLinks).where(eq(lmsCourseLinks.externalKey, "ou:12345"));
    expect(link!.courseId).toBeNull();
  });

  it("re-syncing is idempotent, and updates a moved due date without touching completion", async () => {
    const connection = await connect();
    await syncFeedConnection(db, box, connection, fetcher, NOW);
    expect(await syncFeedConnection(db, box, connection, fetcher, NOW)).toMatchObject({ added: 0, updated: 0 });

    const [essayRow] = await synced();
    await db.update(deadlines).set({ completedAt: NOW, notes: "draft done" }).where(eq(deadlines.id, essayRow!.id));

    feed = calendar({ ...essay, start: "20261003T215900Z" }, quiz);
    expect(await syncFeedConnection(db, box, connection, fetcher, NOW)).toMatchObject({ added: 0, updated: 1 });

    const moved = (await db.select().from(deadlines).where(eq(deadlines.id, essayRow!.id)))[0]!;
    expect(moved.dueAt).toEqual(new Date("2026-10-03T21:59:00Z"));
    expect(moved.completedAt).toEqual(NOW);
    expect(moved.notes).toBe("draft done");
  });

  it("files items under the mapped course and skips ignored courses", async () => {
    const connection = await connect();
    await syncFeedConnection(db, box, connection, fetcher, NOW);
    await db.update(lmsCourseLinks).set({ courseId: "course-hist" }).where(eq(lmsCourseLinks.externalKey, "ou:12345"));
    await db.update(lmsCourseLinks).set({ ignored: true }).where(eq(lmsCourseLinks.externalKey, "ou:67890"));

    expect(await syncFeedConnection(db, box, connection, fetcher, NOW)).toMatchObject({ updated: 1, removed: 1 });
    expect((await synced()).map((row) => [row.title, row.courseId])).toEqual([["Essay 1", "course-hist"]]);
  });

  it("removes future unfinished items that left the feed, but keeps finished and past ones", async () => {
    const past: Vevent = { uid: "past@d2l", summary: "Lab 1 - Due", start: "20260920T080000Z", location: "HIST101" };
    const done: Vevent = { uid: "done@d2l", summary: "Lab 2 - Due", start: "20261010T080000Z", location: "HIST101" };
    feed = calendar(essay, quiz, past, done);
    const connection = await connect();
    await syncFeedConnection(db, box, connection, fetcher, NOW);
    await db.update(deadlines).set({ completedAt: NOW }).where(eq(deadlines.externalId, "done@d2l"));

    feed = calendar(essay);
    expect(await syncFeedConnection(db, box, connection, fetcher, NOW)).toMatchObject({ removed: 1 });
    expect((await synced()).map((row) => row.externalId).sort()).toEqual(["done@d2l", "essay-1@d2l", "past@d2l"]);
  });

  it("on failure, marks the connection with a message for the student and keeps deadlines", async () => {
    const connection = await connect();
    await syncFeedConnection(db, box, connection, fetcher, NOW);

    feed = "<html>Log in to Brightspace</html>";
    const result = await syncFeedConnection(db, box, connection, fetcher, NOW);
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/didn't return a calendar/) });

    const after = await reload(connection.id);
    expect(after.status).toBe("error");
    expect(after.lastError).toMatch(/didn't return a calendar/);
    expect(await synced()).toHaveLength(2);
  });

  it("hides unexpected errors from the student", async () => {
    const connection = await connect();
    const boom: FeedFetcher = async () => {
      throw new Error("ECONNRESET 10.0.0.5:443");
    };
    const result = await syncFeedConnection(db, box, connection, boom, NOW);
    expect(result).toEqual({ ok: false, error: "We couldn't reach Brightspace. We'll try again later." });
  });
});
