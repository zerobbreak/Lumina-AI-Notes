import { describe, expect, it } from "vitest";

import {
  activeDashboardNavId,
  DASHBOARD_NAV,
} from "@/constants/dashboardNav";

describe("dashboard navigation", () => {
  it("uses an explicit Home URL so navigation bypasses the resume gate", () => {
    const home = DASHBOARD_NAV.find((item) => item.id === "home");

    expect(home).toMatchObject({
      view: "home",
      href: "/dashboard?view=home",
    });
    expect(
      activeDashboardNavId({
        view: "home",
        noteId: null,
        contextId: null,
      }),
    ).toBe("home");
  });

  it("still treats bare dashboard as Home while the resume gate resolves", () => {
    expect(
      activeDashboardNavId({
        view: null,
        noteId: null,
        contextId: null,
      }),
    ).toBe("home");
  });
});
