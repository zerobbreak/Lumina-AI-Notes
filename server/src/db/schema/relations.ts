import { relations } from "drizzle-orm";
import { chatMessages, chatSessions } from "./chat.js";
import { noteCollaborators, noteInvites, presence } from "./collaboration.js";
import { deadlineReminders, deadlines, notifications } from "./deadlines.js";
import { files } from "./files.js";
import {
  flashcardDecks,
  flashcardReviewEvents,
  flashcardReviewQueues,
  flashcards,
} from "./flashcards.js";
import { noteLinkedFiles, notes, noteTags, tags } from "./notes.js";
import { quizDecks, quizQuestions, quizResults } from "./quizzes.js";
import { recordings } from "./recordings.js";
import { users } from "./users.js";

// Powers `db.query.<table>.findMany({ with: ... })`. Foreign keys live on the tables.

export const usersRelations = relations(users, ({ many }) => ({
  notes: many(notes),
  files: many(files),
  recordings: many(recordings),
  tags: many(tags),
  flashcardDecks: many(flashcardDecks),
  quizDecks: many(quizDecks),
  chatSessions: many(chatSessions),
  deadlines: many(deadlines),
  notifications: many(notifications),
}));

export const notesRelations = relations(notes, ({ one, many }) => ({
  owner: one(users, { fields: [notes.userId], references: [users.id] }),
  parent: one(notes, {
    fields: [notes.parentNoteId],
    references: [notes.id],
    relationName: "note_children",
  }),
  children: many(notes, { relationName: "note_children" }),
  sourceRecording: one(recordings, {
    fields: [notes.sourceRecordingId],
    references: [recordings.id],
  }),
  tags: many(noteTags),
  linkedFiles: many(noteLinkedFiles),
  collaborators: many(noteCollaborators),
  invites: many(noteInvites),
  presence: many(presence),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  owner: one(users, { fields: [tags.userId], references: [users.id] }),
  notes: many(noteTags),
}));

export const noteTagsRelations = relations(noteTags, ({ one }) => ({
  note: one(notes, { fields: [noteTags.noteId], references: [notes.id] }),
  tag: one(tags, { fields: [noteTags.tagId], references: [tags.id] }),
}));

export const noteLinkedFilesRelations = relations(noteLinkedFiles, ({ one }) => ({
  note: one(notes, { fields: [noteLinkedFiles.noteId], references: [notes.id] }),
  file: one(files, { fields: [noteLinkedFiles.fileId], references: [files.id] }),
}));

export const filesRelations = relations(files, ({ one, many }) => ({
  owner: one(users, { fields: [files.userId], references: [users.id] }),
  linkedNotes: many(noteLinkedFiles),
}));

export const recordingsRelations = relations(recordings, ({ one, many }) => ({
  owner: one(users, { fields: [recordings.userId], references: [users.id] }),
  notes: many(notes),
}));

export const presenceRelations = relations(presence, ({ one }) => ({
  note: one(notes, { fields: [presence.noteId], references: [notes.id] }),
  user: one(users, { fields: [presence.userId], references: [users.id] }),
}));

export const noteCollaboratorsRelations = relations(noteCollaborators, ({ one }) => ({
  note: one(notes, { fields: [noteCollaborators.noteId], references: [notes.id] }),
  user: one(users, { fields: [noteCollaborators.userId], references: [users.id] }),
}));

export const noteInvitesRelations = relations(noteInvites, ({ one }) => ({
  note: one(notes, { fields: [noteInvites.noteId], references: [notes.id] }),
}));

export const flashcardDecksRelations = relations(flashcardDecks, ({ one, many }) => ({
  owner: one(users, { fields: [flashcardDecks.userId], references: [users.id] }),
  sourceNote: one(notes, { fields: [flashcardDecks.sourceNoteId], references: [notes.id] }),
  cards: many(flashcards),
  reviewEvents: many(flashcardReviewEvents),
}));

export const flashcardsRelations = relations(flashcards, ({ one, many }) => ({
  deck: one(flashcardDecks, { fields: [flashcards.deckId], references: [flashcardDecks.id] }),
  reviewEvents: many(flashcardReviewEvents),
}));

export const flashcardReviewQueuesRelations = relations(flashcardReviewQueues, ({ one }) => ({
  user: one(users, { fields: [flashcardReviewQueues.userId], references: [users.id] }),
}));

export const flashcardReviewEventsRelations = relations(flashcardReviewEvents, ({ one }) => ({
  deck: one(flashcardDecks, {
    fields: [flashcardReviewEvents.deckId],
    references: [flashcardDecks.id],
  }),
  card: one(flashcards, { fields: [flashcardReviewEvents.cardId], references: [flashcards.id] }),
}));

export const quizDecksRelations = relations(quizDecks, ({ one, many }) => ({
  owner: one(users, { fields: [quizDecks.userId], references: [users.id] }),
  sourceNote: one(notes, { fields: [quizDecks.sourceNoteId], references: [notes.id] }),
  questions: many(quizQuestions),
  results: many(quizResults),
}));

export const quizQuestionsRelations = relations(quizQuestions, ({ one }) => ({
  deck: one(quizDecks, { fields: [quizQuestions.deckId], references: [quizDecks.id] }),
}));

export const quizResultsRelations = relations(quizResults, ({ one }) => ({
  deck: one(quizDecks, { fields: [quizResults.deckId], references: [quizDecks.id] }),
  user: one(users, { fields: [quizResults.userId], references: [users.id] }),
}));

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  owner: one(users, { fields: [chatSessions.userId], references: [users.id] }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, { fields: [chatMessages.sessionId], references: [chatSessions.id] }),
}));

export const deadlinesRelations = relations(deadlines, ({ one, many }) => ({
  owner: one(users, { fields: [deadlines.userId], references: [users.id] }),
  reminders: many(deadlineReminders),
}));

export const deadlineRemindersRelations = relations(deadlineReminders, ({ one }) => ({
  deadline: one(deadlines, { fields: [deadlineReminders.deadlineId], references: [deadlines.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));
