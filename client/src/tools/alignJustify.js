import { createCommandTool } from './createCommandTool';

export default createCommandTool({
  action: 'alignJustify',
  extension: 'textAlign',
  tooltipKey: 'align_justify',
  defaultTitle: 'Justify',
  canMethod: 'setTextAlign',
  runMethod: 'setTextAlign',
  canArgs: ["justify"],
  runArgs: ["justify"],
  isActive: (editor) => editor.isActive({ textAlign: 'justify' }),
});