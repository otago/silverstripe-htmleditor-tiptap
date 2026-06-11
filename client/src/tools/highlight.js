import { createCommandTool } from './createCommandTool';

export default createCommandTool({
  action: 'highlight',
  extension: 'highlight',
  tooltipKey: 'highlight',
  defaultTitle: 'Highlight',
  canMethod: 'toggleHighlight',
  runMethod: 'toggleHighlight',
  canArgs: [],
  runArgs: [],
  isActive: (editor) => editor.isActive('highlight'),
});