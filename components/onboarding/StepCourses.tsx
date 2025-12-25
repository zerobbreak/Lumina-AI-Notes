"use client";

import { motion } from "framer-motion";
import { UploadCloud, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Assuming we might need to install react-dropzone, but for now I'll implement a simple standard input if I can't check dependencies.
// Actually checking package.json earlier didn't show it. I should use standard input or use the user's "Upload Syllabus" instruction.
// I'll stick to a native file input styled to look like drag and drop for simplicity without adding deps yet, or use the browser API.

interface StepCoursesProps {
  value: File[];
  onChange: (files: File[]) => void;
}

export function StepCourses({ value, onChange }: StepCoursesProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      onChange([...value, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...value];
    newFiles.splice(index, 1);
    onChange(newFiles);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Course Context</h2>
        <p className="text-muted-foreground">
          Upload your syllabus (PDF) for each course. Gemini will scan these to
          learn exam dates and vocabulary.
        </p>
      </div>

      <div className="border-2 border-dashed border-white/10 rounded-2xl p-10 flex flex-col items-center justify-center text-center space-y-4 hover:border-indigo-500/50 hover:bg-white/5 transition-colors relative">
        <input
          type="file"
          multiple
          accept=".pdf"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileChange}
        />
        <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mb-2">
          <UploadCloud className="w-8 h-8 text-indigo-400" />
        </div>
        <div>
          <p className="text-lg font-medium text-white">
            Click or Drag & Drop Syllabus
          </p>
          <p className="text-sm text-muted-foreground">PDF support only</p>
        </div>
      </div>

      {value.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-400">Selected Files</h3>
          {value.map((file, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={idx}
              className="flex items-center justify-between bg-white/5 border border-white/10 p-3 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-indigo-400" />
                <span className="text-sm text-gray-200 truncate max-w-[200px]">
                  {file.name}
                </span>
                <span className="text-xs text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
              <button
                onClick={() => removeFile(idx)}
                className="text-gray-500 hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
