import { describe, expect, it } from "vitest";
import { ANNOUNCEMENTS, type Announcement } from "@/lib/announcements/registry";
import { isForUser, selectAnnouncements } from "@/lib/announcements/select";
import { DEFAULT_APPEARANCE } from "@/lib/appearance/model";
import type { UserData } from "@/types";
import type { AnnouncementEventDto } from "@/types/api/announcements";

const DAY = 24 * 60 * 60 * 1000;
const LAUNCH = Date.UTC(2026, 8, 24);

const user = (overrides: Partial<UserData> = {}): UserData => ({
  _id: "u1",
  tokenIdentifier: "user_1",
  email: "a@example.com",
  appearance: DEFAULT_APPEARANCE,
  _creationTime: LAUNCH - 30 * DAY,
  ...overrides,
});

const announcement = (overrides: Partial<Announcement> = {}): Announcement => ({
  id: "launch",
  title: "Launch",
  body: "Body",
  publishedAt: LAUNCH,
  priority: "major",
  ...overrides,
});

const event = (announcementId: string, kind: AnnouncementEventDto["kind"]): AnnouncementEventDto => ({
  announcementId,
  kind,
  at: LAUNCH + DAY,
});

describe("isForUser", () => {
  it("shows a published announcement to users who signed up before it", () => {
    expect(isForUser(announcement(), user(), LAUNCH + DAY)).toBe(true);
  });

  it("hides it from users who signed up after it went out", () => {
    expect(isForUser(announcement(), user({ _creationTime: LAUNCH + 1 }), LAUNCH + DAY)).toBe(false);
  });

  it("hides it until its publish time", () => {
    expect(isForUser(announcement(), user(), LAUNCH - 1)).toBe(false);
  });

  it("hides it when the sign-up date is unknown", () => {
    expect(isForUser(announcement(), user({ _creationTime: undefined }), LAUNCH + DAY)).toBe(false);
  });

  it("applies the announcement's own `when` filter", () => {
    const onlyPhysics = announcement({ when: (u) => u.major === "physics" });
    expect(isForUser(onlyPhysics, user({ major: "physics" }), LAUNCH + DAY)).toBe(true);
    expect(isForUser(onlyPhysics, user({ major: "history" }), LAUNCH + DAY)).toBe(false);
  });
});

describe("selectAnnouncements", () => {
  const now = LAUNCH + 10 * DAY;
  const major = announcement({ id: "major", publishedAt: LAUNCH });
  const minor = announcement({ id: "minor", priority: "minor", publishedAt: LAUNCH + DAY });

  it("lists the feed newest first, with everything unread to start", () => {
    const state = selectAnnouncements({ announcements: [major, minor], user: user(), events: [], now });
    expect(state.feed.map((a) => a.id)).toEqual(["minor", "major"]);
    expect(state.unread.map((a) => a.id)).toEqual(["minor", "major"]);
  });

  it("counts any event as read", () => {
    const state = selectAnnouncements({
      announcements: [major, minor],
      user: user(),
      events: [event("minor", "seen"), event("major", "dismissed")],
      now,
    });
    expect(state.unread).toEqual([]);
  });

  it("spotlights an undismissed major announcement, never a minor one", () => {
    const state = selectAnnouncements({ announcements: [major, minor], user: user(), events: [], now });
    expect(state.spotlight?.id).toBe("major");
    expect(state.spotlightForced).toBe(false);

    const onlyMinor = selectAnnouncements({ announcements: [minor], user: user(), events: [], now });
    expect(onlyMinor.spotlight).toBeNull();
  });

  it("keeps the spotlight after it has only been seen", () => {
    const state = selectAnnouncements({
      announcements: [major],
      user: user(),
      events: [event("major", "seen")],
      now,
    });
    expect(state.spotlight?.id).toBe("major");
  });

  it("drops the spotlight once it is dismissed or clicked", () => {
    for (const kind of ["dismissed", "clicked"] as const) {
      const state = selectAnnouncements({
        announcements: [major],
        user: user(),
        events: [event("major", kind)],
        now,
      });
      expect(state.spotlight).toBeNull();
    }
  });

  it("forces any known announcement into the spotlight, whatever the rules say", () => {
    const state = selectAnnouncements({
      announcements: [major, minor],
      user: user({ _creationTime: now }),
      events: [event("minor", "dismissed")],
      now,
      forcedId: "minor",
    });
    expect(state.spotlight?.id).toBe("minor");
    expect(state.spotlightForced).toBe(true);
    expect(state.feed).toEqual([]);
  });

  it("ignores a forced id that doesn't exist", () => {
    const state = selectAnnouncements({
      announcements: [major],
      user: user(),
      events: [],
      now,
      forcedId: "nope",
    });
    expect(state.spotlight?.id).toBe("major");
    expect(state.spotlightForced).toBe(false);
  });
});

describe("ANNOUNCEMENTS registry", () => {
  it("uses unique ids the API accepts", () => {
    const ids = ANNOUNCEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9][a-z0-9-]{0,79}$/);
  });

  it("is ordered newest first", () => {
    const times = ANNOUNCEMENTS.map((a) => a.publishedAt);
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });
});
