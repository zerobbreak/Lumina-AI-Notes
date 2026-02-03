"use client";

import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { useState, useCallback, useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface MathNodeViewComponentProps extends NodeViewProps {
  // Additional props if needed
}

export function MathNodeView({
  node,
  updateAttributes,
  selected,
  editor,
  getPos,
  deleteNode,
}: MathNodeViewComponentProps) {
  const latex = node.attrs.latex || "";
  const isBlockMath = node.type.name === "blockMath";
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(latex);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Update edit value when latex changes (e.g., from undo/redo)
  useEffect(() => {
    if (!isEditing) {
      setEditValue(latex);
    }
  }, [latex, isEditing]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Render LaTeX to HTML
  const renderLatex = useCallback((latexStr: string): string => {
    if (!latexStr || latexStr.trim() === "") {
      return '<span class="text-gray-500 italic">Empty formula</span>';
    }

    try {
      return katex.renderToString(latexStr, {
        throwOnError: false,
        displayMode: false, // Always inline in the span, block styling handled by container
        output: "html",
        trust: false,
        strict: "ignore",
      });
    } catch (err) {
      console.error("KaTeX render error:", err);
      return `<span class="text-red-400 font-mono text-sm">${latexStr}</span>`;
    }
  }, []);

  // Validate LaTeX
  const validateLatex = useCallback((latexStr: string): string | null => {
    if (!latexStr || latexStr.trim() === "") {
      return null;
    }

    try {
      katex.renderToString(latexStr, {
        throwOnError: true,
        displayMode: false,
      });
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : "Invalid LaTeX";
    }
  }, []);

  const handleDoubleClick = useCallback(() => {
    if (editor?.isEditable) {
      setIsEditing(true);
      setEditValue(latex);
      setError(null);
    }
  }, [editor?.isEditable, latex]);

  const handleSave = useCallback(() => {
    const trimmedValue = editValue.trim();

    if (trimmedValue === "") {
      // Delete the node if empty
      deleteNode();
      return;
    }

    const validationError = validateLatex(trimmedValue);
    if (validationError) {
      setError(validationError);
      return;
    }

    updateAttributes({ latex: trimmedValue });
    setIsEditing(false);
    setError(null);
  }, [editValue, updateAttributes, deleteNode, validateLatex]);

  const handleCancel = useCallback(() => {
    setEditValue(latex);
    setIsEditing(false);
    setError(null);
  }, [latex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    },
    [handleSave, handleCancel],
  );

  // Prevent editor key handlers from interfering
  const handleKeyDownCapture = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
  }, []);

  if (isEditing) {
    return (
      <NodeViewWrapper
        as={isBlockMath ? "div" : "span"}
        className={`math-editing ${isBlockMath ? "block-math-editing" : "inline-math-editing"}`}
      >
        <div
          className={`${
            isBlockMath
              ? "my-4 p-4 bg-gray-900/50 border border-purple-500/30 rounded-lg"
              : "inline-flex items-center p-1 bg-gray-900/50 border border-purple-500/30 rounded"
          }`}
        >
          <div
            className={`${isBlockMath ? "space-y-3" : "flex items-center gap-2"}`}
          >
            {/* Preview */}
            <div
              className={`${
                isBlockMath
                  ? "p-3 bg-black/30 rounded-lg text-center min-h-[50px] flex items-center justify-center"
                  : "px-2 py-1 bg-black/30 rounded"
              }`}
            >
              <span
                className="katex-preview text-white"
                dangerouslySetInnerHTML={{ __html: renderLatex(editValue) }}
              />
            </div>

            {/* Input */}
            {isBlockMath ? (
              <textarea
                ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                value={editValue}
                onChange={(e) => {
                  setEditValue(e.target.value);
                  setError(null);
                }}
                onKeyDown={handleKeyDown}
                onKeyDownCapture={handleKeyDownCapture}
                placeholder="Enter LaTeX formula..."
                className="w-full p-2 bg-black/40 border border-white/10 rounded text-gray-200 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-h-[60px]"
                rows={3}
              />
            ) : (
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                type="text"
                value={editValue}
                onChange={(e) => {
                  setEditValue(e.target.value);
                  setError(null);
                }}
                onKeyDown={handleKeyDown}
                onKeyDownCapture={handleKeyDownCapture}
                placeholder="LaTeX..."
                className="flex-1 min-w-[150px] px-2 py-1 bg-black/40 border border-white/10 rounded text-gray-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            )}

            {/* Error message */}
            {error && (
              <div
                className={`text-red-400 text-xs ${isBlockMath ? "" : "hidden"}`}
              >
                ⚠ {error}
              </div>
            )}

            {/* Buttons */}
            <div
              className={`flex items-center gap-2 ${isBlockMath ? "justify-end" : ""}`}
            >
              <button
                onClick={handleCancel}
                className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-2 py-1 text-xs bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 rounded transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      as={isBlockMath ? "div" : "span"}
      className={`math-node ${isBlockMath ? "block-math-node" : "inline-math-node"} ${
        selected ? "selected" : ""
      }`}
      onDoubleClick={handleDoubleClick}
    >
      <span
        className={`katex-content ${isBlockMath ? "block-math-content" : "inline-math-content"} ${
          selected ? "ring-2 ring-purple-500/50" : ""
        }`}
        dangerouslySetInnerHTML={{ __html: renderLatex(latex) }}
        title={`LaTeX: ${latex}\nDouble-click to edit`}
      />
    </NodeViewWrapper>
  );
}
