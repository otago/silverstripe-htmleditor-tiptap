// rebecca wanted the bubble menu for links just like tinyMCE
import BubbleMenu from '@tiptap/extension-bubble-menu';
import { NodeSelection } from '@tiptap/pm/state';

const IMAGE_NODE_TYPES = ['imageResize', 'imagePlus', 'image'];

export function shouldShowLinkBubbleMenu(editor) {
  const href = (editor.getAttributes('link').href || '').trim();
  return Boolean(href);
}

export function shouldShowImageBubbleMenu(editor) {
  const { selection } = editor.state;
  return selection instanceof NodeSelection && Boolean(selection.node && IMAGE_NODE_TYPES.includes(selection.node.type.name));
}

function isSilverStripeSiteTreeHref(href) {
  if (typeof href !== 'string') {
    return false;
  }

  return /^\[sitetree_link,id=\d+\]$/.test(href.trim());
}

function updateLinkBubbleMenu(wrapper, editor) {
  const menu = wrapper.find('.tiptap-link-bubble-menu');
  if (menu.length === 0) {
    return;
  }

  const href = (editor.getAttributes('link').href || '').trim();
  const isSiteTree = isSilverStripeSiteTreeHref(href);
  const badge = menu.find('.link-type-badge');

  badge.text(isSiteTree ? 'Site tree link' : 'Raw URL');
  badge.attr('data-link-type', isSiteTree ? 'sitetree' : 'raw');
}

function updateImageBubbleMenu(wrapper, editor) {
  const menu = wrapper.find('.tiptap-image-bubble-menu');
  if (menu.length === 0) {
    return;
  }

  const { selection } = editor.state;
  const selectedNode = selection instanceof NodeSelection ? selection.node : null;
  const isImage = Boolean(selectedNode && IMAGE_NODE_TYPES.includes(selectedNode.type.name));

  menu.attr('data-image-selected', isImage ? 'true' : 'false');
}

function openLinkEditorForSelection(editor, siteLinkTool) {
  const currentLink = editor.getAttributes('link');
  console.log(currentLink);
  const currentHref = (currentLink.href || '').trim();
  if (!currentHref) {
    return;
  }

  const { from, to } = editor.state.selection;
  const selectedText = editor.state.doc.textBetween(from, to, '');

  if (siteLinkTool && typeof siteLinkTool.openEditorForHref === 'function' && siteLinkTool.openEditorForHref(editor, currentHref, selectedText)) {
    return;
  }

  if (siteLinkTool && isSilverStripeSiteTreeHref(currentHref) && typeof siteLinkTool.openSilverStripeDialog === 'function') {
    siteLinkTool.openSilverStripeDialog(editor, selectedText);
    return;
  }

  const nextHref = window.prompt('Edit URL:', currentHref);
  if (nextHref === null) {
    return;
  }

  const href = nextHref.trim();
  if (!href) {
    editor.chain().focus().unsetLink().run();
    return;
  }

  const nextAttributes = { ...currentLink, href };
  editor.chain().focus().setLink(nextAttributes).run();
}

function openImageEditorForSelection(editor, mediaTool) {
  console.log(mediaTool);
  if (mediaTool && typeof mediaTool.openImageEditor === 'function') {
    mediaTool.openImageEditor(editor);
    return;
  }

  if (mediaTool && typeof mediaTool.openFileLinkDialog === 'function') {
    mediaTool.openFileLinkDialog(editor, '', { replaceSelection: true });
  }
}

function deleteSelectedImage(editor) {
  editor.chain().focus().deleteSelection().run();
}

function getScrollTarget(wrapper) {
  if (!wrapper || typeof wrapper.get !== 'function') {
    return undefined;
  }

  return wrapper.get(0) || undefined;
}

export function initializeLinkBubbleMenu(wrapper, editor, siteLinkTool, mediaTool) {
  wrapper.data('editor', editor);
  wrapper.data('siteLinkTool', siteLinkTool);
  wrapper.data('mediaTool', mediaTool);

  const proseMirror = wrapper.find('.tiptap-link-bubble-menu');
  if (proseMirror.length === 0) {
    return;
  }

  const proseMirrorElement = proseMirror[0];
  const hoverState = { lastHref: null };

  const handlePointerMove = (event) => {
    if (event.buttons) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const anchor = target.closest('a[href]');
    if (!anchor || !proseMirrorElement.contains(anchor)) {
      return;
    }

    const href = (anchor.getAttribute('href') || '').trim();
    if (!href || hoverState.lastHref === href) {
      return;
    }

    hoverState.lastHref = href;

    const anchorPos = editor.view.posAtDOM(anchor, 0);
    if (typeof anchorPos !== 'number') {
      return;
    }

    editor.chain().focus().setTextSelection(anchorPos).extendMarkRange('link').run();
    updateLinkBubbleMenu(wrapper, editor);
  };

  const handleMouseLeave = () => {
    hoverState.lastHref = null;
  };

  proseMirrorElement.addEventListener('pointermove', handlePointerMove);
  proseMirrorElement.addEventListener('mouseleave', handleMouseLeave);

  editor.on('selectionUpdate', ({ editor }) => {
    updateLinkBubbleMenu(wrapper, editor);
  });

  wrapper.data('tiptap-link-bubble-guard', {
    proseMirrorElement,
    handlePointerMove,
    handleMouseLeave,
  });

  updateLinkBubbleMenu(wrapper, editor);
}

export function initializeImageBubbleMenu(wrapper, editor, mediaTool) {
  wrapper.data('editor', editor);
  wrapper.data('mediaTool', mediaTool);

  const proseMirror = wrapper.find('.tiptap-image-bubble-menu');
  if (proseMirror.length === 0) {
    return;
  }

  const proseMirrorElement = proseMirror[0];

  editor.on('selectionUpdate', ({ editor }) => {
    updateImageBubbleMenu(wrapper, editor);
  });

  wrapper.data('tiptap-image-bubble-guard', {
    proseMirrorElement,
  });

  updateImageBubbleMenu(wrapper, editor);
}

export function cleanupLinkBubbleMenu(wrapper) {
  const guard = wrapper.data('tiptap-link-bubble-guard');
  if (!guard) {
    return;
  }

  if (guard.proseMirrorElement) {
    guard.proseMirrorElement.removeEventListener('pointermove', guard.handlePointerMove);
    guard.proseMirrorElement.removeEventListener('mouseleave', guard.handleMouseLeave);
  }

  wrapper.removeData('tiptap-link-bubble-guard');
}

export function cleanupImageBubbleMenu(wrapper) {
  const guard = wrapper.data('tiptap-image-bubble-guard');
  if (!guard) {
    return;
  }

  wrapper.removeData('tiptap-image-bubble-guard');
}

function createLinkBubbleMenu(wrapper) {
  const existing = wrapper.find('.tiptap-link-bubble-menu');
  if (existing.length > 0) {
    return existing.get(0);
  }

  const menu = $(`
          <div class="tiptap-link-bubble-menu" aria-label="Link actions">
            <span class="link-type-badge" data-link-type="raw">Link</span>
            <button type="button" class="link-edit">Edit link</button>
            <button type="button" class="link-remove">Remove</button>
          </div>
        `);

  wrapper.append(menu);

  menu.on('mousedown', (event) => {
    event.preventDefault();
  });

  menu.on('click', '.link-edit', (event) => {
    console.log('click edit?');
    const editor = wrapper.data('editor');
    event.preventDefault();
    const siteLinkTool = wrapper.data('siteLinkTool');
    openLinkEditorForSelection(editor, siteLinkTool);
    updateLinkBubbleMenu(wrapper, editor);
  });

  menu.on('click', '.link-remove', (event) => {
    console.log('click remove?');
    const editor = wrapper.data('editor');
    event.preventDefault();
    editor.chain().focus().unsetLink().run();
    updateLinkBubbleMenu(wrapper, editor);
  });

  menu.css('position', 'absolute');
  menu.css('left', '-10000px');

  return menu.get(0);
}

function createImageBubbleMenu(wrapper) {
  const existing = wrapper.find('.tiptap-image-bubble-menu');
  if (existing.length > 0) {
    return existing.get(0);
  }

  const menu = $(`
          <div class="tiptap-image-bubble-menu" aria-label="Image actions">
            <button type="button" class="image-edit">Edit</button>
            <button type="button" class="image-remove">Delete</button>
          </div>
        `);

  wrapper.append(menu);

  menu.on('mousedown', (event) => {
    event.preventDefault();
  });

  menu.on('click', '.image-edit', (event) => {
    
    console.log('image edit?');
    const editor = wrapper.data('editor');
    const mediaTool = wrapper.data('mediaTool');
    event.preventDefault();
    openImageEditorForSelection(editor, mediaTool);
    updateImageBubbleMenu(wrapper, editor);
  });

  menu.on('click', '.image-remove', (event) => {
    const editor = wrapper.data('editor');
    console.log('image remove?');
    event.preventDefault();
    deleteSelectedImage(editor);
    updateImageBubbleMenu(wrapper, editor);
  });

  menu.css('position', 'absolute');
  menu.css('left', '-10000px');

  return menu.get(0);
}

export function linkbubbletool(wrapper) {
  return BubbleMenu.configure({
    element: createLinkBubbleMenu(wrapper),
    pluginKey: 'linkBubbleMenu',
    scrollTarget: getScrollTarget(wrapper),

    shouldShow: ({ editor, state }) => {
      return shouldShowLinkBubbleMenu(editor);
    },
  })
}

export function imagebubbletool(wrapper) {
  return BubbleMenu.configure({
    element: createImageBubbleMenu(wrapper),
    pluginKey: 'imageBubbleMenu',
    scrollTarget: getScrollTarget(wrapper),

    shouldShow: ({ editor, state }) => {
      return shouldShowImageBubbleMenu(editor);
    },
  })
}