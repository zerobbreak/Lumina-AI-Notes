import { createClerkClient, type User as ClerkUser } from "@clerk/backend";
import { isClerkAPIResponseError } from "@clerk/backend/errors";

export type ClerkProfile = { email: string; name: string | null; image: string | null };

/** Looks up the profile fields we copy into `users`, and removes the Clerk user on account deletion. */
export type ClerkProfiles = {
  get(clerkUserId: string): Promise<ClerkProfile>;
  /** Succeeds if the user is already gone, so a retried deletion can finish. */
  delete(clerkUserId: string): Promise<void>;
};

type EmailFields = Pick<ClerkUser, "primaryEmailAddress" | "emailAddresses">;

/**
 * The address we can trust to be the user's: the primary one if verified,
 * else any verified one, else "". Note invites are matched by email, so an
 * unverified address would let someone sign up as a stranger's email and
 * inherit the invites sent to it.
 */
export function verifiedEmailOf(user: EmailFields): string {
  const verified = (e: EmailFields["emailAddresses"][number] | null) => e?.verification?.status === "verified";
  const email = verified(user.primaryEmailAddress) ? user.primaryEmailAddress : user.emailAddresses.find(verified);
  return email?.emailAddress ?? "";
}

export function createClerkProfiles(secretKey: string): ClerkProfiles {
  const clerk = createClerkClient({ secretKey });
  return {
    async get(clerkUserId) {
      const user = await clerk.users.getUser(clerkUserId);
      const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;
      return { email: verifiedEmailOf(user), name: name || null, image: user.imageUrl || null };
    },
    async delete(clerkUserId) {
      try {
        await clerk.users.deleteUser(clerkUserId);
      } catch (err) {
        if (isClerkAPIResponseError(err) && err.status === 404) return;
        throw err;
      }
    },
  };
}
