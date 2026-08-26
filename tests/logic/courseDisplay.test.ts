import { describe, expect, it } from "vitest";
import {
  getCourseInitials,
  getCourseIcon,
  shouldShowCourseCode,
  shouldUseCourseInitials,
} from "@/lib/courseDisplay";
import { BookOpen, Code } from "lucide-react";

describe("getCourseInitials", () => {
  it("uses two words when available", () => {
    expect(getCourseInitials("Linear Algebra")).toBe("LA");
  });

  it("uses first two letters for a single word", () => {
    expect(getCourseInitials("Thermodynamics")).toBe("TH");
  });
});

describe("shouldUseCourseInitials", () => {
  it("returns true for the onboarding placeholder", () => {
    expect(shouldUseCourseInitials("REQ-001")).toBe(true);
  });

  it("returns false for a real course code", () => {
    expect(shouldUseCourseInitials("PHY 214")).toBe(false);
  });
});

describe("shouldShowCourseCode", () => {
  it("hides the placeholder code", () => {
    expect(shouldShowCourseCode("REQ-001", ["REQ-001", "REQ-001"])).toBe(
      false,
    );
  });

  it("shows a unique real code", () => {
    expect(shouldShowCourseCode("PHY 214", ["PHY 214", "MAT 201"])).toBe(true);
  });

  it("hides duplicate real codes", () => {
    expect(shouldShowCourseCode("PHY 214", ["PHY 214", "PHY 214"])).toBe(
      false,
    );
  });
});

describe("getCourseIcon", () => {
  it("maps computer-science codes to the code icon", () => {
    expect(getCourseIcon("CS 101")).toBe(Code);
  });

  it("falls back to book open", () => {
    expect(getCourseIcon("PHY 214")).toBe(BookOpen);
  });
});
