"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import {
  Mic,
  FileText,
  Zap,
  Crown,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";

interface UsageBarProps {
  used: number;
  limit: number;
  label: string;
  icon: React.ReactNode;
  unit?: string;
  showUpgrade?: boolean;
}

function UsageBar({ used, limit, label, icon, unit = "", showUpgrade }: UsageBarProps) {
  const isUnlimited = limit === Infinity || limit > 999999;
  const percentage = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  const formatValue = (value: number) => {
    if (value === Infinity || value > 999999) return "Unlimited";
    if (value >= 60) return `${(value / 60).toFixed(1)}h`;
    return `${Math.round(value)}${unit}`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-gray-400">
          {icon}
          <span>{label}</span>
        </div>
        <span
          className={cn(
            "font-mono text-xs",
            isAtLimit
              ? "text-red-400"
              : isNearLimit
                ? "text-yellow-400"
                : "text-gray-400"
          )}
        >
          {formatValue(used)} / {formatValue(limit)}
        </span>
      </div>

      {!isUnlimited && (
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isAtLimit
                ? "bg-red-500"
                : isNearLimit
                  ? "bg-yellow-500"
                  : "bg-indigo-500"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}

      {isUnlimited && (
        <div className="h-2 bg-linear-to-r from-indigo-500/20 via-purple-500/20 to-indigo-500/20 rounded-full flex items-center justify-center">
          <span className="text-[9px] text-indigo-400 font-medium">
            UNLIMITED
          </span>
        </div>
      )}

      {showUpgrade && isNearLimit && !isUnlimited && (
        <p className="text-[10px] text-yellow-400/80">
          {isAtLimit
            ? "Limit reached. Upgrade for unlimited access."
            : "Approaching limit. Consider upgrading."}
        </p>
      )}
    </div>
  );
}

interface UsageIndicatorProps {
  variant?: "compact" | "full";
  className?: string;
}

export function UsageIndicator({
  variant = "compact",
  className,
}: UsageIndicatorProps) {
  const subscription = useQuery(api.subscriptions.getSubscriptionStatus);

  if (!subscription) {
    return (
      <div className={cn("animate-pulse", className)}>
        <div className="h-16 bg-white/5 rounded-lg" />
      </div>
    );
  }

  const { tier, monthlyUsage } = subscription;
  const isFreeTier = tier === "free";

  // Limits based on tier
  const audioLimit = isFreeTier ? 300 : Infinity; // 5 hours for free
  const notesLimit = isFreeTier ? 50 : Infinity;

  if (variant === "compact") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all",
                isFreeTier
                  ? "bg-white/5 hover:bg-white/10"
                  : "bg-linear-to-r from-indigo-500/10 to-purple-500/10 hover:from-indigo-500/20 hover:to-purple-500/20 border border-indigo-500/20",
                className
              )}
            >
              {isFreeTier ? (
                <>
                  <Zap className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs text-gray-400">
                    {Math.round(
                      ((audioLimit - monthlyUsage.audioMinutesUsed) / 60) * 10
                    ) / 10}
                    h left
                  </span>
                </>
              ) : (
                <>
                  <Crown className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-xs text-indigo-300 font-medium">
                    Scholar
                  </span>
                </>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            className="bg-zinc-900 border-white/10 p-4 w-64"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">
                  {isFreeTier ? "Free Plan" : "Scholar Plan"}
                </span>
                {isFreeTier && (
                  <Link href="/#pricing">
                    <Button
                      size="sm"
                      className="h-6 text-xs bg-indigo-600 hover:bg-indigo-500"
                    >
                      Upgrade
                    </Button>
                  </Link>
                )}
              </div>

              <UsageBar
                used={monthlyUsage.audioMinutesUsed}
                limit={audioLimit}
                label="Audio"
                icon={<Mic className="w-3.5 h-3.5" />}
                unit="min"
              />

              <UsageBar
                used={monthlyUsage.notesCreated}
                limit={notesLimit}
                label="Notes"
                icon={<FileText className="w-3.5 h-3.5" />}
              />

              <p className="text-[10px] text-gray-500 pt-1 border-t border-white/5">
                Resets on the 1st of each month
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full variant
  return (
    <div
      className={cn(
        "rounded-xl border p-4 space-y-4",
        isFreeTier
          ? "bg-white/2 border-white/5"
          : "bg-linear-to-br from-indigo-500/5 to-purple-500/5 border-indigo-500/20",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isFreeTier ? (
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
              <Zap className="w-4 h-4 text-gray-400" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <Crown className="w-4 h-4 text-white" />
            </div>
          )}
          <div>
            <h3 className="text-sm font-medium text-white">
              {isFreeTier ? "Free Plan" : "Scholar Plan"}
            </h3>
            <p className="text-[10px] text-gray-500">
              {isFreeTier
                ? "Limited features"
                : "Full access to all features"}
            </p>
          </div>
        </div>

        {isFreeTier && (
          <Link href="/#pricing">
            <Button
              size="sm"
              className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 gap-1"
            >
              <TrendingUp className="w-3 h-3" />
              Upgrade
              <ChevronRight className="w-3 h-3" />
            </Button>
          </Link>
        )}
      </div>

      {/* Usage Bars */}
      <div className="space-y-3">
        <UsageBar
          used={monthlyUsage.audioMinutesUsed}
          limit={audioLimit}
          label="Audio Processing"
          icon={<Mic className="w-3.5 h-3.5" />}
          unit="min"
          showUpgrade={isFreeTier}
        />

        <UsageBar
          used={monthlyUsage.notesCreated}
          limit={notesLimit}
          label="Notes Created"
          icon={<FileText className="w-3.5 h-3.5" />}
          showUpgrade={isFreeTier}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-white/5 text-[10px] text-gray-500">
        <span>
          Usage resets:{" "}
          {new Date(
            new Date().getFullYear(),
            new Date().getMonth() + 1,
            1
          ).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
        {!isFreeTier && (
          <span className="text-indigo-400">
            Subscription active
          </span>
        )}
      </div>
    </div>
  );
}

// Export a standalone upgrade banner component
export function UpgradeBanner({ className }: { className?: string }) {
  const subscription = useQuery(api.subscriptions.getSubscriptionStatus);

  if (!subscription || subscription.tier !== "free") {
    return null;
  }

  const percentUsed =
    (subscription.monthlyUsage.audioMinutesUsed / 300) * 100;

  if (percentUsed < 50) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-indigo-500/20 bg-linear-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 p-4",
        className
      )}
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-linear-to-r from-indigo-500/5 via-purple-500/10 to-indigo-500/5 animate-pulse" />

      <div className="relative flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-linear-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-white">
              {percentUsed >= 80
                ? "Running low on audio time"
                : "Upgrade to Scholar"}
            </h4>
            <p className="text-xs text-gray-400">
              {percentUsed >= 80
                ? "Upgrade now for unlimited audio processing"
                : "Get unlimited audio, flashcards, quizzes & more"}
            </p>
          </div>
        </div>

        <Link href="/#pricing">
          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-500 text-white shrink-0"
          >
            Upgrade Now
          </Button>
        </Link>
      </div>
    </div>
  );
}
