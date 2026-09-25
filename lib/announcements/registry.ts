import type { UserData } from "@/types";

/** What an announcement's call-to-action does. The sidebar carries these out. */
export type AnnouncementAction =
  | { type: "open-settings"; tab: string }
  | { type: "navigate"; href: string };

/** Named visuals the spotlight card knows how to draw. */
export type AnnouncementMedia = "appearance-worlds";

export type Announcement = {
  /** Stable slug; it is what the API stores. Never reuse or rename one. */
  id: string;
  title: string;
  body: string;
  /** ms epoch. Users who signed up after this don't see it; before it, nobody does. */
  publishedAt: number;
  /** `major` also gets the one-time spotlight card; `minor` only lights the dot. */
  priority: "major" | "minor";
  media?: AnnouncementMedia;
  cta?: { label: string; action: AnnouncementAction };
  /** Extra audience filter on top of the sign-up date. */
  when?: (user: UserData) => boolean;
};

/**
 * Every "What's new" announcement, newest first. To ship one, add an entry
 * here; test it with `?announcement=<id>` on the dashboard.
 */
export const ANNOUNCEMENTS: readonly Announcement[] = [
  {
    id: "brightspace-calendar",
    title: "Your Brightspace due dates, in Lumina",
    body: "Paste your Brightspace calendar link once and your assignment and quiz due dates show up in your deadlines, with reminders and an overdue list. Lumina checks for changes every few hours.",
    publishedAt: Date.UTC(2026, 8, 24, 17, 0),
    priority: "major",
    cta: {
      label: "Connect Brightspace",
      action: { type: "open-settings", tab: "integrations" },
    },
  },
  {
    id: "appearance-launch",
    title: "Make Lumina yours",
    body: "Pick a world (Paper, Observatory, Focus or Riso), then tune the accent, fonts, reading size and density. Modules can have their own colours too.",
    publishedAt: Date.UTC(2026, 8, 24, 8, 0),
    priority: "major",
    media: "appearance-worlds",
    cta: {
      label: "Personalise Lumina",
      action: { type: "open-settings", tab: "appearance" },
    },
  },
];
