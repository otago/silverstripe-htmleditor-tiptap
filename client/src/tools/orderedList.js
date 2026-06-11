import { createCommandTool } from './createCommandTool';

export default createCommandTool({
  action: 'orderedList',
  extension: 'orderedList',
  tooltipKey: 'list_ordered',
  defaultTitle: 'Numbered List',
  canMethod: 'toggleOrderedList',
  runMethod: 'toggleOrderedList',
  canArgs: [],
  runArgs: [],
  isActive: (editor) => editor.isActive('orderedList'),
});