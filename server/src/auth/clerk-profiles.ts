import { createClerkClient } from "@clerk/backend";

export type ClerkProfile = { email: string; name: string | null; image: string | null };

/** Looks up the profile fields we copy into `users`. */
export type ClerkProfiles = { get(clerkUserId: string): Promise<ClerkProfile> };

export function createClerkProfiles(secretKey: string): ClerkProfiles {
  const clerk = createClerkClient({ secretKey });
  return {
    async get(clerkUserId) {
      const user = await clerk.users.getUser(clerkUserId);
      const email =
        user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? "";
      const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;
      return { email, name: name || null, image: user.imageUrl || null };
    },
  };
}
