import { createCommandTool } from './createCommandTool';

export default createCommandTool({
  action: 'strikethrough',
  extension: 'strike',
  tooltipKey: 'strikethrough',
  defaultTitle: 'Strikethrough',
  canMethod: 'toggleStrike',
  runMethod: 'toggleStrike',
  canArgs: [],
  runArgs: [],
  isActive: (editor) => editor.isActive('strike'),
});