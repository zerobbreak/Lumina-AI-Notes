import { describe, expect, it } from "vitest";
import { verifiedEmailOf } from "../src/auth/clerk-profiles.js";

type Email = Parameters<typeof verifiedEmailOf>[0]["emailAddresses"][number];

const address = (emailAddress: string, status: string | null) =>
  ({ emailAddress, verification: status ? { status } : null }) as unknown as Email;

describe("verifiedEmailOf", () => {
  it("uses the primary address when it's verified", () => {
    const primary = address("me@uni.test", "verified");
    expect(verifiedEmailOf({ primaryEmailAddress: primary, emailAddresses: [primary] })).toBe("me@uni.test");
  });

  it("skips an unverified primary for a verified secondary", () => {
    const primary = address("victim@uni.test", "unverified");
    const other = address("me@personal.test", "verified");
    expect(verifiedEmailOf({ primaryEmailAddress: primary, emailAddresses: [primary, other] })).toBe(
      "me@personal.test",
    );
  });

  it("never falls back to an unverified address", () => {
    const claimed = address("victim@uni.test", "unverified");
    expect(verifiedEmailOf({ primaryEmailAddress: null, emailAddresses: [claimed] })).toBe("");
    expect(verifiedEmailOf({ primaryEmailAddress: null, emailAddresses: [address("x@y.test", null)] })).toBe("");
  });
});
