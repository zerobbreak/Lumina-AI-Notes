import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ChartNodeView } from "./ChartNodeView";

export type ChartType = "bar" | "line" | "pie" | "doughnut";

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    chart: {
      insertChart: (type?: ChartType) => ReturnType;
    };
  }
}

export const ChartExtension = Node.create({
  name: "chart",

  group: "block",

  atom: true,

  addAttributes() {
    return {
      chartType: {
        default: "bar" as ChartType,
        parseHTML: (element) => element.getAttribute("data-chart-type") || "bar",
        renderHTML: (attributes) => ({
          "data-chart-type": attributes.chartType,
        }),
      },
      data: {
        default: [
          { label: "Item 1", value: 30 },
          { label: "Item 2", value: 50 },
          { label: "Item 3", value: 20 },
        ] as ChartDataPoint[],
        parseHTML: (element) => {
          try {
            return JSON.parse(element.getAttribute("data-chart-data") || "[]");
          } catch {
            return [
              { label: "Item 1", value: 30 },
              { label: "Item 2", value: 50 },
              { label: "Item 3", value: 20 },
            ];
          }
        },
        renderHTML: (attributes) => ({
          "data-chart-data": JSON.stringify(attributes.data),
        }),
      },
      title: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-chart-title") || "",
        renderHTML: (attributes) => ({
          "data-chart-title": attributes.title,
        }),
      },
      showLegend: {
        default: true,
        parseHTML: (element) => element.getAttribute("data-show-legend") === "true",
        renderHTML: (attributes) => ({
          "data-show-legend": String(attributes.showLegend),
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="chart"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "chart" })];
  },

  addCommands() {
    return {
      insertChart:
        (type: ChartType = "bar") =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              chartType: type,
              data: [
                { label: "Item 1", value: 30 },
                { label: "Item 2", value: 50 },
                { label: "Item 3", value: 20 },
              ],
              title: "",
              showLegend: true,
            },
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ChartNodeView);
  },
});
