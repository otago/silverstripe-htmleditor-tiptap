const linkTool = {
  action: 'link',
  getToolbarConfig({ tooltips }) {
    return {
      type: 'button',
      title: tooltips.link || 'Link',
      action: 'link',
      extension: 'link',
    };
  },
  run({ editor }) {
    const url = prompt('Enter URL:');
    if (!url || !editor.can().setLink({ href: url })) {
      return;
    }

    editor.chain().focus().setLink({ href: url }).run();
  },
  isActive(editor) {
    return editor.isActive('link');
  },
  isDisabled(editor) {
    return !editor.can().setLink({ href: '#' });
  },
};

export default linkTool;
