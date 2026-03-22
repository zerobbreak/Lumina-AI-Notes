/**
 * Collapsible List Item Component
 * React component for rendering collapsible outline items with expand/collapse functionality
 */

import { NodeViewWrapper, NodeViewContent, NodeViewProps } from '@tiptap/react';
import { ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';

export function CollapsibleListItem({ node, updateAttributes, editor }: NodeViewProps) {
  const [isCollapsed, setIsCollapsed] = useState(node.attrs.collapsed || false);
  
  // Sync with node attributes
  useEffect(() => {
    setIsCollapsed(node.attrs.collapsed || false);
  }, [node.attrs.collapsed]);
  
  const toggleCollapse = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    updateAttributes({ collapsed: newState });
  };
  
  // Check if this item has children (nested lists)
  const hasChildren = node.content.size > 0 && 
    node.content.content.some((child: any) => 
      child.type.name === 'bulletList' || 
      child.type.name === 'orderedList' ||
      child.type.name === 'taskList'
    );
  
  return (
    <NodeViewWrapper className={`outline-list-item-wrapper group/collapsible ${isCollapsed ? 'is-collapsed' : 'is-expanded'}`}>
      <div className="flex items-start gap-0.5 group-hover/collapsible:bg-white/[0.03] rounded-sm transition-colors duration-150 -ml-2 pl-2 py-0.5 relative">
        {/* Hover "rail" indicator */}
        <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-indigo-500/0 group-hover/collapsible:bg-indigo-500/20 rounded-full transition-colors duration-200" />
        
        <div className="flex items-center justify-center w-5 h-6 shrink-0 z-10">
          {hasChildren && (
            <button
              onClick={toggleCollapse}
              className="text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/80 rounded-sm transition-all duration-200 w-4.5 h-4.5 flex items-center justify-center focus:outline-none focus:ring-1 focus:ring-zinc-700/50 active:scale-90"
              contentEditable={false}
              aria-label={isCollapsed ? "Expand" : "Collapse"}
            >
              <ChevronRight 
                className={`w-3.5 h-3.5 transition-transform duration-200 ease-in-out ${!isCollapsed ? 'rotate-90' : ''}`} 
              />
            </button>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="outline-node-content-container">
            <NodeViewContent className="outline-node-content selection:bg-indigo-500/30" />
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
}




