import { createCommandTool } from './createCommandTool';

export default createCommandTool({
  action: 'italic',
  extension: 'italic',
  tooltipKey: 'italic',
  defaultTitle: 'Italic',
  canMethod: 'toggleItalic',
  runMethod: 'toggleItalic',
  canArgs: [],
  runArgs: [],
  isActive: (editor) => editor.isActive('italic'),
});