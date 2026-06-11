import { createCommandTool } from './createCommandTool';

export default createCommandTool({
  action: 'paragraph',
  extension: 'heading',
  tooltipKey: 'paragraph',
  defaultTitle: 'Paragraph',
  canMethod: 'setParagraph',
  runMethod: 'setParagraph',
  canArgs: [],
  runArgs: [],
  isActive: (editor) => editor.isActive('paragraph'),
});