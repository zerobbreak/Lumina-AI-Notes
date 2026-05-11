"use client";

import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { useTheme } from "next-themes";
import {
  Plus,
  Trash2,
  BarChart3,
  LineChart,
  PieChart,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

type ChartType = "bar" | "line" | "pie" | "doughnut";

interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

/** Fallback series colors (indigo preset) when CSS vars are missing */
const CHART_HSL_FALLBACKS = [
  "239 84% 67%",
  "263 70% 58%",
  "280 75% 55%",
  "220 70% 50%",
  "200 80% 55%",
] as const;

type ChartThemeTokens = {
  card: string;
  mutedForeground: string;
  foreground: string;
  primary: string;
  charts: string[];
};

function readChartThemeTokens(el: Element): ChartThemeTokens {
  const s = getComputedStyle(el);
  const hsl = (key: string, fallback: string) => {
    const v = s.getPropertyValue(key).trim();
    return v ? `hsl(${v})` : `hsl(${fallback})`;
  };
  const charts = [1, 2, 3, 4, 5].map((i, idx) =>
    hsl(`--chart-${i}`, CHART_HSL_FALLBACKS[idx] ?? CHART_HSL_FALLBACKS[0]),
  );
  return {
    card: hsl("--card", "0 0% 10%"),
    mutedForeground: hsl("--muted-foreground", "240 5% 64.9%"),
    foreground: hsl("--foreground", "0 0% 91%"),
    primary: hsl("--primary", "239 84% 67%"),
    charts,
  };
}

function cssColorToHex(cssColor: string): string {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return "#6366f1";
  ctx.fillStyle = cssColor;
  const out = ctx.fillStyle;
  if (typeof out === "string" && out.startsWith("#")) {
    return out.length === 9 ? out.slice(0, 7) : out;
  }
  return "#6366f1";
}

export function ChartNodeView({ node, updateAttributes }: NodeViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  const [chartType, setChartType] = useState<ChartType>(node.attrs.chartType || "bar");
  const [data, setData] = useState<ChartDataPoint[]>(
    node.attrs.data || [
      { label: "Item 1", value: 30 },
      { label: "Item 2", value: 50 },
      { label: "Item 3", value: 20 },
    ],
  );
  const [title, setTitle] = useState<string>(node.attrs.title || "");
  const [showLegend, setShowLegend] = useState<boolean>(node.attrs.showLegend !== false);
  const [showEditor, setShowEditor] = useState(false);
  /** Theme-derived hex for each row (no custom `color`); updated outside render so refs are safe */
  const [derivedHexByIndex, setDerivedHexByIndex] = useState<string[]>([]);

  useEffect(() => {
    updateAttributes({ chartType, data, title, showLegend });
  }, [chartType, data, title, showLegend, updateAttributes]);

  const seriesColor = useCallback(
    (point: ChartDataPoint, index: number, tokens: ChartThemeTokens) =>
      point.color ?? tokens.charts[index % tokens.charts.length]!,
    [],
  );

  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const tokens = readChartThemeTokens(container);
    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;

    ctx.fillStyle = tokens.card;
    ctx.fillRect(0, 0, width, height);

    if (data.length === 0) return;

    const total = data.reduce((sum, d) => sum + d.value, 0);
    const maxValue = Math.max(...data.map((d) => d.value));

    const drawBarChart = () => {
      const chartWidth = width - padding * 2;
      const chartHeight = height - padding * 2;
      const barWidth = chartWidth / data.length - 10;

      ctx.strokeStyle = tokens.mutedForeground;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding, padding);
      ctx.lineTo(padding, height - padding);
      ctx.lineTo(width - padding, height - padding);
      ctx.stroke();
      ctx.globalAlpha = 1;

      data.forEach((point, index) => {
        const barHeight = (point.value / maxValue) * chartHeight;
        const x = padding + index * (chartWidth / data.length) + 5;
        const y = height - padding - barHeight;

        ctx.fillStyle = seriesColor(point, index, tokens);
        ctx.fillRect(x, y, barWidth, barHeight);

        ctx.fillStyle = tokens.mutedForeground;
        ctx.font = "10px var(--font-outfit, ui-sans-serif, system-ui)";
        ctx.textAlign = "center";
        ctx.fillText(point.label, x + barWidth / 2, height - padding + 15);

        ctx.fillStyle = tokens.foreground;
        ctx.fillText(String(point.value), x + barWidth / 2, y - 5);
      });
    };

    const drawLineChart = () => {
      const chartWidth = width - padding * 2;
      const chartHeight = height - padding * 2;

      ctx.strokeStyle = tokens.mutedForeground;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding, padding);
      ctx.lineTo(padding, height - padding);
      ctx.lineTo(width - padding, height - padding);
      ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.strokeStyle = tokens.primary;
      ctx.lineWidth = 2;
      ctx.beginPath();

      data.forEach((point, index) => {
        const x = padding + (index / (data.length - 1 || 1)) * chartWidth;
        const y = height - padding - (point.value / maxValue) * chartHeight;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      data.forEach((point, index) => {
        const x = padding + (index / (data.length - 1 || 1)) * chartWidth;
        const y = height - padding - (point.value / maxValue) * chartHeight;

        ctx.fillStyle = seriesColor(point, index, tokens);
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = tokens.mutedForeground;
        ctx.font = "10px var(--font-outfit, ui-sans-serif, system-ui)";
        ctx.textAlign = "center";
        ctx.fillText(point.label, x, height - padding + 15);

        ctx.fillStyle = tokens.foreground;
        ctx.fillText(String(point.value), x, y - 10);
      });
    };

    const drawPieChart = (isDoughnut: boolean) => {
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) / 2 - 40;
      const innerRadius = isDoughnut ? radius * 0.6 : 0;

      let startAngle = -Math.PI / 2;

      data.forEach((point, index) => {
        const sliceAngle = (point.value / total) * Math.PI * 2;
        const endAngle = startAngle + sliceAngle;

        ctx.fillStyle = seriesColor(point, index, tokens);
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fill();

        if (isDoughnut) {
          ctx.fillStyle = tokens.card;
          ctx.beginPath();
          ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        const midAngle = startAngle + sliceAngle / 2;
        const labelRadius = radius * 0.7;
        const labelX = centerX + Math.cos(midAngle) * labelRadius;
        const labelY = centerY + Math.sin(midAngle) * labelRadius;

        ctx.fillStyle = tokens.foreground;
        ctx.font = "11px var(--font-outfit, ui-sans-serif, system-ui)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const percentage = Math.round((point.value / total) * 100);
        ctx.fillText(`${percentage}%`, labelX, labelY);

        startAngle = endAngle;
      });
    };

    switch (chartType) {
      case "bar":
        drawBarChart();
        break;
      case "line":
        drawLineChart();
        break;
      case "pie":
        drawPieChart(false);
        break;
      case "doughnut":
        drawPieChart(true);
        break;
    }
  }, [chartType, data, seriesColor]);

  const syncDerivedHexes = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const tokens = readChartThemeTokens(el);
    setDerivedHexByIndex(
      data.map((point, index) =>
        point.color ?? cssColorToHex(seriesColor(point, index, tokens)),
      ),
    );
  }, [data, seriesColor]);

  useLayoutEffect(() => {
    drawChart();
    syncDerivedHexes();
  }, [drawChart, syncDerivedHexes, resolvedTheme]);

  useEffect(() => {
    const chartEl = containerRef.current;
    if (!chartEl) return;
    const host = chartEl.closest("[data-theme]");
    if (!host) return;
    const mo = new MutationObserver(() => {
      drawChart();
      syncDerivedHexes();
    });
    mo.observe(host, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, [drawChart, syncDerivedHexes]);

  const addDataPoint = () => {
    const newIndex = data.length;
    setData([
      ...data,
      {
        label: `Item ${newIndex + 1}`,
        value: 25,
      },
    ]);
  };

  const updateDataPoint = (index: number, field: keyof ChartDataPoint, value: string | number) => {
    setData((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeDataPoint = (index: number) => {
    if (data.length > 1) {
      setData((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const displayHexForRow = (index: number) =>
    data[index]?.color ?? derivedHexByIndex[index] ?? "#6366f1";

  const chartTypeOptions: { type: ChartType; icon: React.ReactNode; label: string }[] = [
    { type: "bar", icon: <BarChart3 className="size-4" />, label: "Bar" },
    { type: "line", icon: <LineChart className="size-4" />, label: "Line" },
    { type: "pie", icon: <PieChart className="size-4" />, label: "Pie" },
    { type: "doughnut", icon: <PieChart className="size-4" />, label: "Doughnut" },
  ];

  return (
    <NodeViewWrapper className="my-4">
      <Card ref={containerRef} className="overflow-hidden shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 border-b border-border px-4 py-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
            <Badge variant="secondary" className="shrink-0 font-medium">
              Chart
            </Badge>
            <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/30 p-0.5">
              {chartTypeOptions.map((option) => (
                <Button
                  key={option.type}
                  type="button"
                  variant={chartType === option.type ? "secondary" : "ghost"}
                  size="icon"
                  className={cn(
                    "size-8 rounded-md",
                    chartType === option.type &&
                      "bg-background text-primary shadow-sm ring-1 ring-border",
                  )}
                  onClick={() => setChartType(option.type)}
                  title={option.label}
                >
                  {option.icon}
                </Button>
              ))}
            </div>
          </div>
          <Button
            type="button"
            variant={showEditor ? "secondary" : "ghost"}
            size="icon"
            className="size-8 shrink-0"
            onClick={() => setShowEditor(!showEditor)}
            title="Edit data"
          >
            <Settings2 className="size-4" />
          </Button>
        </CardHeader>

        {title ? (
          <div className="border-b border-border bg-muted/15 px-4 py-2 text-center">
            <CardTitle className="text-sm font-medium text-foreground">{title}</CardTitle>
          </div>
        ) : null}

        <div className="bg-muted/10 px-4 py-4">
          <canvas ref={canvasRef} width={500} height={300} className="w-full rounded-md" />
        </div>

        {showLegend && (chartType === "pie" || chartType === "doughnut") ? (
          <div className="flex flex-wrap justify-center gap-3 border-t border-border bg-muted/5 px-4 py-3">
            {data.map((point, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <div
                  className="size-3 shrink-0 rounded-sm ring-1 ring-border"
                  style={{
                    backgroundColor: displayHexForRow(index),
                  }}
                />
                <span className="text-xs text-muted-foreground">{point.label}</span>
              </div>
            ))}
          </div>
        ) : null}

        {showEditor ? (
          <>
            <Separator />
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="chart-block-title" className="text-xs text-muted-foreground">
                  Chart title
                </Label>
                <Input
                  id="chart-block-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Optional title…"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Data points</Label>
                <div className="space-y-2">
                  {data.map((point, index) => (
                    <div key={index} className="flex flex-wrap items-center gap-2">
                      <input
                        type="color"
                        aria-label={`Color for ${point.label}`}
                        value={displayHexForRow(index)}
                        onChange={(e) => updateDataPoint(index, "color", e.target.value)}
                        className="size-9 shrink-0 cursor-pointer overflow-hidden rounded-md border border-input bg-transparent p-0 shadow-xs"
                      />
                      <Input
                        className="min-w-24 flex-1"
                        value={point.label}
                        onChange={(e) => updateDataPoint(index, "label", e.target.value)}
                        placeholder="Label"
                      />
                      <Input
                        type="number"
                        className="w-24 shrink-0 tabular-nums"
                        value={point.value}
                        onChange={(e) =>
                          updateDataPoint(index, "value", parseFloat(e.target.value) || 0)
                        }
                        placeholder="Value"
                      />
                      {data.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeDataPoint(index)}
                          aria-label={`Remove ${point.label}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addDataPoint}>
                  <Plus className="size-3.5" />
                  Add data point
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="chart-show-legend"
                  checked={showLegend}
                  onCheckedChange={(v) => setShowLegend(v === true)}
                />
                <Label htmlFor="chart-show-legend" className="text-xs font-normal text-muted-foreground">
                  Show legend (pie / doughnut)
                </Label>
              </div>
            </CardContent>
          </>
        ) : null}
      </Card>
    </NodeViewWrapper>
  );
}
