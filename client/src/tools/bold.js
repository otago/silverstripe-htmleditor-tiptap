import { createCommandTool } from './createCommandTool';

export default createCommandTool({
  action: 'bold',
  extension: 'bold',
  tooltipKey: 'bold',
  defaultTitle: 'Bold',
  canMethod: 'toggleBold',
  runMethod: 'toggleBold',
  canArgs: [],
  runArgs: [],
  isActive: (editor) => editor.isActive('bold'),
});