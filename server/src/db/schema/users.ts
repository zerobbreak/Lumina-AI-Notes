import { boolean, index, integer, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, id, timestamptz, updatedAt } from "./columns.js";

export type CourseModule = { id: string; title: string };

export type Course = {
  id: string;
  name: string;
  code: string;
  /** "standard" | "outline" | "mindmap" */
  defaultNoteStyle?: string;
  templatePromptDisabled?: boolean;
  modules?: CourseModule[];
};

export type MonthlyUsage = {
  audioMinutesUsed: number;
  notesCreated: number;
  /** ms timestamp */
  lastResetDate: number;
};

export const users = pgTable(
  "users",
  {
    id: id(),
    // Convex keyed users by tokenIdentifier ("<issuer>|<clerk user id>").
    // The API gets the bare Clerk id from getAuth(), so store that instead.
    clerkUserId: text().notNull().unique(),
    email: text().notNull(),
    name: text(),
    image: text(),

    // Onboarding
    onboardingComplete: boolean().notNull().default(false),
    major: text(),
    semester: text(),
    // Courses and their modules are owned by the user and edited as a unit;
    // notes/decks/deadlines reference them by the ids inside this JSON.
    courses: jsonb().$type<Course[]>(),
    /** "standard" | "outline" | "mindmap" */
    noteStyle: text(),
    /** UI accent colour, e.g. "indigo" */
    theme: text(),
    enabledBlocks: text().array(),

    // Usage tracking
    monthlyUsage: jsonb().$type<MonthlyUsage>(),

    // Study streaks and gamification
    currentStreak: integer(),
    longestStreak: integer(),
    /** Start of the user's local day */
    lastStudiedDate: timestamptz(),
    lastTimezoneOffsetMinutes: integer(),
    badges: text().array(),
    dailyGoalMinutes: integer(),
    dailyGoalCards: integer(),

    // Product tour
    tourCompleted: boolean().notNull().default(false),
    tourStep: integer(),

    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.email)],
);
