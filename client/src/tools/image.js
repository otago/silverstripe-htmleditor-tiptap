const imageTool = {
  action: 'image',
  getToolbarConfig({ tooltips }) {
    return {
      type: 'button',
      title: tooltips.image || 'Image',
      action: 'image',
      extension: 'image',
    };
  },
  run({ editor }) {
    const src = prompt('Enter image URL:');
    if (!src || !editor.can().setImage({ src })) {
      return;
    }

    editor.chain().focus().setImage({ src }).run();
  },
  isActive(editor) {
    return false;
  },
  isDisabled(editor) {
    return !editor.can().setImage({ src: '#' });
  },
};

export default imageTool;