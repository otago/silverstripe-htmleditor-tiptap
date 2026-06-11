import { createCommandTool } from './createCommandTool';

export default createCommandTool({
  action: 'heading3',
  extension: 'heading',
  tooltipKey: 'heading3',
  defaultTitle: 'Heading 3',
  canMethod: 'toggleHeading',
  runMethod: 'toggleHeading',
  canArgs: [{ level: 3 }],
  runArgs: [{ level: 3 }],
  isActive: (editor) => editor.isActive('heading', { level: 3 }),
});