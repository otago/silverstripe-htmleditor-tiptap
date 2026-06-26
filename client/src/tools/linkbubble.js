// rebecca wanted the bubble menu for links just like tinyMCE
import BubbleMenu from '@tiptap/extension-bubble-menu';


export function shouldShowLinkBubbleMenu(editor) {
  const href = (editor.getAttributes('link').href || '').trim();
  return Boolean(href);
};

function isSilverStripeSiteTreeHref(href) {
  if (typeof href !== 'string') {
    return false;
  }

  return /^\[sitetree_link,id=\d+\]$/.test(href.trim());
};

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
};

function openLinkEditorForSelection(editor, siteLinkTool) {
  const currentLink = editor.getAttributes('link');
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
};

export function initializeLinkBubbleMenu(wrapper, editor, siteLinkTool) {
  wrapper.data('editor', editor);
  wrapper.data('siteLinkTool', siteLinkTool);

  const proseMirror = wrapper.find('.tiptap-link-bubble-menu');
  if (proseMirror.length === 0) {
    return;
  }

  const self = this;
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
    handleMouseLeave
  });

  updateLinkBubbleMenu(wrapper, editor);
};

export function cleanupLinkBubbleMenu(wrapper) {
  const guard = wrapper.data('tiptap-link-bubble-guard');
  if (!guard) {
    return;
  }

  if (guard.proseMirrorElement) {
    guard.proseMirrorElement.removeEventListener('pointermove', guard.handlePointerMove);
    guard.proseMirrorElement.removeEventListener('mouseleave', guard.handleMouseLeave);
  }

  if (guard.menu) {
    guard.menu.off('mousedown');
    guard.menu.off('click', '.link-edit');
    guard.menu.off('click', '.link-remove');
  }

  wrapper.removeData('tiptap-link-bubble-guard');
};


function createLinkBubbleMenu(wrapper) {
  const existing = wrapper.find('.tiptap-link-bubble-menu');
  if (existing.length > 0) {
    return existing;
  }

  const menu = $(`
          <div class="tiptap-link-bubble-menu" aria-label="Link actions">
            <span class="link-type-badge" data-link-type="raw">Link</span>
            <button type="button" class="link-edit">Edit link</button>
            <button type="button" class="link-remove">Remove</button>
          </div>
        `);

  wrapper.append(menu);

  // Keep selection stable while interacting with the bubble menu.
  menu.on('mousedown', (event) => {
    event.preventDefault();
  });

  menu.on('click', '.link-edit', (event) => {
    const editor = wrapper.data('editor');
    event.preventDefault();
    const siteLinkTool = wrapper.data('siteLinkTool');
    openLinkEditorForSelection(editor, siteLinkTool);
    updateLinkBubbleMenu(wrapper, editor);
  });

  menu.on('click', '.link-remove', (event) => {
    const editor = wrapper.data('editor');
    event.preventDefault();
    editor.chain().focus().unsetLink().run();
    updateLinkBubbleMenu(wrapper, editor);
  });


  return menu.get(0);
};

export function linkbubbletool(wrapper) {
  return BubbleMenu.configure({
    element: createLinkBubbleMenu(wrapper),

    shouldShow: ({ editor, state }) => {
      return shouldShowLinkBubbleMenu(editor);
    },
  })
};