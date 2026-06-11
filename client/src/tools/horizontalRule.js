import { createCommandTool } from './createCommandTool';

export default createCommandTool({
  action: 'horizontalRule',
  extension: 'horizontalRule',
  tooltipKey: 'horizontalRule',
  defaultTitle: 'Insert Horizontal Rule',
  canMethod: 'setHorizontalRule',
  runMethod: 'setHorizontalRule',
  canArgs: [],
  runArgs: [],
  isActive: (editor) => false,
});