"use client";

import { memo, useState, useCallback, useRef, useEffect } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { BookOpen } from "lucide-react";

export const TopicNode = memo(({ data, selected }: NodeProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label || "Topic");
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

  const bgColor = data.color || "bg-gradient-to-br from-blue-500 to-cyan-500";

  return (
    <div
      className={`px-5 py-3 rounded-xl shadow-lg border-2 ${
        selected ? "border-cyan-400" : "border-white/20"
      } ${bgColor} min-w-[140px] transition-all duration-200 hover:scale-105`}
      onDoubleClick={handleDoubleClick}
    >
      <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 !bg-white" />
      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 !bg-white" />
      <Handle type="source" position={Position.Left} className="w-2.5 h-2.5 !bg-white" />
      <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 !bg-white" />

      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-white" />
        {isEditing ? (
          <div
            ref={inputRef}
            contentEditable
            suppressContentEditableWarning
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onInput={(e) => setLabel(e.currentTarget.textContent || "")}
            className="text-white font-semibold text-base outline-none bg-white/10 px-2 py-1 rounded"
          >
            {label}
          </div>
        ) : (
          <div className="text-white font-semibold text-base">{label}</div>
        )}
      </div>
    </div>
  );
});

TopicNode.displayName = "TopicNode";



