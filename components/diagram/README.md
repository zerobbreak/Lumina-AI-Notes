# Mind Mapping Feature

This directory contains the enhanced mind mapping functionality for Lumina Notes AI.

## Components

### FlowCanvas (`FlowCanvas.tsx`)
The main interactive mind map canvas component built on ReactFlow. Features:
- Drag and drop nodes
- Connect nodes with edges
- Custom node types (Concept, Topic, Subtopic, Note)
- Interactive toolbar
- Keyboard shortcuts
- Auto-layout algorithms
- Export to PNG/SVG/PDF
- Mini-map for navigation

### Custom Node Types (`nodes/`)
- **ConceptNode**: Large, bold nodes for central concepts (purple gradient)
- **TopicNode**: Medium nodes for main topics (blue gradient)
- **SubtopicNode**: Smaller nodes for subtopics (emerald gradient)
- **NoteNode**: Minimal nodes for quick notes (amber gradient)

All nodes support:
- Double-click to edit labels
- Color customization
- Multiple connection handles

Each node type has a `max-w-[…]` cap and a `line-clamp`. These MUST stay in step
with `NODE_METRICS` in `convex/shared/diagram.ts`, which both layout engines use
to reserve space — if a node renders wider than the layout reserved, nodes overlap.

### MindMapToolbar (`MindMapToolbar.tsx`)
Floating toolbar with controls:
- Add Node (with type selector)
- Delete Selected
- Color Picker
- Layout options (Hierarchical, Radial, Force)
- Fit View
- Export (PNG, SVG, PDF)

### Layout Algorithms (`layouts.ts`)
- **Hierarchical**: Top-down layered layout using ELK
- **Radial**: Circular layout from center
- **Force**: Physics-based force-directed layout

Node sizes come from `getNodeDimensions` in `convex/shared/diagram.ts` so the
client and server agree on how much space a node needs.

### Export Utilities (`export.ts`)
- PNG export using html2canvas
- PDF export using jsPDF
- SVG export using native browser APIs

### Type Definitions
`LayoutType` and `LayoutOptions` live in `@/types`; the shared node/edge shapes
and the server-side layered layout live in `convex/shared/diagram.ts`.

## Usage

### Basic Usage
```tsx
import { FlowCanvas } from "@/components/diagram/FlowCanvas";

<FlowCanvas
  initialNodes={nodes}
  initialEdges={edges}
  onChange={({ nodes, edges }) => {
    // Handle changes
  }}
  isReadOnly={false}
/>
```

### In TipTap Editor
The diagram is integrated as a TipTap extension:
```tsx
import { DiagramExtension } from "./extensions/DiagramExtension";

const editor = useEditor({
  extensions: [
    // ... other extensions
    DiagramExtension,
  ],
});
```

## Keyboard Shortcuts
- `Delete` / `Backspace`: Delete selected nodes/edges
- `N`: Add new topic node
- Double-click node: Edit label

## AI Generation
The AI returns `diagramNodes` and `diagramEdges`; `buildDiagramData` in
`convex/shared/diagram.ts` turns them into a ReactFlow graph.

```jsonc
"diagramNodes": [
  {"label": "Central Topic", "kind": "concept"},
  {"label": "Key Concept A", "kind": "topic"}
],
"diagramEdges": ["0-1: causes", "0-2"]
```

- A node is either a bare `"label"` string or `{label, kind}`, where kind is
  `concept | topic | subtopic | note` and reflects importance to the material,
  not tree position. Index 0 is always forced to `concept`; any other node
  claiming `concept` is demoted to `topic`.
- An edge is `"sourceIndex-targetIndex"` with an optional `": label"` suffix
  naming the relationship (max 40 chars), rendered as a chip by `LabeledEdge`.
- The layout points every edge shallow -> deep, which is sometimes the opposite
  of the relationship the model stated. Those edges are tagged `data.reversed`
  and `LabeledEdge` draws their arrowhead at the *start* of the path, so
  "Smoking -> causes -> Cancer" still reads correctly with Cancer as the root.
  The label text is never rewritten.
- A declared kind wins; when it is absent or invalid, type and colour fall back
  to BFS depth off the root as before.
- Both older forms (bare string nodes, bare `"0-1"` edges) still parse, so
  diagrams already stored in notes keep rendering.
- Initial positions come from a dependency-free layered layout, which runs in
  Convex's default runtime (ELK's browser bundle cannot load there).

## Data Structure
Nodes and edges follow the ReactFlow format:
```typescript
{
  nodes: [
    {
      id: "1",
      type: "concept",
      data: { 
        label: "Main Topic",
        color: "bg-gradient-to-br from-purple-500 to-pink-500"
      },
      position: { x: 400, y: 50 }
    }
  ],
  edges: [
    {
      id: "e1-2",
      source: "1",
      target: "2",
      animated: true
    }
  ]
}
```

## Dependencies
- `@xyflow/react`: ReactFlow library for node-based UIs
- `elkjs`: Graph layout algorithm (client only)
- `html2canvas`: Canvas-based screenshot
- `jspdf`: PDF generation
- `sonner`: Toast notifications




