import sanitizeHtml from 'sanitize-html';

const SANITIZE_OPTIONS = {
  allowedTags: [
    'p', 'br',
    'strong', 'em', 'u', 's',
    'ul', 'ol', 'li',
    'blockquote', 'code', 'pre',
    'a',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'img',
    'hr',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel', 'title', 'id'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    th: ['colspan', 'rowspan'],
    td: ['colspan', 'rowspan'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  transformTags: {
    b: 'strong',
    i: 'em',
  },
  textFilter: (text) => text.replace(/\u00a0/g, ' '),
};

function stripWordArtifacts(html) {
  if (!html) {
    return '';
  }

  return String(html)
    .replace(/<\/?o:[^>]*>/gi, '')
    .replace(/<!--\[if [\s\S]*?<!\[endif\]-->/gi, '')
    .replace(/<\?xml[^>]*>/gi, '')
    .replace(/<\/?(?:meta|link|style|script|title|head)[^>]*>/gi, '')
    .replace(/\sstyle=("[^"]*mso-[^"]*"|'[^']*mso-[^']*')/gi, '')
    .replace(/\sclass=("[^"]*\bMso[^\"]*"|'[^']*\bMso[^']*')/gi, '');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function ensureModalStyles() {
  if (document.getElementById('tiptap-paste-modal-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'tiptap-paste-modal-styles';
  style.textContent = `
    .tiptap-paste-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .tiptap-paste-modal {
      width: min(760px, 100%);
      max-height: min(88vh, 760px);
      background: #fff;
      border-radius: 10px;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.25);
      display: grid;
      grid-template-rows: auto 1fr auto;
      overflow: hidden;
    }
    .tiptap-paste-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      border-bottom: 1px solid #e5e7eb;
    }
    .tiptap-paste-modal-title {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #111827;
    }
    .tiptap-paste-modal-close {
      border: 0;
      background: transparent;
      font-size: 24px;
      line-height: 1;
      color: #6b7280;
      cursor: pointer;
      padding: 0;
    }
    .tiptap-paste-modal-body {
      padding: 14px 16px;
      overflow: auto;
      display: grid;
      gap: 10px;
    }
    .tiptap-paste-help {
      margin: 0;
      color: #374151;
      font-size: 13px;
      line-height: 1.35;
    }
    .tiptap-paste-area {
      min-height: 220px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px;
      background: #fff;
      overflow: auto;
      outline: none;
      font-size: 14px;
      line-height: 1.5;
    }
    .tiptap-paste-area:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
    }
    .tiptap-paste-modal-error {
      color: #b91c1c;
      font-size: 13px;
      margin: 0;
      min-height: 18px;
    }
    .tiptap-paste-modal-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      border-top: 1px solid #e5e7eb;
      background: #f9fafb;
    }
    .tiptap-paste-actions {
      display: flex;
      gap: 8px;
    }
    .tiptap-paste-btn {
      border: 1px solid #d1d5db;
      background: #fff;
      color: #111827;
      border-radius: 6px;
      font-size: 13px;
      line-height: 1;
      padding: 9px 12px;
      cursor: pointer;
    }
    .tiptap-paste-btn-primary {
      background: #2563eb;
      border-color: #1d4ed8;
      color: #fff;
    }
  `;

  document.head.appendChild(style);
}

function createPasteModal() {
  const overlay = document.createElement('div');
  overlay.className = 'tiptap-paste-modal-overlay';

  overlay.innerHTML = `
    <div class="tiptap-paste-modal" role="dialog" aria-modal="true" aria-label="Paste from Word">
      <div class="tiptap-paste-modal-header">
        <h3 class="tiptap-paste-modal-title">Paste From Word</h3>
        <button type="button" class="tiptap-paste-modal-close" aria-label="Close">&times;</button>
      </div>
      <div class="tiptap-paste-modal-body">
        <p class="tiptap-paste-help">Paste your content from Microsoft Word into the box below. We will keep native formatting like bold, italics, headings, and lists while removing Word-specific markup.</p>
        <div class="tiptap-paste-area" contenteditable="true"></div>
        <p class="tiptap-paste-modal-error" aria-live="polite"></p>
      </div>
      <div class="tiptap-paste-modal-footer">
        <button type="button" class="tiptap-paste-btn" data-action="clear">Clear</button>
        <div class="tiptap-paste-actions">
          <button type="button" class="tiptap-paste-btn" data-action="cancel">Cancel</button>
          <button type="button" class="tiptap-paste-btn tiptap-paste-btn-primary" data-action="insert">Insert</button>
        </div>
      </div>
    </div>
  `;

  return overlay;
}

export function sanitizePastedHtml(html) {
  const stripped = stripWordArtifacts(html);
  if (!stripped) {
    return '';
  }

  return sanitizeHtml(stripped, SANITIZE_OPTIONS).trim();
}

const pasteTool = {
  action: 'paste',

  getToolbarConfig({ tooltips }) {
    return {
      type: 'button',
      title: tooltips.paste || 'Paste From Word',
      action: 'paste',
      extension: 'paste',
    };
  },

  run({ editor }) {
    ensureModalStyles();

    const overlay = createPasteModal();
    const pasteArea = overlay.querySelector('.tiptap-paste-area');
    const errorNode = overlay.querySelector('.tiptap-paste-modal-error');

    const closeModal = () => {
      overlay.remove();
    };

    const setError = (message) => {
      errorNode.textContent = message || '';
    };

    overlay.querySelector('.tiptap-paste-modal-close').addEventListener('click', closeModal);
    overlay.querySelector('[data-action="cancel"]').addEventListener('click', closeModal);
    overlay.querySelector('[data-action="clear"]').addEventListener('click', () => {
      pasteArea.innerHTML = '';
      setError('');
      pasteArea.focus();
    });

    overlay.querySelector('[data-action="insert"]').addEventListener('click', () => {
      const rawHtml = pasteArea.innerHTML || '';
      const rawText = (pasteArea.textContent || '').trim();
      let sanitized = sanitizePastedHtml(rawHtml);

      if (!sanitized && rawText) {
        sanitized = `<p>${escapeHtml(rawText)}</p>`;
      }

      if (!sanitized) {
        setError('Paste some content first.');
        return;
      }

      editor.chain().focus().insertContent(sanitized).run();
      closeModal();
    });

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        closeModal();
      }
    });

    document.body.appendChild(overlay);
    pasteArea.focus();
  },

  isActive() {
    return false;
  },

  isDisabled() {
    return false;
  },
};

export default pasteTool;
