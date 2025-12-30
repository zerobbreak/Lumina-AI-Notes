export interface NavLink {
  href: string;
  label: string;
}

export const NAV_LINKS: NavLink[] = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#about", label: "About" },
];

export const PUBLIC_ROUTES = ["/", "/sign-in(.*)", "/sign-up(.*)"];

export const APP_NAME = "NoteAI";

export const SITE_CONFIG = {
  name: "NoteAI",
  description:
    "The ultimate workspace for students. Organize courses, summarize lectures, and ace exams without the burnout.",
  url: "https://noteai.com",
} as const;
