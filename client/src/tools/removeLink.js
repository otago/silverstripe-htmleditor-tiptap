const removeLinkTool = {
  action: 'removelink',
  getToolbarConfig({ tooltips }) {
    return {
      type: 'button',
      title: tooltips.removeLink || 'Remove Link',
      action: 'removelink',
      extension: 'link',
    };
  },
  run({ editor }) {
    if (!editor.isActive('link')) {
      return;
    }

    editor.chain().focus().unsetLink().run();
  },
  isActive(editor) {
    return false;
  },
  isDisabled(editor) {
    return !editor.isActive('link');
  },
};

export default removeLinkTool;