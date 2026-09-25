import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TOURS } from "@/lib/tour/tours";

const ROOTS = ["components", "app"];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx$/.test(name) ? [path] : [];
  });
}

/** Every data-tour value written in the app, literal or passed as tourId. */
function anchorsInSource(): Set<string> {
  const found = new Set<string>();
  for (const file of ROOTS.flatMap(sourceFiles)) {
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(/(?:data-tour|tourId)="([^"]+)"/g)) found.add(m[1]);
  }
  return found;
}

describe("product tours", () => {
  const anchors = anchorsInSource();

  // The first tour pointed at anchors a redesign had removed, and nothing noticed.
  it.each(Object.entries(TOURS))("every %s step points at an element that exists", (_tour, steps) => {
    const missing = steps.filter((s) => s.target && !anchors.has(s.target)).map((s) => s.target);
    expect(missing).toEqual([]);
  });

  it.each(Object.entries(TOURS))("%s steps have unique ids and some words", (_tour, steps) => {
    expect(new Set(steps.map((s) => s.id)).size).toBe(steps.length);
    for (const s of steps) {
      expect(s.title.trim()).not.toBe("");
      expect(s.body.trim().length).toBeGreaterThan(20);
    }
  });
});
