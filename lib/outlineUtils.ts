/**
 * Outline Mode Utility Functions
 * Handles extraction, serialization, and management of hierarchical outline structures
 */

export interface OutlineNode {
  id: string;
  type: "bullet" | "numbered" | "task";
  content: string; // HTML content
  level: number; // 0-based indentation level
  checked?: boolean; // For task items
  collapsed?: boolean; // For collapsible sections
  children?: OutlineNode[];
}

export interface OutlineMetadata {
  totalItems: number;
  completedTasks: number;
  collapsedNodes: string[];
}

/**
 * Extract hierarchical outline structure from HTML
 */
export function extractOutlineStructure(html: string): OutlineNode[] {
  if (!html || typeof window === 'undefined') return [];
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    return buildTreeFromElement(doc.body);
  } catch (error) {
    console.error('Error extracting outline structure:', error);
    return [];
  }
}

/**
 * Recursively build tree structure from DOM element
 */
function buildTreeFromElement(element: Element, level = 0): OutlineNode[] {
  const nodes: OutlineNode[] = [];
  
  // Find all direct list children (ul, ol, or task lists)
  const lists = element.querySelectorAll(':scope > ul, :scope > ol');
  
  lists.forEach((list) => {
    const isTaskList = list.getAttribute('data-type') === 'taskList' || 
                       list.classList.contains('outline-task-list');
    const isOrdered = list.tagName === 'OL';
    
    const items = list.querySelectorAll(':scope > li');
    
    items.forEach((item, index) => {
      const id = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Extract content (text without nested lists)
      const contentClone = item.cloneNode(true) as Element;
      const nestedLists = contentClone.querySelectorAll('ul, ol');
      nestedLists.forEach(nl => nl.remove());
      const content = contentClone.innerHTML.trim();
      
      // Check if task item is checked
      const checkbox = item.querySelector('input[type="checkbox"]');
      const checked = checkbox ? (checkbox as HTMLInputElement).checked : undefined;
      
      // Determine type
      let type: "bullet" | "numbered" | "task" = "bullet";
      if (isTaskList) {
        type = "task";
      } else if (isOrdered) {
        type = "numbered";
      }
      
      // Find nested children
      const nestedUl = item.querySelector(':scope > ul, :scope > ol');
      const children = nestedUl ? buildTreeFromElement(nestedUl, level + 1) : [];
      
      nodes.push({
        id,
        type,
        content,
        level,
        checked,
        children: children.length > 0 ? children : undefined,
      });
    });
  });
  
  return nodes;
}

/**
 * Calculate metadata from outline structure
 */
export function calculateOutlineMetadata(nodes: OutlineNode[]): OutlineMetadata {
  let totalItems = 0;
  let completedTasks = 0;
  const collapsedNodes: string[] = [];
  
  function traverse(node: OutlineNode) {
    totalItems++;
    
    if (node.type === 'task' && node.checked) {
      completedTasks++;
    }
    
    if (node.collapsed) {
      collapsedNodes.push(node.id);
    }
    
    node.children?.forEach(traverse);
  }
  
  nodes.forEach(traverse);
  
  return {
    totalItems,
    completedTasks,
    collapsedNodes,
  };
}

/**
 * Serialize outline to JSON string
 */
export function serializeOutline(nodes: OutlineNode[]): string {
  return JSON.stringify(nodes);
}

/**
 * Deserialize outline from JSON string
 */
export function deserializeOutline(json: string): OutlineNode[] {
  try {
    return JSON.parse(json);
  } catch (error) {
    console.error('Error deserializing outline:', error);
    return [];
  }
}

/**
 * Count total items in outline
 */
export function countOutlineItems(nodes: OutlineNode[]): number {
  let count = 0;
  
  function traverse(node: OutlineNode) {
    count++;
    node.children?.forEach(traverse);
  }
  
  nodes.forEach(traverse);
  return count;
}

/**
 * Count completed tasks in outline
 */
export function countCompletedTasks(nodes: OutlineNode[]): number {
  let count = 0;
  
  function traverse(node: OutlineNode) {
    if (node.type === 'task' && node.checked) {
      count++;
    }
    node.children?.forEach(traverse);
  }
  
  nodes.forEach(traverse);
  return count;
}

/**
 * Find node by ID in outline tree
 */
export function findNodeById(nodes: OutlineNode[], id: string): OutlineNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Toggle collapse state of a node
 */
export function toggleNodeCollapse(nodes: OutlineNode[], nodeId: string): OutlineNode[] {
  return nodes.map(node => {
    if (node.id === nodeId) {
      return { ...node, collapsed: !node.collapsed };
    }
    if (node.children) {
      return { ...node, children: toggleNodeCollapse(node.children, nodeId) };
    }
    return node;
  });
}


