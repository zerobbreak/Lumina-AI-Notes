/**
 * Core application types
 * These types match the Convex schema definitions
 */

// Module type - represents a module within a course
export interface Module {
  id: string;
  title: string;
}

// Course type - represents a user's course
export interface Course {
  id: string;
  name: string;
  code: string;
  defaultNoteStyle?: string;
  modules?: Module[];
}

// File type - represents an uploaded file
export interface UserFile {
  _id: string;
  userId: string;
  name: string;
  type: string;
  url?: string;
  storageId?: string;
  courseId?: string;
  createdAt: number;
}

// Note type - represents a note document
export interface Note {
  _id: string;
  userId: string;
  title: string;
  content?: string;
  major?: string;
  courseId?: string;
  moduleId?: string;
  parentNoteId?: string;
  style?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  isShared?: boolean;
  createdAt: number;
}

// Recording type - represents an audio recording
export interface Recording {
  _id: string;
  userId: string;
  sessionId: string;
  title: string;
  transcript: string;
  audioUrl?: string;
  duration?: number;
  createdAt: number;
}

// User data type - represents the user profile
export interface UserData {
  _id: string;
  tokenIdentifier: string;
  email: string;
  name?: string;
  image?: string;
  onboardingComplete?: boolean;
  major?: string;
  semester?: string;
  courses?: Course[];
  noteStyle?: string;
  enabledBlocks?: string[];
}

// Flashcard deck type - represents a collection of flashcards
export interface FlashcardDeck {
  _id: string;
  userId: string;
  title: string;
  sourceNoteId?: string;
  courseId?: string;
  cardCount: number;
  createdAt: number;
  lastStudiedAt?: number;
}

// Flashcard type - represents a single flashcard
export interface Flashcard {
  _id: string;
  userId: string;
  deckId: string;
  front: string;
  back: string;
  difficulty?: number;
  nextReviewAt?: number;
  reviewCount?: number;
  lastReviewedAt?: number;
  easeFactor?: number;
  interval?: number;
  repetitions?: number;
  lastRating?: "easy" | "medium" | "hard";
}
