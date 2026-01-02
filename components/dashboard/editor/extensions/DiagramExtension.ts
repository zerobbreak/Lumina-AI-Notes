import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { DiagramNodeView } from "./DiagramNodeView";

export const DiagramExtension = Node.create({
  name: "diagram",

  group: "block",

  atom: true,

  addAttributes() {
    return {
      nodes: {
        default: [],
        parseHTML: (element) => {
          try {
            return JSON.parse(element.getAttribute("data-nodes") || "[]");
          } catch {
            return [];
          }
        },
        renderHTML: (attributes) => {
          return {
            "data-nodes": JSON.stringify(attributes.nodes),
          };
        },
      },
      edges: {
        default: [],
        parseHTML: (element) => {
          try {
            return JSON.parse(element.getAttribute("data-edges") || "[]");
          } catch {
            return [];
          }
        },
        renderHTML: (attributes) => {
          return {
            "data-edges": JSON.stringify(attributes.edges),
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="diagram"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "diagram" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DiagramNodeView);
  },
});
