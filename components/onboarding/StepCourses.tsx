"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepCoursesProps {
  value: File[];
  onChange: (files: File[]) => void;
}

export function StepCourses({ value, onChange }: StepCoursesProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (list: FileList | File[]) => {
      const arr = Array.from(list).filter(
        (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
      );
      if (arr.length) onChange([...value, ...arr]);
    },
    [onChange, value],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    const next = [...value];
    next.splice(index, 1);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-6 flex-1 min-h-0">
      <p className="text-sm text-zinc-400 leading-relaxed">
        Optional but powerful: each PDF becomes a course shell with your file
        attached. Skip for now if you prefer to add materials later.
      </p>

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative rounded-2xl border-2 border-dashed transition-all duration-200 min-h-[200px] flex flex-col items-center justify-center text-center px-6 py-12 cursor-pointer",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
          isDragging
            ? "border-indigo-400/60 bg-indigo-500/10 scale-[1.01]"
            : "border-white/[0.1] bg-white/[0.02] hover:border-indigo-500/35 hover:bg-white/[0.04]",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,application/pdf"
          className="sr-only"
          onChange={handleFileChange}
        />
        <div className="flex flex-col items-center gap-3">
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-2xl transition-colors",
              isDragging ? "bg-indigo-500/25" : "bg-indigo-500/15 ring-1 ring-indigo-400/20",
            )}
          >
            <UploadCloud
              className={cn(
                "h-7 w-7",
                isDragging ? "text-indigo-200" : "text-indigo-400",
              )}
              strokeWidth={1.5}
            />
          </div>
          <div>
            <p className="text-base font-medium text-white">
              Drop PDFs here or tap to browse
            </p>
            <p className="text-sm text-zinc-500 mt-1">Syllabus · readings · schedules</p>
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {value.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Added ({value.length})
            </p>
            <ul className="space-y-2 max-h-[200px] overflow-y-auto pr-1 [scrollbar-gutter:stable]">
              {value.map((file, idx) => (
                <motion.li
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={`${file.name}-${idx}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2.5"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-400/90 ring-1 ring-red-500/20">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-200 truncate font-medium">
                        {file.name}
                      </p>
                      <p className="text-xs text-zinc-500 tabular-nums">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="shrink-0 rounded-lg p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
