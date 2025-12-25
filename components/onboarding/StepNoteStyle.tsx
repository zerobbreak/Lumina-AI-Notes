"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { FileText, List, Network } from "lucide-react";

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
}

export function StepNoteStyle({ value, onChange }: StepNoteStyleProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">How do you learn?</h2>
        <p className="text-muted-foreground">
          Lumina will format your auto-generated notes based on this preference.
        </p>
      </div>

      <div className="grid gap-4">
        {STYLES.map((item) => {
          const Icon = item.icon;
          const isSelected = value === item.id;

          return (
            <motion.div
              key={item.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onChange(item.id)}
              className={cn(
                "cursor-pointer flex items-center p-4 rounded-xl border transition-all duration-200",
                isSelected
                  ? "bg-indigo-600/20 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                  : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
              )}
            >
              <div
                className={cn(
                  "p-3 rounded-lg mr-4",
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
              <div>
                <h3
                  className={cn(
                    "font-medium",
                    isSelected ? "text-white" : "text-gray-200"
                  )}
                >
                  {item.label}
                </h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
