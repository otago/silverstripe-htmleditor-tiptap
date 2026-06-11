import { createCommandTool } from './createCommandTool';

export default createCommandTool({
  action: 'blockquote',
  extension: 'blockquote',
  tooltipKey: 'blockquote',
  defaultTitle: 'Quote',
  canMethod: 'toggleBlockquote',
  runMethod: 'toggleBlockquote',
  canArgs: [],
  runArgs: [],
  isActive: (editor) => editor.isActive('blockquote'),
});