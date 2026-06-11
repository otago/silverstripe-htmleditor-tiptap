import { createCommandTool } from './createCommandTool';

export default createCommandTool({
  action: 'heading4',
  extension: 'heading',
  tooltipKey: 'heading4',
  defaultTitle: 'Heading 4',
  canMethod: 'toggleHeading',
  runMethod: 'toggleHeading',
  canArgs: [{ level: 4 }],
  runArgs: [{ level: 4 }],
  isActive: (editor) => editor.isActive('heading', { level: 4 }),
});