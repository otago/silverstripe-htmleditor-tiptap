class HtmlSourceModeHelper {
  attachKeyGuard(wrapper, htmlTextarea, dispatchReduxFormChange) {
    const htmlSourceElement = htmlTextarea[0];
    const handleHtmlSourceKeyEvent = (event) => {
      // we're way more proactive pumping changes back to the main editor. authors were
      // trying to save directly while in HTML view
      dispatchReduxFormChange(htmlTextarea.val());
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }
    };

    ['keydown', 'keyup', 'keypress', 'input'].forEach((type) => {
      htmlSourceElement.addEventListener(type, handleHtmlSourceKeyEvent, true);
    });

    wrapper.data('html-source-key-guard', {
      element: htmlSourceElement,
      handler: handleHtmlSourceKeyEvent,
    });
  }

  detachKeyGuard(wrapper) {
    const htmlSourceKeyGuard = wrapper.data('html-source-key-guard');
    if (htmlSourceKeyGuard && htmlSourceKeyGuard.element && htmlSourceKeyGuard.handler) {
      ['keydown', 'keyup', 'keypress', 'input'].forEach((type) => {
        htmlSourceKeyGuard.element.removeEventListener(type, htmlSourceKeyGuard.handler, true);
      });
    }
    wrapper.removeData('html-source-key-guard');
  }

  formatHtmlForSourceView(html) {
    if (!html || typeof html !== 'string') {
      return '';
    }

    const voidElements = new Set([
      'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
      'link', 'meta', 'param', 'source', 'track', 'wbr',
    ]);
    const blockElements = new Set([
      'article', 'aside', 'blockquote', 'div', 'dl', 'dt', 'dd', 'fieldset', 'figure',
      'figcaption', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header',
      'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'tbody', 'td',
      'tfoot', 'th', 'thead', 'tr', 'ul',
    ]);
    const preserveWhitespace = new Set(['pre', 'code', 'textarea']);
    const indentUnit = '  ';
    const container = document.createElement('div');
    container.innerHTML = html;

    const formatAttributes = (element) => {
      if (!element.attributes || !element.attributes.length) {
        return '';
      }

      const attrs = [];
      for (let i = 0; i < element.attributes.length; i++) {
        const attribute = element.attributes[i];
        const value = String(attribute.value).replace(/"/g, '&quot;');
        attrs.push(`${attribute.name}="${value}"`);
      }

      return attrs.length ? ` ${attrs.join(' ')}` : '';
    };

    const formatNode = (node, depth, preserveText) => {
      const indent = indentUnit.repeat(depth);

      if (node.nodeType === Node.TEXT_NODE) {
        const rawText = node.textContent || '';
        const text = preserveText ? rawText : rawText.replace(/\s+/g, ' ').trim();
        return text ? `${indent}${text}\n` : '';
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
      }

      const tag = node.tagName.toLowerCase();
      const attrs = formatAttributes(node);

      if (voidElements.has(tag)) {
        return `${indent}<${tag}${attrs}>\n`;
      }

      const childNodes = Array.from(node.childNodes || []);
      const nextPreserveText = preserveText || preserveWhitespace.has(tag);
      const isBlockElement = blockElements.has(tag);
      const hasBlockChildren = childNodes.some(
        (child) => child.nodeType === Node.ELEMENT_NODE && blockElements.has(child.tagName.toLowerCase())
      );

      if (!isBlockElement || !hasBlockChildren) {
        const inlineContent = childNodes
          .map((child) => {
            if (child.nodeType === Node.TEXT_NODE) {
              const rawText = child.textContent || '';
              return nextPreserveText ? rawText : rawText.replace(/\s+/g, ' ').trim();
            }

            return formatNode(child, 0, nextPreserveText).trim();
          })
          .filter(Boolean)
          .join('');

        if (!inlineContent) {
          return `${indent}<${tag}${attrs}></${tag}>\n`;
        }

        return `${indent}<${tag}${attrs}>${inlineContent}</${tag}>\n`;
      }

      let output = `${indent}<${tag}${attrs}>\n`;
      childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const rawText = child.textContent || '';
          const text = nextPreserveText ? rawText : rawText.replace(/\s+/g, ' ').trim();
          if (text) {
            output += `${indentUnit.repeat(depth + 1)}${text}\n`;
          }
          return;
        }

        if (child.nodeType === Node.ELEMENT_NODE && !blockElements.has(child.tagName.toLowerCase())) {
          const inlineChild = formatNode(child, 0, nextPreserveText).trim();
          if (inlineChild) {
            output += `${indentUnit.repeat(depth + 1)}${inlineChild}\n`;
          }
          return;
        }

        output += formatNode(child, depth + 1, nextPreserveText);
      });
      output += `${indent}</${tag}>\n`;
      return output;
    };

    let formatted = '';
    Array.from(container.childNodes || []).forEach((child) => {
      formatted += formatNode(child, 0, false);
    });

    return formatted.trim() || html;
  }
}

const helper = new HtmlSourceModeHelper();

export function enterHtmlSource(editor, wrapper, context) {
  const {
    $,
    constants,
    autoResizeTextarea,
    dispatchReduxFormChange,
  } = context;
  const proseMirrorElement = wrapper.find(`.${constants.CSS_CLASSES.PROSEMIRROR}`);
  const currentHtml = editor.getHTML();
  const formattedHtml = helper.formatHtmlForSourceView(currentHtml);

  const htmlTextarea = $(`<textarea class="${constants.CSS_CLASSES.HTML_TEXTAREA}"></textarea>`);
  htmlTextarea.val(formattedHtml);

  proseMirrorElement.hide();
  proseMirrorElement.after(htmlTextarea);

  wrapper.addClass(constants.CSS_CLASSES.HTML_SOURCE);

  autoResizeTextarea(htmlTextarea);
  // htmlTextarea.on('input', () => {
  //   console.log('on input', htmlTextarea.val());
  //   dispatchReduxFormChange(htmlTextarea.val());
  // });
  helper.attachKeyGuard(wrapper, htmlTextarea, dispatchReduxFormChange);

  htmlTextarea.focus();

  wrapper.data('html-textarea', htmlTextarea);
  wrapper.data('html-source-original', currentHtml);
  wrapper.data('html-source-formatted', formattedHtml);
}

export function exitHtmlSource(editor, wrapper, context) {
  const { constants, normalizeContent, dispatchReduxFormChange } = context;
  const proseMirrorElement = wrapper.find(`.${constants.CSS_CLASSES.PROSEMIRROR}`);
  const htmlTextarea = wrapper.data('html-textarea');
  const originalHtml = wrapper.data('html-source-original');
  const formattedOriginalHtml = wrapper.data('html-source-formatted');

  if (htmlTextarea) {
    const htmlContent = htmlTextarea.val();
    const sourceHtml = htmlContent === formattedOriginalHtml ? (originalHtml || htmlContent) : htmlContent;
    const normalizedHtmlContent = normalizeContent(sourceHtml);

    editor.commands.setContent(normalizedHtmlContent);

    htmlTextarea.remove();
    wrapper.removeData('html-textarea');
  }

  helper.detachKeyGuard(wrapper);

  wrapper.removeData('html-source-original');
  wrapper.removeData('html-source-formatted');

  proseMirrorElement.show();
  wrapper.removeClass(constants.CSS_CLASSES.HTML_SOURCE);

  editor.commands.focus();
  dispatchReduxFormChange(editor.getHTML());
}


// this used to be Ctrl+Shift+H, but i removed it. see addKeyboardShortcuts in the extension for details.
export function toggleHtmlSource(editor, button, context) {
  const { constants } = context;
  const wrapper = button.closest(`.${constants.CSS_CLASSES.WRAPPER}`);
  const isHtmlMode = wrapper.hasClass(constants.CSS_CLASSES.HTML_SOURCE);

  if (isHtmlMode) {
    exitHtmlSource(editor, wrapper, context);
  } else {
    enterHtmlSource(editor, wrapper, context);
  }
}

const htmlSourceTool = {
  action: 'htmlSource',
  getToolbarConfig({ tooltips }) {
    return {
      type: 'button',
      title: tooltips.htmlSource || 'HTML Source',
      action: 'htmlSource',
      extension: 'custom',
    };
  },
  run({ editor, button, context }) {
    toggleHtmlSource(editor, button, context);
  },
  isActive(editor) {
    return !!$(editor.view.dom).siblings('textarea').length;
  },
  isDisabled(editor) {
    return false;
  },
};

export default htmlSourceTool;
