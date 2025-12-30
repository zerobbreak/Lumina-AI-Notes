import { Sparkles, BookOpen, Users, LucideIcon } from "lucide-react";

export interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const FEATURES: Feature[] = [
  {
    icon: Sparkles,
    title: "AI Intelligence",
    description:
      "Turn an hour lecture into a 5-minute read with instant AI summaries and flashcard generation.",
  },
  {
    icon: BookOpen,
    title: "Smart Syllabus",
    description:
      "Auto-organize notes by semester and subject automatically. Visual maps for your entire degree.",
  },
  {
    icon: Users,
    title: "Real-time Sync",
    description:
      "Collaborate on group projects with a multiplayer canvas. See changes as they happen.",
  },
];
