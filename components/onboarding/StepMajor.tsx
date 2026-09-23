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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getStyleRecommendation } from "@/lib/noteStyleRecommendations";

const TEMPLATE_LABEL: Record<string, string> = {
  standard: "Standard",
  outline: "Outline",
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
      style: getStyleRecommendation(value),
    };
  }, [value]);

  return (
    <div className="flex flex-col gap-8 flex-1 min-h-0 overflow-y-auto pr-1 -mr-1 [scrollbar-gutter:stable]">
      <p className="text-sm text-muted-foreground leading-relaxed">
        We use this to pick your default note layout and tune how the assistant frames
        answers for your discipline.
      </p>

      <div className="space-y-8">
        {categories.map((category) => (
          <div key={category}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80 mb-3">
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
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
                        isSelected
                          ? "border-primary/50 bg-primary/[0.12] shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]"
                          : "border-border bg-foreground/[0.03] hover:bg-foreground/[0.06] hover:border-foreground/[0.12]",
                      )}
                    >
                      {isSelected && (
                        <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                      )}
                      <Icon
                        className={cn(
                          "h-7 w-7 shrink-0",
                          isSelected ? "text-primary" : "text-muted-foreground/80",
                        )}
                        strokeWidth={1.5}
                      />
                      <span
                        className={cn(
                          "text-xs font-medium leading-tight",
                          isSelected ? "text-foreground" : "text-foreground/80",
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
            className="rounded-xl border border-primary/25 bg-primary/[0.08] p-4 space-y-3 shrink-0"
          >
            <div className="flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.06] px-2.5 py-1 text-foreground/90 ring-1 ring-foreground/[0.08]">
                Default note layout:{" "}
                <span className="text-foreground">
                  {TEMPLATE_LABEL[profile.style.primary] ?? profile.style.primary}
                </span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{profile.style.reason}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
