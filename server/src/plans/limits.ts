/**
 * What each plan allows. Everyone is on "beta" for now; Free/Pro get added
 * here when billing arrives, and every limit check already reads from this.
 *
 * Only things that cost real money are limited: Gemini calls, transcription
 * and bucket storage. Notes, courses, decks and features are open to all.
 */
export const PLAN_IDS = ["beta"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export type PlanLimits = {
  aiCallsPerMinute: number;
  aiCallsPerDay: number;
  audioMinutesPerMonth: number;
  /** Everything under the user's bucket prefix: uploads and recordings. */
  storageBytes: number;
};

export const LIMIT_KEYS = ["aiCallsPerMinute", "aiCallsPerDay", "audioMinutesPerMonth", "storageBytes"] as const;

export const DEFAULT_PLAN: PlanId = "beta";

export const PLANS: Record<PlanId, PlanLimits> = {
  beta: {
    aiCallsPerMinute: 20,
    aiCallsPerDay: 100,
    audioMinutesPerMonth: 300,
    storageBytes: 1024 * 1024 * 1024,
  },
};

/** Per-user raises (or cuts) on top of their plan, e.g. for a power tester. */
export type LimitOverrides = Partial<PlanLimits>;

export type EffectiveLimits = PlanLimits & { plan: PlanId };

function isPlanId(value: string | null | undefined): value is PlanId {
  return (PLAN_IDS as readonly string[]).includes(value ?? "");
}

/** The user's plan limits with their overrides applied. An unknown plan falls back to the default. */
export function limitsFor(user: { plan?: string | null; limitOverrides?: LimitOverrides | null }): EffectiveLimits {
  const plan = isPlanId(user.plan) ? user.plan : DEFAULT_PLAN;
  const limits: EffectiveLimits = { plan, ...PLANS[plan] };
  for (const key of LIMIT_KEYS) {
    const value = user.limitOverrides?.[key];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) limits[key] = value;
  }
  return limits;
}
