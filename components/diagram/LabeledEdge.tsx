"use client";

import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { cn } from "@/lib/utils";

/**
 * Default edge for the mind map. Renders the relationship phrase (`edge.label`,
 * e.g. "causes", "depends on") as a compact chip that stays legible on the dark
 * canvas. Uses EdgeLabelRenderer rather than ReactFlow's native SVG label so the
 * chip can be width-capped and CSS-truncated — a 40-char phrase drawn as raw SVG
 * <text> has no wrapping or ellipsis and would smear across neighbouring nodes.
 * Edges without a label render as a plain line.
 */
export const LabeledEdge = memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    label,
    markerEnd,
    markerStart,
    data,
    style,
    selected,
  }: EdgeProps) => {
    const [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });

    const text = typeof label === "string" ? label.trim() : "";

    // The layout points every edge shallow -> deep, which can be the opposite of
    // the relationship the model stated. When it is, the arrowhead goes on the
    // start of the path so "causes" still reads from cause to effect. ReactFlow's
    // markers are orient="auto-start-reverse", so one marker faces correctly at
    // either end.
    const isReversed = Boolean((data as { reversed?: boolean } | undefined)?.reversed);

    return (
      <>
        <BaseEdge
          id={id}
          path={edgePath}
          markerEnd={isReversed ? undefined : markerEnd}
          markerStart={isReversed ? (markerStart ?? markerEnd) : undefined}
          style={style}
        />
        {text ? (
          <EdgeLabelRenderer>
            <div
              title={text}
              className={cn(
                // pointer events stay on so the native title tooltip can reveal
                // a phrase that the max-width truncated; nodrag/nopan keep the
                // chip from hijacking canvas panning.
                "nodrag nopan absolute max-w-[160px] truncate rounded-full border px-2 py-0.5",
                "text-[10px] font-medium leading-tight tracking-wide",
                "bg-slate-900/90 text-slate-100 backdrop-blur-xs",
                selected ? "border-cyan-400" : "border-blue-400/40"
              )}
              style={{
                transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                // The EdgeLabelRenderer wrapper is pointer-events: none.
                pointerEvents: "all",
              }}
            >
              {text}
            </div>
          </EdgeLabelRenderer>
        ) : null}
      </>
    );
  }
);

LabeledEdge.displayName = "LabeledEdge";
