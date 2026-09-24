"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { applyAppearance } from "@/lib/appearance/apply";
import {
  APPEARANCE_COOKIE,
  DEFAULT_APPEARANCE,
  MODES,
  isBrandRoute,
  normalizeAppearance,
  resolveMode,
  type AccentSwatch,
  type Appearance,
  type ResolvedMode,
} from "@/lib/appearance/model";
import { useUpdateAppearance } from "@/lib/mutations/users/useUpdateAppearance";
import { useCurrentUser } from "@/lib/queries/users/useCurrentUser";

type AppearanceContextValue = {
  appearance: Appearance;
  /** Light or dark after following the OS for "system". */
  resolvedMode: ResolvedMode;
  /** The accent was shifted to stay legible on the current world. */
  accentAdjusted: boolean;
  /** Applies at once, then saves to the account when signed in. */
  updateAppearance: (patch: Partial<Appearance>) => void;
  /**
   * The colour of the course on screen, or null outside one. Shown as the
   * accent while accentFollowsCourse is on; never saved.
   */
  setCourseAccent: (color: AccentSwatch | null) => void;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

/** next-themes' storage key; read once to carry over an old light/dark choice. */
const LEGACY_MODE_KEY = "theme";
const LEGACY_MIGRATED_KEY = "lumina-legacy-mode-migrated";

const COOKIE_RE = new RegExp(`(?:^|; )${APPEARANCE_COOKIE}=([^;]*)`);
let cookieRaw: string | undefined;
let cookieValue: Appearance | null = null;

/** Parsed cookie, the same object until the cookie's own value changes. */
function readCookie(): Appearance | null {
  const raw = document.cookie.match(COOKIE_RE)?.[1];
  if (raw !== cookieRaw) {
    cookieRaw = raw;
    try {
      cookieValue = raw ? normalizeAppearance(JSON.parse(decodeURIComponent(raw))) : null;
    } catch {
      cookieValue = null;
    }
  }
  return cookieValue ?? DEFAULT_APPEARANCE;
}

function writeCookie(appearance: Appearance) {
  const value = encodeURIComponent(JSON.stringify(appearance));
  document.cookie = `${APPEARANCE_COOKIE}=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

// Only this provider writes the cookie, and it re-renders when it does.
const noSubscribe = () => () => {};

function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/**
 * Owns the look on <html>. The pre-paint script (lib/appearance/script.ts)
 * applies the cookie before React loads; this takes over after hydration,
 * follows the account's saved look, and keeps the cookie in step for the
 * next visit.
 *
 * What's shown is the first of: a change not yet saved, the account's look,
 * the cookie. During server render and hydration it is null, so nothing
 * overwrites what the pre-paint script did.
 */
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: user } = useCurrentUser();
  const { mutate } = useUpdateAppearance();
  const systemDark = useMediaQuery("(prefers-color-scheme: dark)");
  const systemReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const cookieAppearance = useSyncExternalStore(noSubscribe, readCookie, () => null);

  // Changes made here that the server hasn't confirmed yet. The cached user
  // can be older than them, so it mustn't win until every save has settled.
  const [draft, setDraft] = useState<Appearance | null>(null);
  const pendingSaves = useRef(0);

  const appearance = draft ?? user?.appearance ?? cookieAppearance;

  const [courseAccent, setCourseAccent] = useState<AccentSwatch | null>(null);
  // What goes on <html>: the saved look, with the course colour swapped in.
  const shown = useMemo<Appearance | null>(
    () =>
      appearance?.accentFollowsCourse && courseAccent
        ? { ...appearance, accent: { kind: "swatch", id: courseAccent } }
        : appearance,
    [appearance, courseAccent],
  );

  useEffect(() => {
    if (!shown) return;
    applyAppearance(
      document.documentElement,
      shown,
      systemDark,
      systemReducedMotion,
      isBrandRoute(pathname),
    );
  }, [shown, systemDark, systemReducedMotion, pathname]);

  // Worked out on a detached element: the same fitting, no effect needed.
  // appearance is only non-null in the browser.
  const accentAdjusted = useMemo(
    () =>
      shown
        ? applyAppearance(document.createElement("html"), shown, systemDark, false, false)
            .accentAdjusted
        : false,
    [shown, systemDark],
  );

  useEffect(() => {
    if (appearance) writeCookie(appearance);
  }, [appearance]);

  const save = useCallback(
    (patch: Partial<Appearance>) => {
      pendingSaves.current += 1;
      mutate(patch, {
        onError: () => toast.error("Couldn't save your appearance settings"),
        onSettled: () => {
          pendingSaves.current -= 1;
          // Settled saves have updated the cached user (or failed, and the
          // cached user is what stands), so it takes over again.
          if (pendingSaves.current === 0) setDraft(null);
        },
      });
    },
    [mutate],
  );

  const signedIn = Boolean(user);
  const updateAppearance = useCallback(
    (patch: Partial<Appearance>) => {
      setDraft((current) => ({ ...(current ?? appearance ?? DEFAULT_APPEARANCE), ...patch }));
      if (signedIn) save(patch);
    },
    [appearance, save, signedIn],
  );

  // Before appearance moved to the account, light/dark lived in next-themes'
  // localStorage. Carry that choice over once instead of the migrated "dark".
  useEffect(() => {
    if (!user) return;
    try {
      if (localStorage.getItem(LEGACY_MIGRATED_KEY)) return;
      localStorage.setItem(LEGACY_MIGRATED_KEY, "1");
      const legacy = localStorage.getItem(LEGACY_MODE_KEY);
      localStorage.removeItem(LEGACY_MODE_KEY);
      const mode = MODES.find((m) => m === legacy);
      if (mode && user.appearance.world === "observatory" && mode !== user.appearance.mode) {
        save({ mode });
      }
    } catch {
      // Storage blocked: the migrated default stands.
    }
  }, [user, save]);

  const value = useMemo<AppearanceContextValue>(() => {
    const current = appearance ?? DEFAULT_APPEARANCE;
    return {
      appearance: current,
      resolvedMode: resolveMode(current.mode, systemDark),
      accentAdjusted,
      updateAppearance,
      setCourseAccent,
    };
  }, [appearance, systemDark, accentAdjusted, updateAppearance]);

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): AppearanceContextValue {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error("useAppearance must be used inside AppearanceProvider");
  return context;
}
