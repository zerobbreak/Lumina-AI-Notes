import { Mic, Zap, Brain, LucideIcon } from "lucide-react";

export interface Step {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
  bg: string;
  border: string;
}

export const HOW_IT_WORKS_STEPS: Step[] = [
  {
    icon: Mic,
    title: "1. Capture",
    description:
      "Hit record. Lumina listens to your professor nicely, differentiating between key concepts, tangents, and important dates.",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  {
    icon: Zap,
    title: "2. Process",
    description:
      "Gemini 1.5 Flash processes audio in real-time, identifying formulas, action items, and definitions instantly.",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
  },
  {
    icon: Brain,
    title: "3. Master",
    description:
      "Receive a structured Notion-style page with summaries, quizzes, and flashcards ready for studying.",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
  },
];
