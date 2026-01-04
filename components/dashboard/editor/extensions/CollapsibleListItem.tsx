/**
 * Collapsible List Item Component
 * React component for rendering collapsible outline items with expand/collapse functionality
 */

import { NodeViewWrapper, NodeViewContent, NodeViewProps } from '@tiptap/react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';

export function CollapsibleListItem({ node, updateAttributes, editor }: NodeViewProps) {
  const [isCollapsed, setIsCollapsed] = useState(node.attrs.collapsed || false);
  
  // Sync with node attributes
  useEffect(() => {
    setIsCollapsed(node.attrs.collapsed || false);
  }, [node.attrs.collapsed]);
  
  const toggleCollapse = () => {
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
    <NodeViewWrapper className="outline-list-item-wrapper">
      <div className="flex items-start gap-1">
        {hasChildren && (
          <button
            onClick={toggleCollapse}
            className="mt-1 text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0 w-4 h-4 flex items-center justify-center"
            contentEditable={false}
            aria-label={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-4 flex-shrink-0" />}
        <div className={`flex-1 ${isCollapsed ? 'collapsed-content' : ''}`}>
          <NodeViewContent className="outline-node-content" />
        </div>
      </div>
    </NodeViewWrapper>
  );
}


