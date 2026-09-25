/**
 * The product walkthroughs. Each step points at an element by its
 * `data-tour` attribute; a step whose element isn't on screen (a collapsed
 * sidebar, a phone-width layout, a card that hasn't loaded) still shows, as
 * a centred card, so the explanation is never skipped.
 *
 * tests/logic/tourTargets.test.ts fails when a target has no element in the
 * source, so renaming a component can't silently strand a step.
 */

export type TourPlacement = "top" | "bottom" | "left" | "right";

export type TourStep = {
  id: string;
  title: string;
  body: string;
  /** The `data-tour` value to spotlight. None: a centred card. */
  target?: string;
  /** Preferred side for the card; falls back when there's no room. */
  placement?: TourPlacement;
};

export type TourId = "home" | "note";

export const TOURS: Record<TourId, readonly TourStep[]> = {
  home: [
    {
      id: "welcome",
      title: "Welcome to Lumina",
      body: "A quick look at where everything lives: about a minute. Use the arrow keys to move through it, and Esc to leave. You can take it again any time from the command palette.",
    },
    {
      id: "today",
      title: "Your day at a glance",
      target: "dashboard-overview",
      placement: "bottom",
      body: "Home opens on what to do next. The headline sums up today's plan and the button takes you straight to the first thing on it.",
    },
    {
      id: "runway",
      title: "The next two weeks",
      target: "runway",
      placement: "bottom",
      body: "Every deadline coming up, per module, with anything overdue called out. Brightspace assignments land here on their own once you connect it.",
    },
    {
      id: "plan",
      title: "Today's plan",
      target: "today-plan",
      placement: "right",
      body: "A short, ranked checklist: overdue work first, then cards due for review, then weak quiz topics. Tick things off as you go; it reshuffles as your day changes.",
    },
    {
      id: "pulse",
      title: "How each module is going",
      target: "modules-pulse",
      placement: "top",
      body: "One card per module: how ready you are, how well you're recalling it and what needs you this week. Open a module to see all of its notes and study tools.",
    },
    {
      id: "modules",
      title: "Your modules",
      target: "modules",
      placement: "right",
      body: "The sidebar lists your modules with their notes underneath. Drag a note onto a module to file it there, or use + to add a module.",
    },
    {
      id: "new-note",
      title: "Start a note",
      target: "new-note",
      placement: "right",
      body: "Make a new note from anywhere with this button or Alt+N. Inside a note, it makes a sub-page instead.",
    },
    {
      id: "record",
      title: "Record a lecture",
      target: "record",
      placement: "top",
      body: "Press record in class, or import an audio file. Lumina transcribes it and turns it into structured notes you can study from.",
    },
    {
      id: "capture",
      title: "Bring in your material",
      target: "capture",
      placement: "right",
      body: "Upload lecture slides and PDFs here. Lumina can write notes or flashcards from them, and uses them as context when you ask questions.",
    },
    {
      id: "destinations",
      title: "Everywhere else",
      target: "destinations",
      placement: "right",
      body: "Studio is for chatting with your notes and seeing how they connect. Calendar holds every deadline, Flashcards reviews what's due, and Quizzes tests you on a topic.",
    },
    {
      id: "search",
      title: "Find anything",
      target: "search",
      placement: "right",
      body: "Search notes, files and flashcards with Ctrl+K. Ctrl+Shift+P opens every command, including this tour.",
    },
    {
      id: "settings",
      title: "Make it yours",
      target: "settings",
      placement: "top",
      body: "Connect Brightspace, change how Lumina looks and set your study goals in Settings. That's the tour. Your first note is one click away.",
    },
  ],

  note: [
    {
      id: "write",
      title: "Writing a note",
      target: "note-editor",
      placement: "bottom",
      body: "Just type; it saves as you go. Type / for headings, tables, maths, charts, diagrams and more.",
    },
    {
      id: "ask-ai",
      title: "Ask AI about any passage",
      target: "note-editor",
      placement: "bottom",
      body: "Select some text and press Ctrl+J (or use the bubble that appears) to simplify it, expand it, continue it or ask a question about it.",
    },
    {
      id: "dock",
      title: "Study from this note",
      target: "note-dock",
      placement: "left",
      body: "The dock jumps between headings, makes flashcards and quizzes from this note, shows the lecture it came from and the notes connected to it.",
    },
    {
      id: "actions",
      title: "Everything else",
      target: "note-actions",
      placement: "bottom",
      body: "Rename, archive or delete the note, or generate flashcards and a quiz. The download button beside it exports a PDF.",
    },
  ],
};

/** Where the "seen it" flag for a tour lives in this browser. */
export const tourSeenKey = (tour: TourId) => `lumina.tour.${tour}.seen`;
