// Subscription tier types
export type SubscriptionTier = "free" | "scholar" | "institution";
export type SubscriptionStatus = "active" | "cancelled" | "past_due" | "expired";

// Feature flags for each tier
export type TierFeature =
  | "basic-summary"
  | "export-markdown"
  | "export-pdf"
  | "advanced-formula"
  | "flashcards"
  | "quizzes"
  | "priority-support"
  | "semantic-search-full"
  | "unlimited-audio"
  | "unlimited-notes";

// Tier configuration
export interface TierConfig {
  name: string;
  audioMinutesPerMonth: number;
  notesLimit: number;
  searchScope: "single-note" | "course" | "all";
  features: TierFeature[];
  price: number; // in smallest currency unit (e.g., kobo for NGN)
  priceDisplay: string;
  paystackPlanCode?: string; // Set this after creating plans in Paystack dashboard
}

export const TIER_LIMITS: Record<SubscriptionTier, TierConfig> = {
  free: {
    name: "Starter",
    audioMinutesPerMonth: 300, // 5 hours
    notesLimit: 50,
    searchScope: "single-note",
    features: ["basic-summary", "export-markdown"],
    price: 0,
    priceDisplay: "$0",
  },
  scholar: {
    name: "Scholar",
    audioMinutesPerMonth: Infinity,
    notesLimit: Infinity,
    searchScope: "all",
    features: [
      "basic-summary",
      "export-markdown",
      "export-pdf",
      "advanced-formula",
      "flashcards",
      "quizzes",
      "priority-support",
      "semantic-search-full",
      "unlimited-audio",
      "unlimited-notes",
    ],
    price: 1200000, // $12 equivalent in kobo (adjust based on your currency)
    priceDisplay: "$12/month",
    paystackPlanCode: process.env.NEXT_PUBLIC_PAYSTACK_SCHOLAR_PLAN_CODE,
  },
  institution: {
    name: "Institution",
    audioMinutesPerMonth: Infinity,
    notesLimit: Infinity,
    searchScope: "all",
    features: [
      "basic-summary",
      "export-markdown",
      "export-pdf",
      "advanced-formula",
      "flashcards",
      "quizzes",
      "priority-support",
      "semantic-search-full",
      "unlimited-audio",
      "unlimited-notes",
    ],
    price: 0, // Custom pricing
    priceDisplay: "Custom",
  },
};

// Helper functions
export function getTierConfig(tier: SubscriptionTier | undefined): TierConfig {
  return TIER_LIMITS[tier || "free"];
}

export function hasFeature(
  tier: SubscriptionTier | undefined,
  feature: TierFeature
): boolean {
  const config = getTierConfig(tier);
  return config.features.includes(feature);
}

export function canUseAudio(
  tier: SubscriptionTier | undefined,
  currentMinutesUsed: number,
  additionalMinutes: number = 0
): { allowed: boolean; remaining: number; limit: number } {
  const config = getTierConfig(tier);
  const limit = config.audioMinutesPerMonth;
  const remaining = Math.max(0, limit - currentMinutesUsed);
  const allowed =
    limit === Infinity || currentMinutesUsed + additionalMinutes <= limit;

  return { allowed, remaining, limit };
}

export function canCreateNote(
  tier: SubscriptionTier | undefined,
  currentNotesCount: number
): { allowed: boolean; remaining: number; limit: number } {
  const config = getTierConfig(tier);
  const limit = config.notesLimit;
  const remaining = Math.max(0, limit - currentNotesCount);
  const allowed = limit === Infinity || currentNotesCount < limit;

  return { allowed, remaining, limit };
}

export function getSearchScope(
  tier: SubscriptionTier | undefined
): "single-note" | "course" | "all" {
  return getTierConfig(tier).searchScope;
}

// Check if subscription is active and valid
export function isSubscriptionActive(
  status: SubscriptionStatus | undefined,
  endDate: number | undefined
): boolean {
  if (!status || status !== "active") return false;
  if (endDate && endDate < Date.now()) return false;
  return true;
}

// Get effective tier based on subscription status
export function getEffectiveTier(
  tier: SubscriptionTier | undefined,
  status: SubscriptionStatus | undefined,
  endDate: number | undefined
): SubscriptionTier {
  if (!tier || tier === "free") return "free";
  if (!isSubscriptionActive(status, endDate)) return "free";
  return tier;
}
