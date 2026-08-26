import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Calculator,
  Code,
  Dna,
  Gavel,
  Landmark,
  Stethoscope,
  TrendingUp,
} from "lucide-react";

const PLACEHOLDER_CODE = "REQ-001";

/** Heuristic icon from a course code — same rules as the home course cards. */
export function getCourseIcon(code: string): LucideIcon {
  const c = code.toLowerCase();
  if (c.includes("cs") || c.includes("comp")) return Code;
  if (c.includes("bio")) return Dna;
  if (c.includes("bus") || c.includes("econ")) return TrendingUp;
  if (c.includes("eng") || c.includes("mech")) return Calculator;
  if (c.includes("med") || c.includes("nur")) return Stethoscope;
  if (c.includes("law")) return Gavel;
  if (c.includes("hist")) return Landmark;
  return BookOpen;
}

/** Two-letter initials when the code is still the onboarding placeholder. */
export function getCourseInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "??";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}

export function isPlaceholderCourseCode(code: string): boolean {
  const trimmed = code.trim();
  return trimmed.length === 0 || trimmed === PLACEHOLDER_CODE;
}

/** Hide generic or duplicate codes so the sidebar does not show three "REQ-001" chips. */
export function shouldShowCourseCode(
  code: string,
  peerCodes: readonly string[],
): boolean {
  const trimmed = code.trim();
  if (!trimmed || trimmed === PLACEHOLDER_CODE) return false;
  const duplicates = peerCodes.filter((c) => c.trim() === trimmed).length;
  return duplicates <= 1;
}

export function shouldUseCourseInitials(code: string): boolean {
  return isPlaceholderCourseCode(code);
}
