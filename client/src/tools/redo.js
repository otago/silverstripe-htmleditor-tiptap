import { createCommandTool } from './createCommandTool';

export default createCommandTool({
  action: 'redo',
  extension: 'history',
  tooltipKey: 'redo',
  defaultTitle: 'Redo',
  canMethod: 'redo',
  runMethod: 'redo',
  canArgs: [],
  runArgs: [],
  isActive: (editor) => false,
});