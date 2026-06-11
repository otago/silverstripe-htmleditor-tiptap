import { createCommandTool } from './createCommandTool';

export default createCommandTool({
  action: 'codeBlock',
  extension: 'codeBlock',
  tooltipKey: 'codeBlock',
  defaultTitle: 'Code Block',
  canMethod: 'toggleCodeBlock',
  runMethod: 'toggleCodeBlock',
  canArgs: [],
  runArgs: [],
  isActive: (editor) => editor.isActive('codeBlock'),
});