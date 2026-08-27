import { describe, expect, it } from "vitest";

import {
  DASHBOARD_NAV,
  activeDashboardNavId,
} from "@/constants/dashboardNav";

describe("dashboard Home navigation", () => {
  it("uses an explicit destination instead of the resume-gated bare route", () => {
    const home = DASHBOARD_NAV.find((item) => item.id === "home");

    expect(home).toMatchObject({
      view: "home",
      href: "/dashboard?view=home",
    });
  });

  it("marks the explicit Home destination active", () => {
    expect(
      activeDashboardNavId({
        view: "home",
        noteId: null,
        contextId: null,
      }),
    ).toBe("home");
  });
});
