
function extractYoutubeId(input) {
  if (!input) {
    return '';
  }

  const value = String(input).trim();

  // Plain ID support
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) {
    return value;
  }

  // URL support
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();

    if (host.includes('youtu.be')) {
      const pathId = url.pathname.replace(/^\//, '').split('/')[0];
      return pathId || '';
    }

    if (host.includes('youtube.com')) {
      const paramId = url.searchParams.get('v');
      if (paramId) {
        return paramId;
      }

      const parts = url.pathname.split('/').filter(Boolean);
      const embedIndex = parts.indexOf('embed');
      if (embedIndex > -1 && parts[embedIndex + 1]) {
        return parts[embedIndex + 1];
      }

      const shortsIndex = parts.indexOf('shorts');
      if (shortsIndex > -1 && parts[shortsIndex + 1]) {
        return parts[shortsIndex + 1];
      }
    }
  } catch (e) {
    // Ignore parse errors and return empty ID
  }

  return '';
}

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getYoutubeThumbnailUrl(videoId) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

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
    const urlInput = prompt('Enter YouTube URL or ID:');
    if (!urlInput) {
      return;
    }

    const videoId = extractYoutubeId(urlInput);
    if (!videoId) {
      alert('Could not detect a valid YouTube ID from that value.');
      return;
    }

    const rawWidth = prompt('Width (default 640):', '640');
    const rawHeight = prompt('Height (default 480):', '480');
    const width = Math.max(320, parseInt(rawWidth, 10) || 640);
    const height = Math.max(180, parseInt(rawHeight, 10) || 480);

    const sourceUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const thumbnailUrl = getYoutubeThumbnailUrl(videoId);
    console.log('thumbnailUrl', thumbnailUrl);
    const html = `<embed data-provider="youtube" data-id="${escapeAttribute(videoId)}" 
      data-url="${escapeAttribute(sourceUrl)}"
      src="${escapeAttribute(thumbnailUrl)}"
      type="image/jpeg" data-width="${width}" data-height="${height}" width="${width}" height="${height}" 
      style="display:block; width: ${width}px; height: ${height}px; background:url(${thumbnailUrl}) no-repeat center center; background-size:cover;"></embed>`;

    if (!editor.can().insertContent(html)) {
      return;
    }

    editor
      .chain()
      .focus()
      .unsetAllMarks()
      .insertContent(html)
      .run();
  },

  isActive(editor) {
    return editor.isActive('youtube');
  },

  isDisabled(editor) {
    return !editor.can().insertContent('<embed data-provider="youtube" data-id="dQw4w9WgXcQ"></embed>');
  },
};

export default youtubeTool;