import { createCommandTool } from './createCommandTool';

export default createCommandTool({
  action: 'heading1',
  extension: 'heading',
  tooltipKey: 'heading1',
  defaultTitle: 'Heading 1',
  canMethod: 'toggleHeading',
  runMethod: 'toggleHeading',
  canArgs: [{ level: 1 }],
  runArgs: [{ level: 1 }],
  isActive: (editor) => editor.isActive('heading', { level: 1 }),
});