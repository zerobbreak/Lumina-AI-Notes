"use client";

import { useState } from "react";
import { Gauge, Loader2, Target } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSetDailyGoals } from "@/lib/mutations/users/useSetDailyGoals";
import { useGamification } from "@/lib/queries/users/useGamification";
import { dispatchAppCommand } from "@/lib/appCommands";
import { useUsage } from "@/lib/queries/users/useUsage";
import { cn, formatBytes } from "@/lib/utils";

// Same bounds the API enforces.
const MINUTES = { min: 1, max: 600 };
const CARDS = { min: 1, max: 500 };

const inRange = (n: number, { min, max }: { min: number; max: number }) =>
  Number.isInteger(n) && n >= min && n <= max;

export function StudyGoalsTab() {
  return (
    <>
      <DailyGoalsCard />
      <UsageCard />
    </>
  );
}

function DailyGoalsCard() {
  const { data: stats } = useGamification();
  const setGoals = useSetDailyGoals();
  // Null until edited, so the inputs show the saved goals until the user types.
  const [minutesDraft, setMinutes] = useState<string | null>(null);
  const [cardsDraft, setCards] = useState<string | null>(null);
  const minutes = minutesDraft ?? String(stats?.dailyGoalMinutes ?? "");
  const cards = cardsDraft ?? String(stats?.dailyGoalCards ?? "");

  const minutesValid = inRange(Number(minutes), MINUTES);
  const cardsValid = inRange(Number(cards), CARDS);
  const dirty =
    !!stats &&
    (Number(minutes) !== stats.dailyGoalMinutes || Number(cards) !== stats.dailyGoalCards);

  const save = () => {
    setGoals.mutate(
      { minutes: Number(minutes), cards: Number(cards) },
      {
        onSuccess: () => {
          setMinutes(null);
          setCards(null);
          toast.success("Daily goals saved");
        },
        onError: () => toast.error("Couldn't save your daily goals"),
      },
    );
  };

  return (
    <div className="p-6 rounded-2xl bg-background border border-border/60 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Target className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Daily goals</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          What counts as a full day of studying for your streak and progress rings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label
            htmlFor="goal-minutes"
            className="text-muted-foreground text-xs uppercase font-bold tracking-wider"
          >
            Study minutes per day
          </Label>
          <Input
            id="goal-minutes"
            type="number"
            inputMode="numeric"
            min={MINUTES.min}
            max={MINUTES.max}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            aria-invalid={!minutesValid}
            className="bg-inset border-border text-foreground h-11"
          />
          {!minutesValid && (
            <p className="text-xs text-destructive">
              Between {MINUTES.min} and {MINUTES.max} minutes.
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="goal-cards"
            className="text-muted-foreground text-xs uppercase font-bold tracking-wider"
          >
            Flashcards per day
          </Label>
          <Input
            id="goal-cards"
            type="number"
            inputMode="numeric"
            min={CARDS.min}
            max={CARDS.max}
            value={cards}
            onChange={(e) => setCards(e.target.value)}
            aria-invalid={!cardsValid}
            className="bg-inset border-border text-foreground h-11"
          />
          {!cardsValid && (
            <p className="text-xs text-destructive">
              Between {CARDS.min} and {CARDS.max} cards.
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={save}
          disabled={!dirty || !minutesValid || !cardsValid || setGoals.isPending}
        >
          {setGoals.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save goals
        </Button>
      </div>
    </div>
  );
}

function UsageCard() {
  const { data: usage, isLoading, isError } = useUsage();

  return (
    <div className="p-6 rounded-2xl bg-background border border-border/60 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Gauge className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Usage</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Lumina is free during the beta. These limits keep it that way.
          {" "}
          Need more?{" "}
          <button
            type="button"
            onClick={() => dispatchAppCommand("feedback:more")}
            className="text-primary underline-offset-2 hover:underline"
          >
            Tell us
          </button>
          .
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          Loading usage…
        </div>
      ) : isError || !usage ? (
        <p className="text-sm text-muted-foreground">Couldn&apos;t load your usage right now.</p>
      ) : (
        <div className="space-y-5">
          <UsageMeter
            label="Audio transcription"
            used={usage.audio.usedMinutes}
            limit={usage.audio.limitMinutes}
            unit="min"
            note={`Resets ${new Date(usage.audio.resetsAt).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
            })}`}
          />
          <UsageMeter
            label="AI requests today"
            used={usage.ai.usedToday}
            limit={usage.ai.dailyLimit}
            note="Resets at midnight UTC"
          />
          <UsageMeter
            label="Storage"
            used={usage.storage.usedBytes}
            limit={usage.storage.limitBytes}
            format={formatBytes}
            note="Uploads and recordings. Deleting them frees space."
          />
        </div>
      )}
    </div>
  );
}

function UsageMeter({
  label,
  used,
  limit,
  unit,
  format,
  note,
}: {
  label: string;
  used: number;
  limit: number;
  unit?: string;
  /** Replaces the rounded number and unit, e.g. for byte sizes. */
  format?: (value: number) => string;
  note: string;
}) {
  const ratio = limit > 0 ? Math.min(1, used / limit) : 0;
  const suffix = unit ? ` ${unit}` : "";
  const show = format ?? ((value: number) => `${Math.round(value)}${suffix}`);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {show(used)} / {show(limit)}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={Math.round(used)}
        className="h-2 rounded-full bg-muted overflow-hidden"
      >
        <div
          className={cn(
            "h-full rounded-full transition-all",
            ratio >= 0.9 ? "bg-destructive" : "bg-primary",
          )}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{note}</p>
    </div>
  );
}
