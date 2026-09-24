"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { QueryClientProvider } from "@tanstack/react-query";
import { Fragment, ReactNode, useEffect, useRef, useState } from "react";
import { registerSessionHandlers } from "@/lib/api/session";
import { createQueryClient } from "@/lib/query-client";

/**
 * One query cache per signed-in user. Clerk signs in and out without a page
 * reload, and cache keys don't include the user, so a shared cache would show
 * the next person on this device the last one's notes. When the user changes
 * (sign-out, sign-in, account switch) the cache is swapped out during render,
 * before anything can read the old one.
 *
 * Nothing user-specific is fetched while Clerk is loading, so the first user
 * keeps the startup cache. A real swap remounts everything below: useQuery and
 * friends stay bound to the client they first rendered with, so a provider
 * mounted before the swap would otherwise keep reading the discarded cache.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const { isLoaded, userId, getToken } = useAuth();
  const { signOut } = useClerk();

  // Lets apiFetch recover from a rejected token: fetch a new one past Clerk's
  // cache, and if even that is refused, sign out to the sign-in page (once).
  useEffect(() => {
    let signingOut = false;
    return registerSessionHandlers({
      freshToken: () => getToken({ skipCache: true }),
      onSessionLost: () => {
        if (signingOut) return;
        signingOut = true;
        void signOut({ redirectUrl: "/sign-in" });
      },
    });
  }, [getToken, signOut]);
  // undefined while Clerk is still loading; null when signed out.
  const owner = isLoaded ? (userId ?? null) : undefined;

  const [cache, setCache] = useState(() => ({ owner, client: createQueryClient(), generation: 0 }));
  let current = cache;
  if (owner !== undefined && owner !== cache.owner) {
    current =
      cache.owner === undefined
        ? { ...cache, owner }
        : { owner, client: createQueryClient(), generation: cache.generation + 1 };
    setCache(current);
  }

  // Drop the previous user's data from memory too, not just from view.
  const previous = useRef(current.client);
  useEffect(() => {
    if (previous.current !== current.client) {
      previous.current.clear();
      previous.current = current.client;
    }
  }, [current.client]);

  return (
    <QueryClientProvider client={current.client}>
      <Fragment key={current.generation}>{children}</Fragment>
    </QueryClientProvider>
  );
}
