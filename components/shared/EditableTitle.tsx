"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface EditableTitleProps {
  initialValue: string;
  onSave: (newValue: string) => Promise<void>;
  className?: string; // For h1 styling
  placeholder?: string;
}

export function EditableTitle({
  initialValue,
  onSave,
  className,
  placeholder = "Untitled",
}: EditableTitleProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [value, setValue] = React.useState(initialValue);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Sync value if initialValue changes (and not editing)
  React.useEffect(() => {
    if (!isEditing) {
      setValue(initialValue);
    }
  }, [initialValue, isEditing]);

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (value.trim() !== initialValue) {
      await onSave(value.trim() || placeholder);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setValue(initialValue);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={cn(
          "bg-transparent border-none outline-none ring-0 p-0 m-0 w-full tracking-tight text-white placeholder:text-gray-600",
          className
        )}
        placeholder={placeholder}
      />
    );
  }

  return (
    <h1
      onClick={() => setIsEditing(true)}
      className={cn(
        "cursor-text hover:bg-white/5 rounded px-1 -ml-1 transition-colors truncate",
        className,
        !value && "text-gray-500 italic"
      )}
    >
      {value || placeholder}
    </h1>
  );
}
