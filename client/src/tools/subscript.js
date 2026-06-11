import { createCommandTool } from './createCommandTool';

export default createCommandTool({
  action: 'subscript',
  extension: 'subscript',
  tooltipKey: 'subscript',
  defaultTitle: 'Subscript',
  canMethod: 'toggleSubscript',
  runMethod: 'toggleSubscript',
  canArgs: [],
  runArgs: [],
  isActive: (editor) => editor.isActive('subscript'),
});