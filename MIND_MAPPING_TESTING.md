# Mind Mapping Feature - Testing Guide

## Overview
This document outlines how to test the newly implemented mind mapping feature.

## What Was Implemented

### 1. Custom Node Components ✅
- **ConceptNode**: Purple gradient, large size, for central concepts
- **TopicNode**: Blue gradient, medium size, for main topics
- **SubtopicNode**: Emerald gradient, small size, for subtopics
- **NoteNode**: Amber gradient, minimal size, for quick notes

All nodes support:
- Double-click to edit labels
- Multiple connection handles (top, bottom, left, right)
- Visual feedback on selection
- Color customization

### 2. Enhanced FlowCanvas ✅
- Integrated custom node types
- Added MindMapToolbar with full controls
- Keyboard shortcuts (Delete, N for new node)
- Mini-map for navigation
- Auto-save changes to parent component
- Read-only mode support

### 3. MindMapToolbar ✅
- Add Node button with type selector (Concept, Topic, Subtopic, Note)
- Delete Selected button
- Color Picker for selected nodes
- Layout dropdown (Hierarchical, Radial, Force)
- Fit View button
- Export dropdown (PNG, SVG, PDF)

### 4. Layout Algorithms ✅
- **Hierarchical**: Uses Dagre for top-down tree layout
- **Radial**: Circular layout from center node
- **Force**: Physics-based force-directed layout

### 5. Export Functionality ✅
- PNG export using html2canvas
- PDF export using jsPDF
- SVG export using native browser APIs

### 6. Enhanced AI Generation ✅
- Improved `generateCourseRoadmap` with:
  - Proper node types (concept, topic, subtopic, note)
  - Color coding based on node type
  - Dagre-based positioning for optimal layout
  - Better fallback structure
- Updated `generateStructuredNotes` with new node types

### 7. Editor Integration ✅
- DiagramExtension added to TipTap editor
- Works in all note types
- Proper serialization/deserialization

## Testing Steps

### Test 1: Onboarding Flow
1. Start the app: `npm run dev`
2. Sign in and go through onboarding
3. Select "Mind Mapping" as your note style
4. Complete onboarding
5. **Expected**: A "My Course Roadmap" note should be created with a mind map showing your major and courses

### Test 2: Interactive Node Editing
1. Open the generated roadmap note
2. Double-click any node
3. Edit the label text
4. Press Enter or click outside
5. **Expected**: Label updates and changes are saved

### Test 3: Add New Nodes
1. In the mind map, click "Add Node" in toolbar
2. Select a node type (e.g., "Topic")
3. **Expected**: New node appears in the center
4. Drag it to desired position
5. Connect it to other nodes by dragging from a handle

### Test 4: Delete Nodes
1. Click to select a node
2. Click the trash icon in toolbar OR press Delete key
3. **Expected**: Node and its connected edges are removed

### Test 5: Color Customization
1. Select a node
2. Click the palette icon in toolbar
3. Choose a color
4. **Expected**: Node color updates immediately

### Test 6: Layout Algorithms
1. Create or open a mind map with multiple nodes
2. Click "Layout" in toolbar
3. Try each layout option:
   - Hierarchical: Should arrange in tree structure
   - Radial: Should arrange in circles from center
   - Force: Should use physics-based spacing
4. **Expected**: Nodes rearrange with smooth animation

### Test 7: Export Functionality
1. Open a mind map
2. Click "Export" in toolbar
3. Try each format:
   - PNG: Downloads image file
   - SVG: Downloads vector file
   - PDF: Downloads PDF document
4. **Expected**: Files download successfully and display the mind map

### Test 8: Keyboard Shortcuts
1. Select a node
2. Press `Delete` or `Backspace`
3. **Expected**: Node is deleted
4. Press `N` key
5. **Expected**: New topic node is added

### Test 9: Mini-map Navigation
1. Create a large mind map (10+ nodes)
2. Zoom in on one area
3. Use the mini-map (bottom-right corner)
4. **Expected**: Can navigate to different areas quickly

### Test 10: Read-Only Mode
1. Open a mind map in view-only mode (if applicable)
2. Try to edit, add, or delete nodes
3. **Expected**: All editing features are disabled, but viewing/zooming works

### Test 11: AI-Generated Mind Maps from Audio
1. Record or upload a lecture audio
2. Generate notes
3. **Expected**: If user's note style is "mindmap", a mind map should be included showing key concepts and relationships

### Test 12: Persistence
1. Create a mind map with custom nodes and connections
2. Close the note
3. Reopen the note
4. **Expected**: All nodes, edges, positions, and colors are preserved

## Known Limitations
- Export quality depends on browser canvas rendering
- Very large diagrams (100+ nodes) may have performance impact
- SVG export includes HTML elements via foreignObject (may not render in all viewers)

## Success Criteria
✅ All custom node types render correctly
✅ Toolbar controls work as expected
✅ Layout algorithms produce visually appealing results
✅ Export generates valid files
✅ Changes persist to database
✅ Keyboard shortcuts work
✅ AI generation creates proper node types with colors
✅ Integration with onboarding works
✅ Integration with editor works
✅ No linter errors

## Files Modified/Created

### New Files
- `components/diagram/types.ts`
- `components/diagram/nodes/ConceptNode.tsx`
- `components/diagram/nodes/TopicNode.tsx`
- `components/diagram/nodes/SubtopicNode.tsx`
- `components/diagram/nodes/NoteNode.tsx`
- `components/diagram/layouts.ts`
- `components/diagram/export.ts`
- `components/diagram/MindMapToolbar.tsx`
- `components/diagram/README.md`

### Modified Files
- `components/diagram/FlowCanvas.tsx` - Complete rewrite with new features
- `components/dashboard/editor/Editor.tsx` - Added DiagramExtension
- `convex/ai.ts` - Enhanced generateCourseRoadmap and generateStructuredNotes
- `convex/notes.ts` - Enhanced generateFromPinnedAudio

## Next Steps (Optional Enhancements)
- Add undo/redo functionality
- Add node grouping/clustering
- Add edge labels and styling options
- Add templates for common mind map structures
- Add collaborative editing support
- Add image/icon support for nodes
- Add search/filter functionality for large maps



