"use client";

import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus,
  Minus,
  Settings2,
  Grid3X3,
  X,
  ZoomIn,
  ZoomOut,
  Move,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GraphSettings {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  gridEnabled: boolean;
  axisEnabled: boolean;
}

// Simple math expression parser and evaluator
function evaluateExpression(expr: string, x: number): number | null {
  try {
    // Extract the right side of equation if it's y = ...
    let formula = expr.trim();
    if (formula.toLowerCase().startsWith("y")) {
      const parts = formula.split("=");
      if (parts.length >= 2) {
        formula = parts.slice(1).join("=").trim();
      }
    }

    // Replace math symbols
    formula = formula
      .replace(/\^/g, "**") // Exponentiation
      .replace(/(\d)x/g, "$1*x") // 2x -> 2*x
      .replace(/x(\d)/g, "x*$1") // x2 -> x*2
      .replace(/\)x/g, ")*x") // )x -> )*x
      .replace(/x\(/g, "x*(") // x( -> x*(
      .replace(/\)\(/g, ")*(") // )( -> )*(
      .replace(/sin/gi, "Math.sin")
      .replace(/cos/gi, "Math.cos")
      .replace(/tan/gi, "Math.tan")
      .replace(/sqrt/gi, "Math.sqrt")
      .replace(/abs/gi, "Math.abs")
      .replace(/log/gi, "Math.log10")
      .replace(/ln/gi, "Math.log")
      .replace(/pi/gi, "Math.PI")
      .replace(/e(?![a-z])/gi, "Math.E");

    // Replace x with the value
    formula = formula.replace(/x/gi, `(${x})`);

    // Evaluate
    const result = eval(formula);
    if (typeof result === "number" && isFinite(result)) {
      return result;
    }
    return null;
  } catch {
    return null;
  }
}

// Line colors for multiple expressions
const LINE_COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#22c55e", // green
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#f97316", // orange
];

export function GraphCalculatorNodeView({ node, updateAttributes }: NodeViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [expressions, setExpressions] = useState<string[]>(node.attrs.expressions || ["y = x^2"]);
  const [settings, setSettings] = useState<GraphSettings>(
    node.attrs.settings || {
      xMin: -10,
      xMax: 10,
      yMin: -10,
      yMax: 10,
      gridEnabled: true,
      axisEnabled: true,
    }
  );
  const [showSettings, setShowSettings] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, xMin: 0, yMin: 0 });

  // Update node attributes when expressions or settings change
  useEffect(() => {
    updateAttributes({ expressions, settings });
  }, [expressions, settings, updateAttributes]);

  // Draw the graph
  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const { xMin, xMax, yMin, yMax, gridEnabled, axisEnabled } = settings;

    // Clear canvas
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, width, height);

    // Helper functions to convert between graph and pixel coordinates
    const toPixelX = (x: number) => ((x - xMin) / (xMax - xMin)) * width;
    const toPixelY = (y: number) => height - ((y - yMin) / (yMax - yMin)) * height;

    // Draw grid
    if (gridEnabled) {
      ctx.strokeStyle = "#1f1f1f";
      ctx.lineWidth = 1;

      // Calculate grid step
      const xRange = xMax - xMin;
      const yRange = yMax - yMin;
      const xStep = Math.pow(10, Math.floor(Math.log10(xRange / 5)));
      const yStep = Math.pow(10, Math.floor(Math.log10(yRange / 5)));

      // Vertical grid lines
      for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax; x += xStep) {
        ctx.beginPath();
        ctx.moveTo(toPixelX(x), 0);
        ctx.lineTo(toPixelX(x), height);
        ctx.stroke();
      }

      // Horizontal grid lines
      for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax; y += yStep) {
        ctx.beginPath();
        ctx.moveTo(0, toPixelY(y));
        ctx.lineTo(width, toPixelY(y));
        ctx.stroke();
      }
    }

    // Draw axes
    if (axisEnabled) {
      ctx.strokeStyle = "#404040";
      ctx.lineWidth = 2;

      // X axis
      if (yMin <= 0 && yMax >= 0) {
        ctx.beginPath();
        ctx.moveTo(0, toPixelY(0));
        ctx.lineTo(width, toPixelY(0));
        ctx.stroke();
      }

      // Y axis
      if (xMin <= 0 && xMax >= 0) {
        ctx.beginPath();
        ctx.moveTo(toPixelX(0), 0);
        ctx.lineTo(toPixelX(0), height);
        ctx.stroke();
      }

      // Draw axis labels
      ctx.fillStyle = "#666";
      ctx.font = "10px monospace";
      ctx.fillText(`${xMin}`, 5, toPixelY(0) - 5);
      ctx.fillText(`${xMax}`, width - 25, toPixelY(0) - 5);
      ctx.fillText(`${yMax}`, toPixelX(0) + 5, 15);
      ctx.fillText(`${yMin}`, toPixelX(0) + 5, height - 5);
    }

    // Draw each expression
    expressions.forEach((expr, index) => {
      if (!expr.trim()) return;

      ctx.strokeStyle = LINE_COLORS[index % LINE_COLORS.length];
      ctx.lineWidth = 2;
      ctx.beginPath();

      let isFirstPoint = true;
      const step = (xMax - xMin) / width;

      for (let px = 0; px < width; px++) {
        const x = xMin + px * step;
        const y = evaluateExpression(expr, x);

        if (y !== null && y >= yMin - 100 && y <= yMax + 100) {
          const py = toPixelY(y);
          if (isFirstPoint) {
            ctx.moveTo(px, py);
            isFirstPoint = false;
          } else {
            ctx.lineTo(px, py);
          }
        } else {
          isFirstPoint = true;
        }
      }

      ctx.stroke();
    });
  }, [expressions, settings]);

  // Redraw when anything changes
  useEffect(() => {
    drawGraph();
  }, [drawGraph]);

  // Handle pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      xMin: settings.xMin,
      yMin: settings.yMin,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    const xRange = settings.xMax - settings.xMin;
    const yRange = settings.yMax - settings.yMin;

    const xShift = (-dx / canvas.width) * xRange;
    const yShift = (dy / canvas.height) * yRange;

    setSettings((s) => ({
      ...s,
      xMin: dragStart.xMin + xShift,
      xMax: dragStart.xMin + xShift + xRange,
      yMin: dragStart.yMin + yShift,
      yMax: dragStart.yMin + yShift + yRange,
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle zoom
  const handleZoom = (zoomIn: boolean) => {
    const factor = zoomIn ? 0.8 : 1.25;
    const xCenter = (settings.xMin + settings.xMax) / 2;
    const yCenter = (settings.yMin + settings.yMax) / 2;
    const xRange = (settings.xMax - settings.xMin) * factor;
    const yRange = (settings.yMax - settings.yMin) * factor;

    setSettings((s) => ({
      ...s,
      xMin: xCenter - xRange / 2,
      xMax: xCenter + xRange / 2,
      yMin: yCenter - yRange / 2,
      yMax: yCenter + yRange / 2,
    }));
  };

  const addExpression = () => {
    setExpressions((e) => [...e, ""]);
  };

  const updateExpression = (index: number, value: string) => {
    setExpressions((e) => {
      const newExpressions = [...e];
      newExpressions[index] = value;
      return newExpressions;
    });
  };

  const removeExpression = (index: number) => {
    if (expressions.length > 1) {
      setExpressions((e) => e.filter((_, i) => i !== index));
    }
  };

  const resetView = () => {
    setSettings((s) => ({
      ...s,
      xMin: -10,
      xMax: 10,
      yMin: -10,
      yMax: 10,
    }));
  };

  return (
    <NodeViewWrapper className="my-4">
      <div
        ref={containerRef}
        className="bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/10">
          <span className="text-xs font-medium text-gray-400">Graphing Calculator</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleZoom(true)}
              className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-white transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleZoom(false)}
              className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-white transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={resetView}
              className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-white transition-colors"
              title="Reset View"
            >
              <Move className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                "p-1 hover:bg-white/10 rounded transition-colors",
                showSettings ? "text-blue-400" : "text-gray-500 hover:text-white"
              )}
              title="Settings"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Graph Canvas */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={600}
            height={400}
            className="w-full cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>

        {/* Expression Inputs */}
        <div className="p-3 space-y-2 border-t border-white/10">
          {expressions.map((expr, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: LINE_COLORS[index % LINE_COLORS.length] }}
              />
              <input
                type="text"
                value={expr}
                onChange={(e) => updateExpression(index, e.target.value)}
                placeholder="y = x^2"
                className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50"
              />
              {expressions.length > 1 && (
                <button
                  onClick={() => removeExpression(index)}
                  className="p-1 hover:bg-red-500/20 rounded text-gray-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addExpression}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add expression
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-3 border-t border-white/10 bg-white/5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">X Min</label>
                <input
                  type="number"
                  value={settings.xMin}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, xMin: parseFloat(e.target.value) || -10 }))
                  }
                  className="w-full bg-black/50 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">X Max</label>
                <input
                  type="number"
                  value={settings.xMax}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, xMax: parseFloat(e.target.value) || 10 }))
                  }
                  className="w-full bg-black/50 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Y Min</label>
                <input
                  type="number"
                  value={settings.yMin}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, yMin: parseFloat(e.target.value) || -10 }))
                  }
                  className="w-full bg-black/50 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Y Max</label>
                <input
                  type="number"
                  value={settings.yMax}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, yMax: parseFloat(e.target.value) || 10 }))
                  }
                  className="w-full bg-black/50 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-gray-400">
                <input
                  type="checkbox"
                  checked={settings.gridEnabled}
                  onChange={(e) => setSettings((s) => ({ ...s, gridEnabled: e.target.checked }))}
                  className="rounded"
                />
                Show Grid
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-400">
                <input
                  type="checkbox"
                  checked={settings.axisEnabled}
                  onChange={(e) => setSettings((s) => ({ ...s, axisEnabled: e.target.checked }))}
                  className="rounded"
                />
                Show Axes
              </label>
            </div>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
