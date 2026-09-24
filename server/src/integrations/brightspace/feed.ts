import ICAL from "ical.js";
import { UserFacingError } from "../../ai/errors.js";

export type DeadlineKind = "assignment" | "exam" | "event";

/** One dated item from a student's Brightspace calendar feed. */
export type FeedItem = {
  /** The event's iCal UID; a re-sync updates the deadline with the same UID. */
  uid: string;
  title: string;
  dueAt: Date;
  kind: DeadlineKind;
  course: FeedCourse;
  url?: string;
};

export type FeedCourse = { key: string; name: string };

/** More than any real semester; stops a hostile feed from filling the table. */
export const MAX_FEED_ITEMS = 2000;

// Items outside this window are left alone: long-past ones are history, and
// far-future ones are usually placeholders.
const PAST_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const FUTURE_WINDOW_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Checks what a student pasted before anything is fetched. Brightspace feed
 * links are https and carry a token; schools use their own domains
 * (learn.example.ac.za as often as example.brightspace.com), so the host
 * isn't pinned. The SSRF guard in net/safeGet does the real checking.
 */
export function parseFeedUrl(raw: string): URL {
  let url: URL;
  try {
    // webcal:// is what calendar apps get handed; it's plain https underneath.
    url = new URL(raw.trim().replace(/^webcal:\/\//i, "https://"));
  } catch {
    throw new UserFacingError("That doesn't look like a link. Copy the whole Subscribe link from Brightspace Calendar.");
  }
  if (url.protocol !== "https:") {
    throw new UserFacingError("The calendar link must start with https://");
  }
  if (url.username || url.password) {
    throw new UserFacingError("That link has a username or password in it; use the Subscribe link from Brightspace Calendar.");
  }
  return url;
}

/**
 * Parses the feed into deadline-shaped items. Throws a UserFacingError when
 * the text isn't a calendar at all (usually a login page from an expired link).
 */
export function parseFeed(ics: string, now: Date = new Date()): FeedItem[] {
  let root: ICAL.Component;
  try {
    root = new ICAL.Component(ICAL.parse(ics));
  } catch {
    throw new UserFacingError("That link didn't return a calendar. Check it's the Subscribe link, or make a new one in Brightspace.");
  }
  if (root.name !== "vcalendar") {
    throw new UserFacingError("That link didn't return a calendar. Check it's the Subscribe link, or make a new one in Brightspace.");
  }

  const from = now.getTime() - PAST_WINDOW_MS;
  const to = now.getTime() + FUTURE_WINDOW_MS;
  const items = new Map<string, FeedItem>();

  for (const component of root.getAllSubcomponents("vevent")) {
    const event = new ICAL.Event(component);
    // Deadlines happen once; repeating events are lectures and office hours.
    if (!event.uid || !event.startDate || event.isRecurring()) continue;

    const summary = (event.summary ?? "").trim();
    const kind = classify(summary);
    if (!kind) continue;

    const tzid = component.getFirstProperty("dtstart")?.getParameter("tzid");
    const dueAt = toInstant(event.startDate, typeof tzid === "string" ? tzid : undefined);
    if (Number.isNaN(dueAt.getTime()) || dueAt.getTime() < from || dueAt.getTime() > to) continue;

    const url = safeLink(component.getFirstPropertyValue("url"));
    items.set(event.uid, {
      uid: event.uid,
      title: cleanTitle(summary) || "Untitled",
      dueAt,
      kind,
      course: courseOf(url, event.location),
      url,
    });
    if (items.size > MAX_FEED_ITEMS) {
      throw new UserFacingError("That calendar has too many events to sync.");
    }
  }
  return [...items.values()];
}

// --- Brightspace-specific guesses -------------------------------------------
// Written from how Brightspace names calendar entries ("Essay 1 - Due",
// "Quiz 2 - Availability Ends") without a real feed to hand. Check these
// against a real feed and adjust; the tests pin the current behaviour.

/** Which items become deadlines, and of what kind. Null: skip it. */
export function classify(summary: string): DeadlineKind | null {
  // The start of a window isn't something to be reminded about.
  if (/\b(availability|access)\s+(starts?|begins?)\b|\bstart date\b/i.test(summary)) return null;
  if (/\b(quiz|test|exam|midterm)\b/i.test(summary)) return "exam";
  if (/\b(due|assignment|submission|dropbox|essay|project|report|lab)\b/i.test(summary)) return "assignment";
  return "event";
}

/** "Essay 1 - Due" -> "Essay 1". */
export function cleanTitle(summary: string): string {
  return summary
    .replace(/\s*[-–:]\s*(due( date)?|availability ends|end date|ends)\s*$/i, "")
    .trim()
    .slice(0, 300);
}

/**
 * Which course an item belongs to. Brightspace event links look like
 * /d2l/le/calendar/<orgUnitId>/event/<id>/..., and the org unit id is the same
 * one the OAuth API uses, so it's the best key. Otherwise fall back to the
 * event's location, where Brightspace puts the course name.
 */
export function courseOf(url: string | undefined, location: string | null | undefined): FeedCourse {
  const name = (location ?? "").trim().slice(0, 200);
  const orgUnit = url?.match(/\/d2l\/le\/calendar\/(\d+)\//)?.[1];
  if (orgUnit) return { key: `ou:${orgUnit}`, name: name || `Course ${orgUnit}` };
  if (name) return { key: `name:${name.toLowerCase()}`, name };
  return { key: "other", name: "Other Brightspace events" };
}

// -----------------------------------------------------------------------------

/**
 * ical.js resolves times against a VTIMEZONE block in the feed. A TZID with
 * no block ("Africa/Johannesburg") comes back floating, which toJSDate reads
 * in the server's zone: UTC on Railway, so every deadline would be hours off.
 * Resolve those with the platform's own zone data instead.
 */
function toInstant(time: ICAL.Time, tzid: string | undefined): Date {
  if (time.zone?.tzid !== "floating" || !tzid || !isKnownZone(tzid)) return time.toJSDate();

  const wall = Date.UTC(time.year, time.month - 1, time.day, time.hour, time.minute, time.second);
  // The zone's offset at that moment; the second pass settles DST edges.
  let instant = wall - zoneOffsetMs(wall, tzid);
  instant = wall - zoneOffsetMs(instant, tzid);
  return new Date(instant);
}

function isKnownZone(tzid: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tzid });
    return true;
  } catch {
    return false;
  }
}

/** How far `tzid`'s wall clock is ahead of UTC at the given instant. */
function zoneOffsetMs(instant: number, tzid: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tzid,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    })
      .formatToParts(new Date(instant))
      .map((part) => [part.type, Number(part.value)]),
  );
  const asUtc = Date.UTC(parts.year!, parts.month! - 1, parts.day!, parts.hour!, parts.minute!, parts.second!);
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** Only https links are kept: they're rendered as "Open in Brightspace". */
function safeLink(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href.slice(0, 2000) : undefined;
  } catch {
    return undefined;
  }
}
