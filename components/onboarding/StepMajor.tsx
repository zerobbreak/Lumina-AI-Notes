"use client";

import { motion } from "framer-motion";
import {
  Laptop,
  BookOpen,
  Scale,
  Landmark,
  Stethoscope,
  Microscope,
  Calculator,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
];

interface StepMajorProps {
  files: any; // Placeholder for now
  setFiles: (files: any) => void;
  value: string;
  onChange: (value: string) => void;
}

export function StepMajor({ value, onChange }: StepMajorProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Academic DNA</h2>
        <p className="text-muted-foreground">
          Select your field of study. This tunes the AI's temperature and
          formatting style.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {MAJORS.map((item) => {
          const Icon = item.icon;
          const isSelected = value === item.id;

          return (
            <motion.div
              key={item.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onChange(item.id)}
              className={cn(
                "w-30 cursor-pointer flex flex-col items-center justify-center p-6 rounded-xl border transition-all duration-200",
                isSelected
                  ? "bg-indigo-600/20 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                  : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
              )}
            >
              <Icon
                className={cn(
                  "w-8 h-8 mb-3",
                  isSelected ? "text-indigo-400" : "text-gray-400"
                )}
              />
              <span
                className={cn(
                  "text-sm font-medium",
                  isSelected ? "text-white" : "text-gray-300"
                )}
              >
                {item.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
