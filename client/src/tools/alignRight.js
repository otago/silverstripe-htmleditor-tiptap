import { createCommandTool } from './createCommandTool';

export default createCommandTool({
  action: 'alignRight',
  extension: 'textAlign',
  tooltipKey: 'align_right',
  defaultTitle: 'Align Right',
  canMethod: 'setTextAlign',
  runMethod: 'setTextAlign',
  canArgs: ["right"],
  runArgs: ["right"],
  isActive: (editor) => editor.isActive({ textAlign: 'right' }),
});