"use client";

import { memo, useState, useCallback, useRef, useEffect } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Sparkles } from "lucide-react";

interface ConceptNodeData {
  label?: string;
  color?: string;
  description?: string;
  onLabelChange?: (label: string) => void;
}

export const ConceptNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as ConceptNodeData;
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(nodeData.label || "Concept");
  const inputRef = useRef<HTMLDivElement>(null);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (nodeData.onLabelChange) {
      nodeData.onLabelChange(label);
    }
  }, [label, nodeData]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        setIsEditing(false);
        if (nodeData.onLabelChange) {
          nodeData.onLabelChange(label);
        }
      }
    },
    [label, nodeData]
  );

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Select all text
      const range = document.createRange();
      range.selectNodeContents(inputRef.current);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [isEditing]);

  const bgColor =
    nodeData.color || "bg-gradient-to-br from-purple-500 to-pink-500";

  return (
    <div
      className={`px-6 py-4 rounded-2xl shadow-2xl border-4 ${
        selected ? "border-cyan-400" : "border-white/20"
      } ${bgColor} min-w-[180px] transition-all duration-200 hover:scale-105`}
      onDoubleClick={handleDoubleClick}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-white!"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-white!"
      />
      <Handle
        type="source"
        position={Position.Left}
        className="w-3 h-3 bg-white!"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-white!"
      />

      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-white" />
        {isEditing ? (
          <div
            ref={inputRef}
            contentEditable
            suppressContentEditableWarning
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onInput={(e) => setLabel(e.currentTarget.textContent || "")}
            className="text-white font-bold text-lg outline-none bg-white/10 px-2 py-1 rounded"
          >
            {label}
          </div>
        ) : (
          <div className="text-white font-bold text-lg">{label}</div>
        )}
      </div>
      {nodeData.description && (
        <div className="text-white/80 text-xs mt-1">{nodeData.description}</div>
      )}
    </div>
  );
});

ConceptNode.displayName = "ConceptNode";

