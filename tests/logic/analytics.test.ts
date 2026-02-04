import { describe, expect, it } from "vitest";
import { countByLocalDay, getLocalDayStart } from "@/lib/analytics";

describe("analytics utils", () => {
  it("bucketizes timestamps by local day", () => {
    const tzOffsetMinutes = 0;
    const day = new Date("2026-02-01T12:00:00Z").getTime();
    const sameDay = new Date("2026-02-01T23:00:00Z").getTime();
    const nextDay = new Date("2026-02-02T01:00:00Z").getTime();

    const counts = countByLocalDay(
      [day, sameDay, nextDay],
      tzOffsetMinutes,
    );

    expect(counts.size).toBe(2);
    expect(counts.get(getLocalDayStart(day, tzOffsetMinutes))).toBe(2);
  });
});
