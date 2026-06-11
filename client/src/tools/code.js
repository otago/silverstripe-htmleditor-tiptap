import { createCommandTool } from './createCommandTool';

export default createCommandTool({
  action: 'code',
  extension: 'code',
  tooltipKey: 'code',
  defaultTitle: 'Inline Code',
  canMethod: 'toggleCode',
  runMethod: 'toggleCode',
  canArgs: [],
  runArgs: [],
  isActive: (editor) => editor.isActive('code'),
});