import { createCommandTool } from './createCommandTool';

export default createCommandTool({
  action: 'superscript',
  extension: 'superscript',
  tooltipKey: 'superscript',
  defaultTitle: 'Superscript',
  canMethod: 'toggleSuperscript',
  runMethod: 'toggleSuperscript',
  canArgs: [],
  runArgs: [],
  isActive: (editor) => editor.isActive('superscript'),
});