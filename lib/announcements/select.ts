import type { UserData } from "@/types";
import type { AnnouncementEventDto, AnnouncementEventKind } from "@/types/api/announcements";
import type { Announcement } from "./registry";

/**
 * Published, and meant for this user: they signed up before it went out
 * (newer users already met the feature in onboarding) and pass its `when`.
 * A user with no known sign-up date sees nothing, rather than everything.
 */
export function isForUser(announcement: Announcement, user: UserData, now: number): boolean {
  if (announcement.publishedAt > now) return false;
  if (user._creationTime === undefined || user._creationTime >= announcement.publishedAt) {
    return false;
  }
  return announcement.when ? announcement.when(user) : true;
}

function hasEvent(
  events: readonly AnnouncementEventDto[],
  id: string,
  kinds: readonly AnnouncementEventKind[],
) {
  return events.some((e) => e.announcementId === id && kinds.includes(e.kind));
}

export type AnnouncementState = {
  /** The "What's new" feed, newest first. */
  feed: Announcement[];
  /** Feed entries the user hasn't seen yet; drives the sidebar dot. */
  unread: Announcement[];
  /** The one major announcement to show as a card, if any. */
  spotlight: Announcement | null;
  /** True when the spotlight came from `?announcement=`, not the audience rules. */
  spotlightForced: boolean;
};

/**
 * Works out what to show from the registry, the user, and their events.
 * `forcedId` (from `?announcement=<id>`) spotlights that announcement
 * whatever its audience, priority or history, for testing.
 */
export function selectAnnouncements({
  announcements,
  user,
  events,
  now,
  forcedId,
}: {
  announcements: readonly Announcement[];
  user: UserData;
  events: readonly AnnouncementEventDto[];
  now: number;
  forcedId?: string | null;
}): AnnouncementState {
  const feed = announcements
    .filter((a) => isForUser(a, user, now))
    .sort((a, b) => b.publishedAt - a.publishedAt);

  const unread = feed.filter((a) => !hasEvent(events, a.id, ["seen", "dismissed", "clicked"]));

  const forced = forcedId ? announcements.find((a) => a.id === forcedId) : undefined;
  if (forced) {
    return { feed, unread, spotlight: forced, spotlightForced: true };
  }

  const spotlight =
    feed.find((a) => a.priority === "major" && !hasEvent(events, a.id, ["dismissed", "clicked"])) ??
    null;

  return { feed, unread, spotlight, spotlightForced: false };
}
