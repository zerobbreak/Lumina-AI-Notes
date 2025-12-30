"use client";

import { Search, Brain, FileText, MessageSquare, Box } from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Semantic Search",
    description: "Search by concept, not just keywords.",
  },
  {
    icon: Brain,
    title: "Semantic Creation",
    description: "Generative notes grounded in lecture data.",
  },
  {
    icon: FileText,
    title: "Flashcards",
    description: "Auto-generated from key concepts.",
  },
  {
    icon: MessageSquare,
    title: "Contextual Q&A",
    description: "Chat with your specific course material.",
  },
  {
    icon: Box,
    title: "Knowledge Graph",
    description: "Connect ideas across different lectures.",
  },
];

export function FeatureGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mt-20 pt-10 border-t border-white/5">
      {features.map((feature, idx) => (
        <div key={idx} className="flex flex-col items-center text-center group">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-gray-400 transition-all duration-300 group-hover:border-primary/20 group-hover:bg-primary/10 group-hover:text-primary group-hover:scale-110">
            <feature.icon className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-medium text-white mb-1">
            {feature.title}
          </h3>
          <p className="text-xs text-gray-400 max-w-[120px]">
            {feature.description}
          </p>
        </div>
      ))}
    </div>
  );
}
