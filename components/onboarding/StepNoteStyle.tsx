"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { FileText, List, Network, Sparkles } from "lucide-react";
import { NoteStylePreview } from "./NoteStylePreview";
import { getStyleRecommendation } from "@/lib/noteStyleRecommendations";

const STYLES = [
  {
    id: "cornell",
    label: "Cornell Notes",
    icon: FileText,
    desc: "Structured layout with cues, notes, and summary sections.",
  },
  {
    id: "outline",
    label: "Outline Method",
    icon: List,
    desc: "Hierarchical bullet points, best for organized lectures.",
  },
  {
    id: "mindmap",
    label: "Mind Mapping",
    icon: Network,
    desc: "Visual connections between concepts for non-linear thinkers.",
  },
];

interface StepNoteStyleProps {
  value: string;
  onChange: (value: string) => void;
  major?: string; // NEW: to show personalized recommendations
}

export function StepNoteStyle({ value, onChange, major }: StepNoteStyleProps) {
  const recommendation = major ? getStyleRecommendation(major) : null;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">How do you learn?</h2>
        <p className="text-muted-foreground">
          Lumina will format your auto-generated notes based on this preference.
        </p>

        {/* Recommendation banner */}
        {recommendation && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl"
          >
            <div className="flex items-center gap-2 text-indigo-300 text-sm">
              <Sparkles className="w-4 h-4" />
              <span>{recommendation.reason}</span>
            </div>
          </motion.div>
        )}
      </div>

      <div className="grid gap-4">
        {STYLES.map((item) => {
          const Icon = item.icon;
          const isSelected = value === item.id;
          const isRecommended = recommendation?.primary === item.id;

          return (
            <motion.div
              key={item.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onChange(item.id)}
              className={cn(
                "cursor-pointer flex items-start p-4 rounded-xl border transition-all duration-200 relative",
                isSelected
                  ? "bg-indigo-600/20 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                  : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
              )}
            >
              {/* Recommended Badge */}
              {isRecommended && (
                <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-indigo-500 text-white text-xs rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Recommended
                </div>
              )}

              <div
                className={cn(
                  "p-3 rounded-lg mr-4 shrink-0",
                  isSelected ? "bg-indigo-500/20" : "bg-white/5"
                )}
              >
                <Icon
                  className={cn(
                    "w-6 h-6",
                    isSelected ? "text-indigo-400" : "text-gray-400"
                  )}
                />
              </div>

              <div className="flex-1">
                <h3
                  className={cn(
                    "font-medium mb-1",
                    isSelected ? "text-white" : "text-gray-200"
                  )}
                >
                  {item.label}
                </h3>
                <p className="text-sm text-gray-500 mb-3">{item.desc}</p>

                {/* Visual Preview */}
                <NoteStylePreview
                  style={item.id as "cornell" | "outline" | "mindmap"}
                  isActive={isSelected}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
