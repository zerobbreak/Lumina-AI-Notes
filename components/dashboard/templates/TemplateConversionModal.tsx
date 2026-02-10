"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, List, FileText, Share2 } from "lucide-react";
import { convertTemplate, NoteContentSnapshot, NoteStyle } from "@/lib/templates/conversion";

interface TemplateConversionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteSnapshot: NoteContentSnapshot;
  onConfirm: (result: ReturnType<typeof convertTemplate>) => void;
}

const options: Array<{ id: NoteStyle; label: string; icon: React.ReactNode }> = [
  { id: "outline", label: "Outline", icon: <List className="w-4 h-4" /> },
  { id: "cornell", label: "Cornell", icon: <FileText className="w-4 h-4" /> },
  { id: "mindmap", label: "Mind Map", icon: <Share2 className="w-4 h-4" /> },
];

export function TemplateConversionModal({
  open,
  onOpenChange,
  noteSnapshot,
  onConfirm,
}: TemplateConversionModalProps) {
  const [selected, setSelected] = useState<NoteStyle>("outline");

  const available = useMemo(
    () => options.filter((o) => o.id !== noteSnapshot.style),
    [noteSnapshot.style],
  );

  useEffect(() => {
    if (!open) return;
    if (available.length > 0) setSelected(available[0].id);
  }, [open, available]);

  const conversion = useMemo(
    () => convertTemplate(noteSnapshot, selected),
    [noteSnapshot, selected],
  );

  const previewText = useMemo(() => {
    const raw = conversion.content || conversion.cornellNotes || "";
    if (typeof window === "undefined") return raw;
    const div = document.createElement("div");
    div.innerHTML = raw;
    return div.textContent || div.innerText || raw;
  }, [conversion]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-[#0B0B0B] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Change Template</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-2">
          <div className="space-y-3">
            {available.map((option) => {
              const isSelected = selected === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelected(option.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    isSelected
                      ? "border-cyan-500/40 bg-cyan-500/10"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/10 text-gray-300">
                      {option.icon}
                    </div>
                    <span className="font-medium">{option.label}</span>
                  </div>
                </button>
              );
            })}

            <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 mt-0.5" />
              Conversion may change formatting. You can undo once after applying.
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-widest text-gray-500 mb-3">
              Preview
            </div>
            <div className="text-sm text-gray-200 whitespace-pre-wrap min-h-[160px]">
              {previewText || "No content to preview"}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" className="text-gray-400" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="bg-cyan-500 hover:bg-cyan-600 text-white" onClick={() => onConfirm(conversion)}>
            Apply Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
