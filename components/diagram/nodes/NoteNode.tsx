"use client";

import { memo, useState, useCallback, useRef, useEffect } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { StickyNote } from "lucide-react";

export const NoteNode = memo(({ data, selected }: NodeProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label || "Note");
  const inputRef = useRef<HTMLDivElement>(null);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (data.onLabelChange) {
      data.onLabelChange(label);
    }
  }, [label, data]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        setIsEditing(false);
        if (data.onLabelChange) {
          data.onLabelChange(label);
        }
      }
    },
    [label, data]
  );

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(inputRef.current);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [isEditing]);

  const bgColor = data.color || "bg-gradient-to-br from-amber-400 to-orange-400";

  return (
    <div
      className={`px-3 py-2 rounded-md shadow-sm border ${
        selected ? "border-cyan-400" : "border-white/20"
      } ${bgColor} min-w-[80px] transition-all duration-200 hover:scale-105`}
      onDoubleClick={handleDoubleClick}
    >
      <Handle type="target" position={Position.Top} className="w-1.5 h-1.5 !bg-white" />
      <Handle type="source" position={Position.Bottom} className="w-1.5 h-1.5 !bg-white" />

      <div className="flex items-center gap-1">
        <StickyNote className="w-3 h-3 text-white" />
        {isEditing ? (
          <div
            ref={inputRef}
            contentEditable
            suppressContentEditableWarning
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onInput={(e) => setLabel(e.currentTarget.textContent || "")}
            className="text-white text-xs outline-none bg-white/10 px-1 py-0.5 rounded"
          >
            {label}
          </div>
        ) : (
          <div className="text-white text-xs">{label}</div>
        )}
      </div>
    </div>
  );
});

NoteNode.displayName = "NoteNode";



