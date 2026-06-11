import { createCommandTool } from './createCommandTool';

export default createCommandTool({
  action: 'underline',
  extension: 'underline',
  tooltipKey: 'underline',
  defaultTitle: 'Underline',
  canMethod: 'toggleUnderline',
  runMethod: 'toggleUnderline',
  canArgs: [],
  runArgs: [],
  isActive: (editor) => editor.isActive('underline'),
});