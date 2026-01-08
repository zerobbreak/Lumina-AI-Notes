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

### MindMapToolbar (`MindMapToolbar.tsx`)
Floating toolbar with controls:
- Add Node (with type selector)
- Delete Selected
- Color Picker
- Layout options (Hierarchical, Radial, Force)
- Fit View
- Export (PNG, SVG, PDF)

### Layout Algorithms (`layouts.ts`)
- **Hierarchical**: Top-down tree layout using Dagre
- **Radial**: Circular layout from center
- **Force**: Physics-based force-directed layout

### Export Utilities (`export.ts`)
- PNG export using html2canvas
- PDF export using jsPDF
- SVG export using native browser APIs

### Type Definitions (`types.ts`)
TypeScript interfaces for nodes, edges, layouts, and export options.

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

### Onboarding Integration
When users select "Mind Mapping" as their note style during onboarding, a course roadmap is automatically generated using AI and inserted as a diagram node.

## Keyboard Shortcuts
- `Delete` / `Backspace`: Delete selected nodes/edges
- `N`: Add new topic node
- Double-click node: Edit label

## AI Generation
The AI generates mind maps with:
- Proper node types based on hierarchy
- Color coding by type
- Optimized positioning using Dagre layout
- Animated edges showing relationships

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
- `dagre`: Graph layout algorithm
- `html2canvas`: Canvas-based screenshot
- `jspdf`: PDF generation
- `sonner`: Toast notifications




