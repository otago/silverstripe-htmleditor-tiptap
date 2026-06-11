import { createCommandTool } from './createCommandTool';

export default createCommandTool({
  action: 'undo',
  extension: 'history',
  tooltipKey: 'undo',
  defaultTitle: 'Undo',
  canMethod: 'undo',
  runMethod: 'undo',
  canArgs: [],
  runArgs: [],
  isActive: (editor) => false,
});