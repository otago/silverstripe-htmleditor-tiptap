import { createCommandTool } from './createCommandTool';

export default createCommandTool({
  action: 'heading2',
  extension: 'heading',
  tooltipKey: 'heading2',
  defaultTitle: 'Heading 2',
  canMethod: 'toggleHeading',
  runMethod: 'toggleHeading',
  canArgs: [{ level: 2 }],
  runArgs: [{ level: 2 }],
  isActive: (editor) => editor.isActive('heading', { level: 2 }),
});