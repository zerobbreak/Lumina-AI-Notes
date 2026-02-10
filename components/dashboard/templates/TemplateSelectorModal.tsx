"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { templatePreviews } from "@/constants/templatePreviews";
import { FileText, List, Share2 } from "lucide-react";

export type TemplateType = "outline" | "cornell" | "mindmap";

interface TemplateSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recommendedTemplate?: TemplateType | null;
  onConfirm: (template: TemplateType, disableForCourse: boolean) => void;
}

const templateOptions: Array<{
  id: TemplateType;
  title: string;
  icon: React.ReactNode;
}> = [
  { id: "outline", title: "Outline", icon: <List className="w-5 h-5" /> },
  { id: "cornell", title: "Cornell", icon: <FileText className="w-5 h-5" /> },
  { id: "mindmap", title: "Mind Map", icon: <Share2 className="w-5 h-5" /> },
];

export function TemplateSelectorModal({
  open,
  onOpenChange,
  recommendedTemplate,
  onConfirm,
}: TemplateSelectorModalProps) {
  const [selected, setSelected] = useState<TemplateType>(
    recommendedTemplate || "outline",
  );
  const [disablePrompt, setDisablePrompt] = useState(false);

  const preview = useMemo(() => templatePreviews[selected], [selected]);

  useEffect(() => {
    if (!open) return;
    setSelected(recommendedTemplate || "outline");
    setDisablePrompt(false);
  }, [open, recommendedTemplate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl bg-[#0B0B0B] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Select a note template</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-2">
          <div className="space-y-3">
            {templateOptions.map((option) => {
              const isRecommended = option.id === recommendedTemplate;
              const isSelected = option.id === selected;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelected(option.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    isSelected
                      ? "border-cyan-500/40 bg-cyan-500/10"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected ? "bg-cyan-500/20 text-cyan-300" : "bg-white/10 text-gray-400"
                      }`}
                    >
                      {option.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{option.title}</span>
                        {isRecommended && (
                          <span className="text-[10px] uppercase tracking-widest text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {templatePreviews[option.id].description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}

            <label className="flex items-center gap-2 text-xs text-gray-400 mt-2">
              <input
                type="checkbox"
                checked={disablePrompt}
                onChange={(e) => setDisablePrompt(e.target.checked)}
                className="accent-cyan-500"
              />
              Don&apos;t show again for this course
            </label>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-widest text-gray-500 mb-3">
              Preview
            </div>
            <div className="space-y-2 text-sm text-gray-200">
              {preview.preview.map((line) => (
                <div key={line} className="bg-black/20 border border-white/5 rounded-lg px-3 py-2">
                  {line}
                </div>
              ))}
            </div>
            <div className="mt-4 text-xs text-gray-500">
              Example topics: {preview.exampleTopics.join(", ")}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            className="text-gray-400 hover:text-white"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="bg-cyan-500 hover:bg-cyan-600 text-white"
            onClick={() => onConfirm(selected, disablePrompt)}
          >
            Confirm Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
