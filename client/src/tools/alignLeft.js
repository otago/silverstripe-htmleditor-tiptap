import { createCommandTool } from './createCommandTool';

export default createCommandTool({
  action: 'alignLeft',
  extension: 'textAlign',
  tooltipKey: 'align_left',
  defaultTitle: 'Align Left',
  canMethod: 'setTextAlign',
  runMethod: 'setTextAlign',
  canArgs: ["left"],
  runArgs: ["left"],
  isActive: (editor) => editor.isActive({ textAlign: 'left' }),
});