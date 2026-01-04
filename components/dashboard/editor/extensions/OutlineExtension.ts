/**
 * Outline Extension for TipTap
 * Provides enhanced keyboard shortcuts and behavior for hierarchical outline editing
 */

import { Extension } from '@tiptap/core';

export const OutlineExtension = Extension.create({
  name: 'outline',

  addKeyboardShortcuts() {
    return {
      // Tab to indent (sink list item)
      'Tab': () => {
        // Check if we're in a list item
        if (this.editor.isActive('listItem')) {
          return this.editor.commands.sinkListItem('listItem');
        }
        // Check if we're in a task item
        if (this.editor.isActive('taskItem')) {
          return this.editor.commands.sinkListItem('taskItem');
        }
        // Not in a list, allow default tab behavior
        return false;
      },
      
      // Shift+Tab to outdent (lift list item)
      'Shift-Tab': () => {
        if (this.editor.isActive('listItem')) {
          return this.editor.commands.liftListItem('listItem');
        }
        if (this.editor.isActive('taskItem')) {
          return this.editor.commands.liftListItem('taskItem');
        }
        return false;
      },
      
      // Enter: Smart list continuation
      'Enter': () => {
        const { state } = this.editor;
        const { $from } = state.selection;
        
        // Check if we're in a list item
        const isInListItem = this.editor.isActive('listItem') || this.editor.isActive('taskItem');
        
        if (!isInListItem) {
          return false; // Not in a list, use default behavior
        }
        
        // Get the current node
        const node = $from.node($from.depth);
        
        // Check if the list item is empty
        const isEmpty = node && node.content.size === 0;
        
        if (isEmpty) {
          // Exit the list if item is empty
          if (this.editor.isActive('taskItem')) {
            return this.editor.commands.liftListItem('taskItem');
          }
          return this.editor.commands.liftListItem('listItem');
        }
        
        // Default: create new list item (let TipTap handle it)
        return false;
      },
      
      // Cmd+Shift+8 (or Ctrl+Shift+8) for bullet list
      'Mod-Shift-8': () => {
        return this.editor.chain().focus().toggleBulletList().run();
      },
      
      // Cmd+Shift+7 (or Ctrl+Shift+7) for numbered list
      'Mod-Shift-7': () => {
        return this.editor.chain().focus().toggleOrderedList().run();
      },
      
      // Cmd+Shift+9 (or Ctrl+Shift+9) for task list
      'Mod-Shift-9': () => {
        return this.editor.chain().focus().toggleTaskList().run();
      },
      
      // Backspace at start of list item to lift it
      'Backspace': () => {
        const { state } = this.editor;
        const { $from } = state.selection;
        
        // Only handle if at the start of a list item
        if ($from.parentOffset !== 0) {
          return false;
        }
        
        if (this.editor.isActive('listItem')) {
          return this.editor.commands.liftListItem('listItem');
        }
        
        if (this.editor.isActive('taskItem')) {
          return this.editor.commands.liftListItem('taskItem');
        }
        
        return false;
      },
    };
  },
  
  // Add custom commands for outline-specific operations
  addCommands() {
    return {
      // Toggle between list types
      convertListType: (type: 'bullet' | 'numbered' | 'task') => ({ commands }) => {
        if (type === 'bullet') {
          return commands.toggleBulletList();
        } else if (type === 'numbered') {
          return commands.toggleOrderedList();
        } else if (type === 'task') {
          return commands.toggleTaskList();
        }
        return false;
      },
      
      // Indent multiple levels
      indentMultiple: (levels: number) => ({ commands }) => {
        for (let i = 0; i < levels; i++) {
          if (this.editor.isActive('listItem')) {
            commands.sinkListItem('listItem');
          } else if (this.editor.isActive('taskItem')) {
            commands.sinkListItem('taskItem');
          }
        }
        return true;
      },
      
      // Outdent multiple levels
      outdentMultiple: (levels: number) => ({ commands }) => {
        for (let i = 0; i < levels; i++) {
          if (this.editor.isActive('listItem')) {
            commands.liftListItem('listItem');
          } else if (this.editor.isActive('taskItem')) {
            commands.liftListItem('taskItem');
          }
        }
        return true;
      },
    };
  },
});


