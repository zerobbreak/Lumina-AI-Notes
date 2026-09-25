"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { BookOpen, LayoutGrid, Palette, RotateCcw, Sparkles, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAppearance } from "@/components/providers/AppearanceProvider";
import {
  ACCENT_INFO,
  CALENDAR_LAYOUT_INFO,
  DENSITY_INFO,
  MODE_INFO,
  MOTION_INFO,
  RADIUS_INFO,
  READING_FONT_INFO,
  READING_WIDTH_INFO,
  UI_FONT_INFO,
  WORLD_INFO,
  worldInfo,
} from "@/lib/appearance/catalog";
import { DEFAULT_APPEARANCE, type Accent, type ResolvedMode } from "@/lib/appearance/model";
import { Segmented, WorldPreview } from "@/components/shared/AppearanceControls";
import { cn } from "@/lib/utils";

type CustomAccent = Extract<Accent, { kind: "custom" }>;

/** A cool blue to start from the first time someone opens the custom picker. */
const STARTER_CUSTOM: CustomAccent = {
  kind: "custom",
  l: 0.6,
  c: 0.16,
  h: 250,
};

/**
 * Holds a value while it is being dragged and saves it once it settles, so a
 * slider doesn't send a request per pixel. Shows the saved value otherwise.
 */
function useSettledValue<T>(saved: T, save: (value: T) => void, delay = 350) {
  const [draft, setDraft] = useState<T | null>(null);
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    if (draft === null) return;
    const id = setTimeout(() => {
      saveRef.current(draft);
      setDraft(null);
    }, delay);
    return () => clearTimeout(id);
  }, [draft, delay]);
  return [draft ?? saved, setDraft] as const;
}

export function AppearanceTab() {
  const { appearance, updateAppearance } = useAppearance();
  return (
    <>
      <WorldSection />
      <AccentSection />
      <TypographySection />
      <Section icon={LayoutGrid} title="Layout & motion">
        <Field label="Density">
          <Segmented
            options={DENSITY_INFO}
            value={appearance.density}
            onChange={(density) => updateAppearance({ density })}
          />
        </Field>
        <Field label="Corners">
          <Segmented
            options={RADIUS_INFO}
            value={appearance.radius}
            onChange={(radius) => updateAppearance({ radius })}
          />
        </Field>
        <Field label="Motion" hint="Reduced turns off animations and transitions.">
          <Segmented
            options={MOTION_INFO}
            value={appearance.motion}
            onChange={(motion) => updateAppearance({ motion })}
          />
        </Field>
        <Field label="Calendar" hint="The week planner lays each day out by the hour, with study blocks fitted around your classes.">
          <Segmented
            options={CALENDAR_LAYOUT_INFO}
            value={appearance.calendarLayout}
            onChange={(calendarLayout) => updateAppearance({ calendarLayout })}
          />
        </Field>
      </Section>
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => updateAppearance(DEFAULT_APPEARANCE)}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset to defaults
        </Button>
      </div>
    </>
  );
}

function WorldSection() {
  const { appearance, resolvedMode, updateAppearance } = useAppearance();
  const world = worldInfo(appearance.world);

  return (
    <Section icon={Palette} title="World">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {WORLD_INFO.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => updateAppearance({ world: w.id })}
            aria-pressed={appearance.world === w.id}
            className={cn(
              "group text-left rounded-xl border p-2 transition-all",
              appearance.world === w.id
                ? "border-primary ring-2 ring-primary/30"
                : "border-border hover:border-foreground/30",
            )}
          >
            <WorldPreview world={w} mode={resolvedMode} />
            <div className="px-1 pt-2 pb-1">
              <p className="text-sm font-semibold text-foreground">{w.names[resolvedMode]}</p>
              <p className="text-xs text-muted-foreground leading-snug">{w.blurb}</p>
            </div>
          </button>
        ))}
      </div>

      <Field
        label="Mode"
        hint={
          appearance.mode === "system"
            ? `Follows your device: ${world.names.light} by day, ${world.names.dark} at night.`
            : undefined
        }
      >
        <Segmented
          options={MODE_INFO.map((m) => ({
            ...m,
            label: m.id === "system" ? "System" : world.names[m.id as ResolvedMode],
          }))}
          value={appearance.mode}
          onChange={(mode) => updateAppearance({ mode })}
        />
      </Field>
    </Section>
  );
}

function AccentSection() {
  const { appearance, accentAdjusted, resolvedMode, updateAppearance } = useAppearance();
  const accent = appearance.accent;
  // Remembers the last custom colour while a swatch is picked, for this visit.
  const [lastCustom, setLastCustom] = useState<CustomAccent>(
    accent.kind === "custom" ? accent : STARTER_CUSTOM,
  );
  const saveCustom = (next: CustomAccent) => {
    setLastCustom(next);
    updateAppearance({ accent: next });
  };
  const [custom, setCustom] = useSettledValue<CustomAccent>(
    accent.kind === "custom" ? accent : lastCustom,
    saveCustom,
  );
  const worldName = worldInfo(appearance.world).names[resolvedMode];

  return (
    <Section icon={Sparkles} title="Accent">
      <div className="flex flex-wrap gap-2">
        {ACCENT_INFO.map((a) => {
          const active = accent.kind === "swatch" && accent.id === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => updateAppearance({ accent: { kind: "swatch", id: a.id } })}
              aria-pressed={active}
              className={cn(
                "h-9 pl-2.5 pr-3.5 rounded-full border flex items-center gap-2 text-sm transition-all",
                active
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-foreground/5",
              )}
            >
              <span className="h-4 w-4 rounded-full" style={{ background: `hsl(${a.swatch})` }} />
              {a.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => updateAppearance({ accent: lastCustom })}
          aria-pressed={accent.kind === "custom"}
          className={cn(
            "h-9 pl-2.5 pr-3.5 rounded-full border flex items-center gap-2 text-sm transition-all",
            accent.kind === "custom"
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border text-muted-foreground hover:text-foreground hover:bg-foreground/5",
          )}
        >
          <span
            className="h-4 w-4 rounded-full"
            style={{
              background:
                "conic-gradient(oklch(0.65 0.2 0), oklch(0.65 0.2 120), oklch(0.65 0.2 240), oklch(0.65 0.2 360))",
            }}
          />
          Custom
        </button>
      </div>

      {accent.kind === "custom" && (
        <div className="grid gap-4 rounded-xl border border-border/60 bg-inset p-4 sm:grid-cols-[1fr_auto]">
          <div className="space-y-3">
            <Range
              label="Hue"
              min={0}
              max={360}
              step={1}
              value={custom.h}
              display={`${Math.round(custom.h)}°`}
              onChange={(h) => setCustom({ ...custom, h })}
              track={`linear-gradient(to right, ${[0, 60, 120, 180, 240, 300, 360]
                .map((h) => `oklch(${custom.l} ${custom.c} ${h})`)
                .join(", ")})`}
            />
            <Range
              label="Colourfulness"
              min={0}
              max={0.32}
              step={0.005}
              value={custom.c}
              display={custom.c.toFixed(2)}
              onChange={(c) => setCustom({ ...custom, c })}
              track={`linear-gradient(to right, oklch(${custom.l} 0 ${custom.h}), oklch(${custom.l} 0.32 ${custom.h}))`}
            />
            <Range
              label="Lightness"
              min={0.3}
              max={0.9}
              step={0.01}
              value={custom.l}
              display={`${Math.round(custom.l * 100)}%`}
              onChange={(l) => setCustom({ ...custom, l })}
              track={`linear-gradient(to right, oklch(0.3 ${custom.c} ${custom.h}), oklch(0.9 ${custom.c} ${custom.h}))`}
            />
          </div>
          <div
            className="h-20 w-20 self-center rounded-2xl border border-border shadow-inner"
            style={{ background: `oklch(${custom.l} ${custom.c} ${custom.h})` }}
            aria-hidden
          />
        </div>
      )}

      {accentAdjusted && (
        <p className="text-xs text-muted-foreground">
          This accent is shown slightly {resolvedMode === "dark" ? "lighter" : "darker"} on{" "}
          {worldName} so buttons and links stay readable against the background.
        </p>
      )}

      <label className="flex items-start gap-3 rounded-xl border border-border/60 p-3 cursor-pointer">
        <Checkbox
          checked={appearance.accentFollowsCourse}
          onCheckedChange={(checked) => updateAppearance({ accentFollowsCourse: checked === true })}
          className="mt-0.5"
        />
        <span>
          <span className="block text-sm font-medium text-foreground">Accent follows module</span>
          <span className="block text-xs text-muted-foreground">
            Inside a course or one of its notes, use that course&rsquo;s colour. Change a course&rsquo;s colour
            from its menu in the sidebar.
          </span>
        </span>
      </label>
    </Section>
  );
}

function TypographySection() {
  const { appearance, updateAppearance } = useAppearance();
  const [size, setSize] = useSettledValue(appearance.readingSize, (readingSize) =>
    updateAppearance({ readingSize }),
  );
  const [lineHeight, setLineHeight] = useSettledValue(
    appearance.readingLineHeight,
    (readingLineHeight) => updateAppearance({ readingLineHeight }),
  );
  const readingFamily =
    READING_FONT_INFO.find((f) => f.id === appearance.readingFont)?.family ?? "serif";

  return (
    <>
      <Section icon={Type} title="Interface font">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {UI_FONT_INFO.map((f) => (
            <FontCard
              key={f.id}
              active={appearance.uiFont === f.id}
              family={f.family}
              label={f.label}
              onClick={() => updateAppearance({ uiFont: f.id })}
            />
          ))}
        </div>
      </Section>

      <Section icon={BookOpen} title="Reading">
        <p className="-mt-3 text-sm text-muted-foreground">
          How your notes and AI study answers read. PDF exports keep their own layout.
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {READING_FONT_INFO.map((f) => (
            <FontCard
              key={f.id}
              active={appearance.readingFont === f.id}
              family={f.family}
              label={f.label}
              note={f.note}
              onClick={() => updateAppearance({ readingFont: f.id })}
            />
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Range
            label="Text size"
            min={14}
            max={24}
            step={1}
            value={size}
            display={`${size}px`}
            onChange={setSize}
          />
          <Range
            label="Line spacing"
            min={1.3}
            max={2.1}
            step={0.05}
            value={lineHeight}
            display={lineHeight.toFixed(2)}
            onChange={setLineHeight}
          />
        </div>

        <Field label="Page width">
          <Segmented
            options={READING_WIDTH_INFO}
            value={appearance.readingWidth}
            onChange={(readingWidth) => updateAppearance({ readingWidth })}
          />
        </Field>

        <div
          className="rounded-xl border border-border/60 bg-card p-5 text-foreground/85"
          style={{
            fontFamily: `${readingFamily}, serif`,
            fontSize: `${size}px`,
            lineHeight,
          }}
        >
          <p className="font-semibold text-foreground" style={{ fontSize: "1.25em" }}>
            The Krebs cycle
          </p>
          <p className="mt-1">
            Each turn oxidises acetyl-CoA to two molecules of CO₂, capturing the released energy as
            NADH, FADH₂ and GTP, which feed the electron transport chain.
          </p>
        </div>
      </Section>
    </>
  );
}

function FontCard({
  active,
  family,
  label,
  note,
  onClick,
}: {
  active: boolean;
  family: string;
  label: string;
  note?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-xl border p-3 text-left transition-all",
        active
          ? "border-primary ring-2 ring-primary/30 bg-primary/5"
          : "border-border hover:border-foreground/30",
      )}
    >
      <span className="block text-2xl text-foreground" style={{ fontFamily: family }}>
        Aa
      </span>
      <span className="mt-1 block text-sm font-medium text-foreground">{label}</span>
      {note && <span className="block text-xs text-muted-foreground">{note}</span>}
    </button>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Palette;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="p-6 rounded-2xl bg-background border border-border/60 space-y-6">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-muted-foreground text-xs uppercase font-bold tracking-wider">
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Range({
  label,
  min,
  max,
  step,
  value,
  display,
  onChange,
  track,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  display: string;
  onChange: (value: number) => void;
  /** Background for the track, e.g. a hue gradient. */
  track?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex justify-between text-xs">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="tabular-nums text-foreground">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn("w-full accent-primary", track && "h-2 appearance-none rounded-full")}
        style={track ? { background: track } : undefined}
      />
    </label>
  );
}
