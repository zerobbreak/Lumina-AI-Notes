"use client";

import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus,
  Trash2,
  BarChart3,
  LineChart,
  PieChart,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ChartType = "bar" | "line" | "pie" | "doughnut";

interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

const DEFAULT_COLORS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#f97316", // orange
  "#84cc16", // lime
  "#14b8a6", // teal
];

export function ChartNodeView({ node, updateAttributes }: NodeViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [chartType, setChartType] = useState<ChartType>(node.attrs.chartType || "bar");
  const [data, setData] = useState<ChartDataPoint[]>(
    node.attrs.data || [
      { label: "Item 1", value: 30, color: "#3b82f6" },
      { label: "Item 2", value: 50, color: "#22c55e" },
      { label: "Item 3", value: 20, color: "#f59e0b" },
    ]
  );
  const [title, setTitle] = useState<string>(node.attrs.title || "");
  const [showLegend, setShowLegend] = useState<boolean>(node.attrs.showLegend !== false);
  const [showEditor, setShowEditor] = useState(false);

  // Update node attributes
  useEffect(() => {
    updateAttributes({ chartType, data, title, showLegend });
  }, [chartType, data, title, showLegend, updateAttributes]);

  // Draw chart
  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;

    // Clear canvas
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, width, height);

    if (data.length === 0) return;

    const total = data.reduce((sum, d) => sum + d.value, 0);
    const maxValue = Math.max(...data.map((d) => d.value));

    switch (chartType) {
      case "bar":
        drawBarChart(ctx, width, height, padding, maxValue);
        break;
      case "line":
        drawLineChart(ctx, width, height, padding, maxValue);
        break;
      case "pie":
      case "doughnut":
        drawPieChart(ctx, width, height, total, chartType === "doughnut");
        break;
    }
  }, [chartType, data]);

  const drawBarChart = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    padding: number,
    maxValue: number
  ) => {
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const barWidth = chartWidth / data.length - 10;

    // Draw axes
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw bars
    data.forEach((point, index) => {
      const barHeight = (point.value / maxValue) * chartHeight;
      const x = padding + index * (chartWidth / data.length) + 5;
      const y = height - padding - barHeight;

      ctx.fillStyle = point.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
      ctx.fillRect(x, y, barWidth, barHeight);

      // Label
      ctx.fillStyle = "#888";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(point.label, x + barWidth / 2, height - padding + 15);

      // Value
      ctx.fillStyle = "#fff";
      ctx.fillText(String(point.value), x + barWidth / 2, y - 5);
    });
  };

  const drawLineChart = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    padding: number,
    maxValue: number
  ) => {
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Draw axes
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw line
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.forEach((point, index) => {
      const x = padding + (index / (data.length - 1 || 1)) * chartWidth;
      const y = height - padding - (point.value / maxValue) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw points
    data.forEach((point, index) => {
      const x = padding + (index / (data.length - 1 || 1)) * chartWidth;
      const y = height - padding - (point.value / maxValue) * chartHeight;

      ctx.fillStyle = point.color || "#3b82f6";
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();

      // Label
      ctx.fillStyle = "#888";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(point.label, x, height - padding + 15);

      // Value
      ctx.fillStyle = "#fff";
      ctx.fillText(String(point.value), x, y - 10);
    });
  };

  const drawPieChart = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    total: number,
    isDoughnut: boolean
  ) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 40;
    const innerRadius = isDoughnut ? radius * 0.6 : 0;

    let startAngle = -Math.PI / 2;

    data.forEach((point, index) => {
      const sliceAngle = (point.value / total) * Math.PI * 2;
      const endAngle = startAngle + sliceAngle;

      ctx.fillStyle = point.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fill();

      if (isDoughnut) {
        ctx.fillStyle = "#0a0a0a";
        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw label
      const midAngle = startAngle + sliceAngle / 2;
      const labelRadius = radius * 0.7;
      const labelX = centerX + Math.cos(midAngle) * labelRadius;
      const labelY = centerY + Math.sin(midAngle) * labelRadius;

      ctx.fillStyle = "#fff";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const percentage = Math.round((point.value / total) * 100);
      ctx.fillText(`${percentage}%`, labelX, labelY);

      startAngle = endAngle;
    });
  };

  useEffect(() => {
    drawChart();
  }, [drawChart]);

  const addDataPoint = () => {
    const newIndex = data.length;
    setData([
      ...data,
      {
        label: `Item ${newIndex + 1}`,
        value: 25,
        color: DEFAULT_COLORS[newIndex % DEFAULT_COLORS.length],
      },
    ]);
  };

  const updateDataPoint = (index: number, field: keyof ChartDataPoint, value: string | number) => {
    setData((prev) => {
      const newData = [...prev];
      newData[index] = { ...newData[index], [field]: value };
      return newData;
    });
  };

  const removeDataPoint = (index: number) => {
    if (data.length > 1) {
      setData((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const chartTypeOptions: { type: ChartType; icon: React.ReactNode; label: string }[] = [
    { type: "bar", icon: <BarChart3 className="w-4 h-4" />, label: "Bar" },
    { type: "line", icon: <LineChart className="w-4 h-4" />, label: "Line" },
    { type: "pie", icon: <PieChart className="w-4 h-4" />, label: "Pie" },
    { type: "doughnut", icon: <PieChart className="w-4 h-4" />, label: "Doughnut" },
  ];

  return (
    <NodeViewWrapper className="my-4">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-400">Chart</span>
            <div className="flex items-center gap-1">
              {chartTypeOptions.map((option) => (
                <button
                  key={option.type}
                  onClick={() => setChartType(option.type)}
                  className={cn(
                    "p-1.5 rounded transition-colors",
                    chartType === option.type
                      ? "bg-blue-500/20 text-blue-400"
                      : "text-gray-500 hover:text-white hover:bg-white/10"
                  )}
                  title={option.label}
                >
                  {option.icon}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => setShowEditor(!showEditor)}
            className={cn(
              "p-1 hover:bg-white/10 rounded transition-colors",
              showEditor ? "text-blue-400" : "text-gray-500 hover:text-white"
            )}
            title="Edit Data"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>

        {/* Title */}
        {title && (
          <div className="px-3 py-2 text-center">
            <span className="text-sm font-medium text-gray-300">{title}</span>
          </div>
        )}

        {/* Chart Canvas */}
        <div className="p-4">
          <canvas ref={canvasRef} width={500} height={300} className="w-full" />
        </div>

        {/* Legend */}
        {showLegend && (chartType === "pie" || chartType === "doughnut") && (
          <div className="px-4 pb-4">
            <div className="flex flex-wrap gap-3 justify-center">
              {data.map((point, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{
                      backgroundColor:
                        point.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
                    }}
                  />
                  <span className="text-xs text-gray-400">{point.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data Editor */}
        {showEditor && (
          <div className="p-3 border-t border-white/10 bg-white/5 space-y-3">
            {/* Title input */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Chart Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter chart title..."
                className="w-full bg-black/50 border border-white/10 rounded px-2 py-1 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50"
              />
            </div>

            {/* Data points */}
            <div className="space-y-2">
              <label className="text-xs text-gray-500 block">Data Points</label>
              {data.map((point, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={point.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                    onChange={(e) => updateDataPoint(index, "color", e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={point.label}
                    onChange={(e) => updateDataPoint(index, "label", e.target.value)}
                    placeholder="Label"
                    className="flex-1 bg-black/50 border border-white/10 rounded px-2 py-1 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50"
                  />
                  <input
                    type="number"
                    value={point.value}
                    onChange={(e) => updateDataPoint(index, "value", parseFloat(e.target.value) || 0)}
                    placeholder="Value"
                    className="w-20 bg-black/50 border border-white/10 rounded px-2 py-1 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50"
                  />
                  {data.length > 1 && (
                    <button
                      onClick={() => removeDataPoint(index)}
                      className="p-1 hover:bg-red-500/20 rounded text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addDataPoint}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add data point
              </button>
            </div>

            {/* Options */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-gray-400">
                <input
                  type="checkbox"
                  checked={showLegend}
                  onChange={(e) => setShowLegend(e.target.checked)}
                  className="rounded"
                />
                Show Legend
              </label>
            </div>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
