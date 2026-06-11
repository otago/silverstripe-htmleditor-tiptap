import { createCommandTool } from './createCommandTool';

export default createCommandTool({
  action: 'heading5',
  extension: 'heading',
  tooltipKey: 'heading5',
  defaultTitle: 'Heading 5',
  canMethod: 'toggleHeading',
  runMethod: 'toggleHeading',
  canArgs: [{ level: 5 }],
  runArgs: [{ level: 5 }],
  isActive: (editor) => editor.isActive('heading', { level: 5 }),
});