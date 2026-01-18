import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { GraphCalculatorNodeView } from "./GraphCalculatorNodeView";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    graphCalculator: {
      insertGraphCalculator: () => ReturnType;
    };
  }
}

export const GraphCalculatorExtension = Node.create({
  name: "graphCalculator",

  group: "block",

  atom: true,

  addAttributes() {
    return {
      expressions: {
        default: ["y = x^2"],
        parseHTML: (element) => {
          try {
            return JSON.parse(element.getAttribute("data-expressions") || '["y = x^2"]');
          } catch {
            return ["y = x^2"];
          }
        },
        renderHTML: (attributes) => {
          return {
            "data-expressions": JSON.stringify(attributes.expressions),
          };
        },
      },
      settings: {
        default: {
          xMin: -10,
          xMax: 10,
          yMin: -10,
          yMax: 10,
          gridEnabled: true,
          axisEnabled: true,
        },
        parseHTML: (element) => {
          try {
            return JSON.parse(
              element.getAttribute("data-settings") ||
                '{"xMin":-10,"xMax":10,"yMin":-10,"yMax":10,"gridEnabled":true,"axisEnabled":true}'
            );
          } catch {
            return {
              xMin: -10,
              xMax: 10,
              yMin: -10,
              yMax: 10,
              gridEnabled: true,
              axisEnabled: true,
            };
          }
        },
        renderHTML: (attributes) => {
          return {
            "data-settings": JSON.stringify(attributes.settings),
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="graph-calculator"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "graph-calculator" }),
    ];
  },

  addCommands() {
    return {
      insertGraphCalculator:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              expressions: ["y = x^2"],
              settings: {
                xMin: -10,
                xMax: 10,
                yMin: -10,
                yMax: 10,
                gridEnabled: true,
                axisEnabled: true,
              },
            },
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(GraphCalculatorNodeView);
  },
});
