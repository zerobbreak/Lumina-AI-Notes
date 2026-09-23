import { describe, expect, it } from "vitest";
import { _offenders as offenders } from "../../eslint-rules/no-raw-colors.mjs";

describe("lumina/no-raw-colors", () => {
  it("flags neutral palettes, accent hues and arbitrary hex", () => {
    const found = offenders("text-gray-400 hover:bg-zinc-800 text-indigo-400 bg-[#0A0A0A]");
    expect([...found].sort()).toEqual(
      ["bg-[#0A0A0A]", "bg-zinc-800", "text-gray-400", "text-indigo-400"].sort(),
    );
  });

  it("flags raw white/black ink and surfaces, with opacity", () => {
    expect(offenders("text-white")).toEqual(["text-white"]);
    expect(offenders("bg-white/5 border-white/10")).toEqual(["bg-white/5", "border-white/10"]);
  });

  it("allows scrims and black rings/shadows", () => {
    expect(offenders("fixed inset-0 bg-black/80")).toEqual([]);
    expect(offenders("ring-1 ring-black/5 shadow-black/20")).toEqual([]);
  });

  it("allows white ink on a solid chromatic fill", () => {
    expect(offenders("bg-rose-500 text-white hover:bg-rose-600")).toEqual([]);
    expect(offenders("bg-black/50 text-white")).toEqual([]);
  });

  it("still flags white ink when the fill is only translucent", () => {
    expect(offenders("bg-rose-500/10 text-white")).toEqual(["text-white"]);
  });

  it("accepts theme tokens", () => {
    expect(
      offenders(
        "bg-inset border-border text-foreground/80 from-primary to-primary-alt text-muted-foreground",
      ),
    ).toEqual([]);
  });
});
