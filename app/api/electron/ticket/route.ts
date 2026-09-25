import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Mints a short-lived Clerk sign-in ticket for the signed-in user in this
 * (system) browser session, so the desktop app can redeem it via
 * `signIn.create({ strategy: "ticket", ticket })` and establish its own
 * Clerk session — cookies from this browser tab don't carry over to the
 * Electron window's isolated session, so a raw JWT can't be reused directly.
 */
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const client = await clerkClient();
  const signInToken = await client.signInTokens.createSignInToken({
    userId,
    expiresInSeconds: 60,
  });

  return NextResponse.json({ ticket: signInToken.token });
}
