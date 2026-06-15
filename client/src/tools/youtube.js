


const youtubeTool = {
  action: 'youtube',

  getToolbarConfig({ tooltips }) {
    return {
      type: 'button',
      title: tooltips.youtube || 'Insert YouTube Video',
      action: 'youtube',
      extension: 'youtube',
    };
  },

  run({ editor }) {
    const src = prompt('Enter YouTube URL:');
    if (!src) {
      return;
    }

    const rawWidth = prompt('Width (default 640):', '640');
    const rawHeight = prompt('Height (default 480):', '480');

    const width = Math.max(320, parseInt(rawWidth, 10) || 640);
    const height = Math.max(180, parseInt(rawHeight, 10) || 480);

    if (!editor.can().setYoutubeVideo({ src, width, height })) {
      return;
    }

    editor
      .chain()
      .focus()
      .unsetAllMarks()
      .setYoutubeVideo({ src, width, height })
      .run();
  },

  isActive(editor) {
    return editor.isActive('youtube');
  },

  isDisabled(editor) {
    return !editor.can().setYoutubeVideo({
      src: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      width: 640,
      height: 480,
    });
  },
};

export default youtubeTool;