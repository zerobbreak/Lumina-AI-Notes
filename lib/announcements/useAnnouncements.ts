"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useRecordAnnouncementEvent } from "@/lib/mutations/announcements/useRecordAnnouncementEvent";
import { useAnnouncementEvents } from "@/lib/queries/announcements/useAnnouncementEvents";
import { useCurrentUser } from "@/lib/queries/users/useCurrentUser";
import type { AnnouncementEventKind } from "@/types/api/announcements";
import { ANNOUNCEMENTS } from "./registry";
import { selectAnnouncements, type AnnouncementState } from "./select";

export const FORCE_ANNOUNCEMENT_PARAM = "announcement";

const EMPTY: AnnouncementState = { feed: [], unread: [], spotlight: null, spotlightForced: false };

/**
 * The signed-in user's announcements, plus a way to record what they do with
 * them. Nothing shows until both the profile and the events have loaded, so a
 * dismissed card never flashes back on a slow API.
 */
export function useAnnouncements() {
  const { data: user } = useCurrentUser();
  const { data: events } = useAnnouncementEvents();
  const { mutate } = useRecordAnnouncementEvent();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const forcedId = searchParams.get(FORCE_ANNOUNCEMENT_PARAM);
  // Fixed at mount: one published mid-session shows on the next page load.
  const [now] = useState(() => Date.now());

  const state = useMemo(
    () =>
      user && events
        ? selectAnnouncements({ announcements: ANNOUNCEMENTS, user, events, now, forcedId })
        : EMPTY,
    [user, events, now, forcedId],
  );

  const record = useCallback(
    (announcementId: string, kind: AnnouncementEventKind) => {
      const known = events?.some((e) => e.announcementId === announcementId && e.kind === kind);
      if (!known) mutate({ announcementId, kind });
    },
    [events, mutate],
  );

  /** Drops `?announcement=` so a forced card goes away once handled. */
  const clearForced = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(FORCE_ANNOUNCEMENT_PARAM);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  return { ...state, ready: Boolean(user && events), record, clearForced };
}
