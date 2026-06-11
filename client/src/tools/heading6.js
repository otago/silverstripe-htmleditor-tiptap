import { createCommandTool } from './createCommandTool';

export default createCommandTool({
  action: 'heading6',
  extension: 'heading',
  tooltipKey: 'heading6',
  defaultTitle: 'Heading 6',
  canMethod: 'toggleHeading',
  runMethod: 'toggleHeading',
  canArgs: [{ level: 6 }],
  runArgs: [{ level: 6 }],
  isActive: (editor) => editor.isActive('heading', { level: 6 }),
});