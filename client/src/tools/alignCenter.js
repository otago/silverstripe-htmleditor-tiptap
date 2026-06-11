import { createCommandTool } from './createCommandTool';

export default createCommandTool({
  action: 'alignCenter',
  extension: 'textAlign',
  tooltipKey: 'align_center',
  defaultTitle: 'Align Center',
  canMethod: 'setTextAlign',
  runMethod: 'setTextAlign',
  canArgs: ["center"],
  runArgs: ["center"],
  isActive: (editor) => editor.isActive({ textAlign: 'center' }),
});