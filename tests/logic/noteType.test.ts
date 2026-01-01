/**
 * Tests for note type separation logic
 *
 * Tests the business logic for Quick Notes vs Smart Folder Pages.
 */
import { describe, it, expect } from "vitest";

describe("Note Type Logic", () => {
  /**
   * Helper function that mirrors the createNote mutation logic
   */
  function determineNoteType(args: {
    noteType?: string;
    courseId?: string;
    moduleId?: string;
  }): "quick" | "page" {
    return (
      (args.noteType as "quick" | "page") ||
      (args.courseId || args.moduleId ? "page" : "quick")
    );
  }

  describe("determineNoteType", () => {
    it('returns "quick" when no context is provided', () => {
      const result = determineNoteType({});
      expect(result).toBe("quick");
    });

    it('returns "page" when courseId is provided', () => {
      const result = determineNoteType({ courseId: "course123" });
      expect(result).toBe("page");
    });

    it('returns "page" when moduleId is provided', () => {
      const result = determineNoteType({ moduleId: "module123" });
      expect(result).toBe("page");
    });

    it('returns "page" when both courseId and moduleId are provided', () => {
      const result = determineNoteType({
        courseId: "course123",
        moduleId: "module123",
      });
      expect(result).toBe("page");
    });

    it("respects explicit noteType over inferred type", () => {
      // Even with courseId, if noteType is explicitly "quick", use that
      const result = determineNoteType({
        noteType: "quick",
        courseId: "course123",
      });
      expect(result).toBe("quick");
    });

    it('respects explicit "page" noteType', () => {
      const result = determineNoteType({ noteType: "page" });
      expect(result).toBe("page");
    });
  });

  describe("Quick Notes filtering logic", () => {
    interface Note {
      _id: string;
      noteType?: string;
      courseId?: string;
      moduleId?: string;
      isArchived?: boolean;
    }

    /**
     * Mirrors the getQuickNotes query filter logic
     */
    function isQuickNote(note: Note): boolean {
      if (note.isArchived) return false;

      // Quick notes: noteType is "quick" OR (noteType is undefined AND no courseId/moduleId)
      return (
        note.noteType === "quick" ||
        (note.noteType === undefined &&
          note.courseId === undefined &&
          note.moduleId === undefined)
      );
    }

    it("identifies explicit quick notes", () => {
      const note: Note = { _id: "1", noteType: "quick" };
      expect(isQuickNote(note)).toBe(true);
    });

    it("identifies legacy orphan notes as quick notes", () => {
      // Notes without noteType and without folder assignment
      const note: Note = { _id: "1" };
      expect(isQuickNote(note)).toBe(true);
    });

    it("rejects page notes", () => {
      const note: Note = { _id: "1", noteType: "page", courseId: "course123" };
      expect(isQuickNote(note)).toBe(false);
    });

    it("rejects legacy notes with courseId (should be pages)", () => {
      const note: Note = { _id: "1", courseId: "course123" };
      expect(isQuickNote(note)).toBe(false);
    });

    it("rejects legacy notes with moduleId (should be pages)", () => {
      const note: Note = { _id: "1", moduleId: "module123" };
      expect(isQuickNote(note)).toBe(false);
    });

    it("rejects archived quick notes", () => {
      const note: Note = { _id: "1", noteType: "quick", isArchived: true };
      expect(isQuickNote(note)).toBe(false);
    });
  });

  describe("Move note to folder logic", () => {
    interface Note {
      noteType: string;
      courseId?: string;
      moduleId?: string;
    }

    /**
     * Simulates the moveNoteToFolder mutation
     */
    function moveNoteToFolder(
      note: Note,
      targetCourseId?: string,
      targetModuleId?: string
    ): Note {
      return {
        ...note,
        noteType: "page",
        courseId: targetCourseId,
        moduleId: targetModuleId,
      };
    }

    /**
     * Simulates the unassignNoteFromFolder mutation
     */
    function unassignNoteFromFolder(note: Note): Note {
      return {
        noteType: "quick",
        courseId: undefined,
        moduleId: undefined,
      };
    }

    it("converts quick note to page when moved to course", () => {
      const quickNote: Note = { noteType: "quick" };
      const result = moveNoteToFolder(quickNote, "course123");

      expect(result.noteType).toBe("page");
      expect(result.courseId).toBe("course123");
      expect(result.moduleId).toBeUndefined();
    });

    it("converts quick note to page when moved to module", () => {
      const quickNote: Note = { noteType: "quick" };
      const result = moveNoteToFolder(quickNote, "course123", "module456");

      expect(result.noteType).toBe("page");
      expect(result.courseId).toBe("course123");
      expect(result.moduleId).toBe("module456");
    });

    it("unassigns page back to quick note", () => {
      const pageNote: Note = {
        noteType: "page",
        courseId: "course123",
        moduleId: "module456",
      };
      const result = unassignNoteFromFolder(pageNote);

      expect(result.noteType).toBe("quick");
      expect(result.courseId).toBeUndefined();
      expect(result.moduleId).toBeUndefined();
    });
  });
});
