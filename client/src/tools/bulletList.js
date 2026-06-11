import { createCommandTool } from './createCommandTool';

export default createCommandTool({
  action: 'bulletList',
  extension: 'bulletList',
  tooltipKey: 'list_bullet',
  defaultTitle: 'Bullet List',
  canMethod: 'toggleBulletList',
  runMethod: 'toggleBulletList',
  canArgs: [],
  runArgs: [],
  isActive: (editor) => editor.isActive('bulletList'),
});