"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Code2 } from "lucide-react";
import { CODE_LANGUAGES, type CodeLanguage } from "@/types/streaming";

interface CodeExtractorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
  onExtract: (language: CodeLanguage, label?: string) => void;
}

/** Human-readable labels for code languages */
const LANGUAGE_LABELS: Record<CodeLanguage, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
  c: "C",
  cpp: "C++",
  csharp: "C#",
  go: "Go",
  rust: "Rust",
  sql: "SQL",
  html: "HTML",
  css: "CSS",
  bash: "Bash / Shell",
  ruby: "Ruby",
  php: "PHP",
  swift: "Swift",
  kotlin: "Kotlin",
  r: "R",
  matlab: "MATLAB",
  pseudocode: "Pseudocode",
  other: "Other",
};

export function CodeExtractorDialog({
  isOpen,
  onClose,
  selectedText,
  onExtract,
}: CodeExtractorDialogProps) {
  const [language, setLanguage] = useState<CodeLanguage>("javascript");
  const [label, setLabel] = useState("");

  const handleExtract = () => {
    onExtract(language, label.trim() || undefined);
    setLabel("");
    onClose();
  };

  const handleClose = () => {
    setLabel("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="bg-[#111] border-white/10 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Code2 className="w-5 h-5 text-emerald-400" />
            Extract Code Block
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selected text preview */}
          <div>
            <Label className="text-gray-400 text-xs mb-1.5 block">
              Selected Text
            </Label>
            <ScrollArea className="max-h-[150px] rounded-md border border-white/10 bg-black/40">
              <pre className="p-3 text-xs text-emerald-300 font-mono whitespace-pre-wrap">
                {selectedText}
              </pre>
            </ScrollArea>
          </div>

          {/* Language selector */}
          <div>
            <Label
              htmlFor="code-language"
              className="text-gray-400 text-xs mb-1.5 block"
            >
              Language
            </Label>
            <select
              id="code-language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as CodeLanguage)}
              className="w-full h-9 rounded-md border border-white/10 bg-black/40 text-white text-sm px-3 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            >
              {CODE_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {LANGUAGE_LABELS[lang]}
                </option>
              ))}
            </select>
          </div>

          {/* Optional label */}
          <div>
            <Label
              htmlFor="code-label"
              className="text-gray-400 text-xs mb-1.5 block"
            >
              Label <span className="text-gray-600">(optional)</span>
            </Label>
            <Input
              id="code-label"
              placeholder="e.g. Binary search implementation"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="bg-black/40 border-white/10 text-white placeholder:text-gray-600 text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExtract}
            disabled={!selectedText.trim()}
            className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
          >
            <Code2 className="w-4 h-4 mr-1.5" />
            Extract
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
