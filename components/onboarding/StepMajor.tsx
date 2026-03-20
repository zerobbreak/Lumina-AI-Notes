"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Laptop,
  BookOpen,
  Scale,
  Landmark,
  Stethoscope,
  Microscope,
  Calculator,
  Briefcase,
  Check,
  Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getMajorTheme,
  getStyleRecommendation,
} from "@/lib/noteStyleRecommendations";

const TEMPLATE_LABEL: Record<string, string> = {
  outline: "Outline",
  cornell: "Cornell",
  mindmap: "Mind map",
};

const MAJORS = [
  { id: "cs", label: "Computer Science", icon: Laptop, category: "STEM" },
  {
    id: "engineering",
    label: "Engineering",
    icon: Calculator,
    category: "STEM",
  },
  {
    id: "medicine",
    label: "Medicine / Health",
    icon: Stethoscope,
    category: "Health",
  },
  { id: "biology", label: "Biology", icon: Microscope, category: "STEM" },
  { id: "law", label: "Law", icon: Scale, category: "Humanities" },
  { id: "history", label: "History", icon: Landmark, category: "Humanities" },
  { id: "business", label: "Business", icon: Briefcase, category: "Business" },
  { id: "other", label: "Other", icon: BookOpen, category: "General" },
] as const;

interface StepMajorProps {
  value: string;
  onChange: (value: string) => void;
}

export function StepMajor({ value, onChange }: StepMajorProps) {
  const categories = [...new Set(MAJORS.map((m) => m.category))];

  const profile = useMemo(() => {
    if (!value) return null;
    return {
      theme: getMajorTheme(value),
      style: getStyleRecommendation(value),
    };
  }, [value]);

  return (
    <div className="flex flex-col gap-8 flex-1 min-h-0 overflow-y-auto pr-1 -mr-1 [scrollbar-gutter:stable]">
      <p className="text-sm text-zinc-400 leading-relaxed">
        We use this to tune your workspace theme and how the assistant frames
        answers for your discipline.
      </p>

      <div className="space-y-8">
        {categories.map((category) => (
          <div key={category}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 mb-3">
              {category}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {MAJORS.filter((m) => m.category === category).map(
                (item, index) => {
                  const Icon = item.icon;
                  const isSelected = value === item.id;

                  return (
                    <motion.button
                      type="button"
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onChange(item.id)}
                      className={cn(
                        "relative flex flex-col items-center justify-center gap-2.5 rounded-xl border p-4 text-center transition-colors duration-200",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
                        isSelected
                          ? "border-indigo-500/50 bg-indigo-500/[0.12] shadow-[0_0_0_1px_rgba(99,102,241,0.2)]"
                          : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.12]",
                      )}
                    >
                      {isSelected && (
                        <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-white shadow-md">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                      )}
                      <Icon
                        className={cn(
                          "h-7 w-7 shrink-0",
                          isSelected ? "text-indigo-300" : "text-zinc-500",
                        )}
                        strokeWidth={1.5}
                      />
                      <span
                        className={cn(
                          "text-xs font-medium leading-tight",
                          isSelected ? "text-white" : "text-zinc-300",
                        )}
                      >
                        {item.label}
                      </span>
                    </motion.button>
                  );
                },
              )}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {profile && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl border border-indigo-500/25 bg-indigo-500/[0.08] p-4 space-y-3 shrink-0"
          >
            <div className="flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-zinc-200 ring-1 ring-white/[0.08]">
                <Palette className="h-3.5 w-3.5 text-indigo-300" />
                Accent:{" "}
                <span className="text-white capitalize">{profile.theme.accent}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-zinc-200 ring-1 ring-white/[0.08]">
                Default note layout:{" "}
                <span className="text-white">
                  {TEMPLATE_LABEL[profile.style.primary] ?? profile.style.primary}
                </span>
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">{profile.style.reason}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
