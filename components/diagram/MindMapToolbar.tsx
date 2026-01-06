"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Trash2,
  Download,
  Sparkles,
  BookOpen,
  FileText,
  StickyNote,
  Network,
  Maximize2,
  Palette,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NodeType, LayoutType } from "./types";

interface MindMapToolbarProps {
  onAddNode: (type: NodeType) => void;
  onDeleteSelected: () => void;
  onApplyLayout: (layout: LayoutType) => void;
  onExport: (format: "png" | "svg" | "pdf") => void;
  onFitView: () => void;
  onColorChange?: (color: string) => void;
  hasSelection: boolean;
  isReadOnly?: boolean;
}

const NODE_TYPES = [
  { type: "concept" as NodeType, label: "Concept", icon: Sparkles, color: "purple" },
  { type: "topic" as NodeType, label: "Topic", icon: BookOpen, color: "blue" },
  { type: "subtopic" as NodeType, label: "Subtopic", icon: FileText, color: "emerald" },
  { type: "note" as NodeType, label: "Note", icon: StickyNote, color: "amber" },
];

const LAYOUT_TYPES = [
  { type: "hierarchical" as LayoutType, label: "Hierarchical" },
  { type: "radial" as LayoutType, label: "Radial" },
  { type: "force" as LayoutType, label: "Force" },
];

const COLORS = [
  { name: "Purple", value: "bg-gradient-to-br from-purple-500 to-pink-500" },
  { name: "Blue", value: "bg-gradient-to-br from-blue-500 to-cyan-500" },
  { name: "Emerald", value: "bg-gradient-to-br from-emerald-500 to-teal-500" },
  { name: "Amber", value: "bg-gradient-to-br from-amber-400 to-orange-400" },
  { name: "Rose", value: "bg-gradient-to-br from-rose-500 to-pink-500" },
  { name: "Indigo", value: "bg-gradient-to-br from-indigo-500 to-purple-500" },
];

export function MindMapToolbar({
  onAddNode,
  onDeleteSelected,
  onApplyLayout,
  onExport,
  onFitView,
  onColorChange,
  hasSelection,
  isReadOnly = false,
}: MindMapToolbarProps) {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isLayoutOpen, setIsLayoutOpen] = useState(false);
  const [isNodeTypeOpen, setIsNodeTypeOpen] = useState(false);
  const [isColorOpen, setIsColorOpen] = useState(false);

  const handleAddNode = useCallback(
    (type: NodeType) => {
      onAddNode(type);
      setIsNodeTypeOpen(false);
    },
    [onAddNode]
  );

  const handleApplyLayout = useCallback(
    (layout: LayoutType) => {
      onApplyLayout(layout);
      setIsLayoutOpen(false);
    },
    [onApplyLayout]
  );

  const handleExport = useCallback(
    (format: "png" | "svg" | "pdf") => {
      onExport(format);
      setIsExportOpen(false);
    },
    [onExport]
  );

  const handleColorChange = useCallback(
    (color: string) => {
      if (onColorChange) {
        onColorChange(color);
      }
      setIsColorOpen(false);
    },
    [onColorChange]
  );

  return (
    <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-[#18181B]/90 backdrop-blur-md border border-white/10 rounded-lg p-2 shadow-lg">
      {!isReadOnly && (
        <>
          {/* Add Node */}
          <Popover open={isNodeTypeOpen} onOpenChange={setIsNodeTypeOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10 hover:text-cyan-400"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Node
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 bg-[#18181B] border-white/10">
              <div className="space-y-1">
                {NODE_TYPES.map((nodeType) => (
                  <button
                    key={nodeType.type}
                    onClick={() => handleAddNode(nodeType.type)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/10 rounded transition-colors"
                  >
                    <nodeType.icon className="w-4 h-4" />
                    {nodeType.label}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Delete Selected */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeleteSelected}
            disabled={!hasSelection}
            className="text-white hover:bg-red-500/20 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
          </Button>

          <div className="w-px h-6 bg-white/10" />

          {/* Color Picker */}
          {hasSelection && onColorChange && (
            <>
              <Popover open={isColorOpen} onOpenChange={setIsColorOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/10 hover:text-cyan-400"
                  >
                    <Palette className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 bg-[#18181B] border-white/10">
                  <div className="grid grid-cols-3 gap-2">
                    {COLORS.map((color) => (
                      <button
                        key={color.name}
                        onClick={() => handleColorChange(color.value)}
                        className={`w-full h-10 rounded ${color.value} hover:scale-110 transition-transform`}
                        title={color.name}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <div className="w-px h-6 bg-white/10" />
            </>
          )}
        </>
      )}

      {/* Layout */}
      <Popover open={isLayoutOpen} onOpenChange={setIsLayoutOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10 hover:text-cyan-400"
          >
            <Network className="w-4 h-4 mr-1" />
            Layout
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-40 bg-[#18181B] border-white/10">
          <div className="space-y-1">
            {LAYOUT_TYPES.map((layout) => (
              <button
                key={layout.type}
                onClick={() => handleApplyLayout(layout.type)}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 rounded transition-colors"
              >
                {layout.label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Fit View */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onFitView}
        className="text-white hover:bg-white/10 hover:text-cyan-400"
      >
        <Maximize2 className="w-4 h-4" />
      </Button>

      <div className="w-px h-6 bg-white/10" />

      {/* Export */}
      <Popover open={isExportOpen} onOpenChange={setIsExportOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10 hover:text-cyan-400"
          >
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-32 bg-[#18181B] border-white/10">
          <div className="space-y-1">
            <button
              onClick={() => handleExport("png")}
              className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 rounded transition-colors"
            >
              PNG
            </button>
            <button
              onClick={() => handleExport("svg")}
              className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 rounded transition-colors"
            >
              SVG
            </button>
            <button
              onClick={() => handleExport("pdf")}
              className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 rounded transition-colors"
            >
              PDF
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}



