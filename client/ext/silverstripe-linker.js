/**
 * SilverStripe Link Extension for TipTap
 * 
 * This extension provides a SilverStripe-aware link dialog that can:
 * - Link to internal pages
 * - Link to files in the asset admin
 * - Link to external URLs
 * - Use SilverStripe's link dialog if available
 */

// Initialize the TipTapExtensions namespace if it doesn't exist
if (!window.TipTapExtensions) {
    window.TipTapExtensions = {};
}

const $ = window.jQuery;
window.TipTapExtensions['ss-link'] = {

    /**
     * Initialize the extension
     * @param {Editor} editor - TipTap editor instance
     * @param {Object} config - TipTap configuration
     * @param {Object} tiptapInstance - TipTap entwine instance
     */
    init: function (editor, config, tiptapInstance) {
        console.log('SilverStripe Link Extension initialized');

        // Store references for later use
        this.editor = editor;
        this.config = config;
        this.tiptapInstance = tiptapInstance;

        // Check if SilverStripe link dialog is available
        this.hasSilverStripeDialog = typeof window.jQuery !== 'undefined' &&
            window.jQuery.entwine &&
            window.jQuery.entwine.namespaces.ss;
    },

    /**
     * Create the toolbar button
     * @param {Editor} editor - TipTap editor instance
     * @param {Object} config - TipTap configuration
     * @param {Object} tiptapInstance - TipTap entwine instance
     * @returns {jQuery} Button element
     */
    createButton: function (editor, config, tiptapInstance) {
        const self = this;
        // Ensure $ is defined as jQuery
        const button = $('<button type="button" data-action="ss-link">create button here?</button>');

        // Add SVG icon for link
        button.append(`
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
      </svg>
    `);

        // Add tooltip
        tiptapInstance.addTooltip(button, config.tooltips?.link || 'Insert Link (Ctrl+K)');

        // Handle button click
        button.on('click', (e) => {
            e.preventDefault();
            console.log('TipTap: SilverStripe linker button clicked');

            if (button.hasClass('disabled')) {
                console.log('TipTap: SilverStripe linker button is disabled, ignoring click');
                return;
            }

            console.log('TipTap: Opening SilverStripe link dialog');
            self.openLinkDialog(editor);
        });

        return button;
    },

    /**
     * Open the link dialog
     * @param {Editor} editor - TipTap editor instance
     */
    openLinkDialog: function (editor) {
        console.log('TipTap: SilverStripe linker openLinkDialog called');
        
        // Get current selection and link attributes
        const { from, to } = editor.state.selection;
        const currentLink = editor.getAttributes('link');
        const selectedText = editor.state.doc.textBetween(from, to);

        console.log('TipTap: Link dialog - current selection:', { from, to, currentLink, selectedText });

        if (this.hasSilverStripeDialog && this.tryOpenSilverStripeDialog(editor, currentLink, selectedText)) {
            // SilverStripe dialog opened successfully
            console.log('TipTap: SilverStripe dialog opened successfully');
            return;
        }

        // Fallback to simple dialog
        console.log('TipTap: Opening simple link dialog');
        this.openSimpleDialog(editor, currentLink, selectedText);
    },

    /**
     * Try to open SilverStripe's link dialog
     * @param {Editor} editor - TipTap editor instance
     * @param {Object} currentLink - Current link attributes
     * @param {String} selectedText - Currently selected text
     * @returns {Boolean} Whether the dialog was opened
     */
    tryOpenSilverStripeDialog: function (editor, currentLink, selectedText) {
        try {
            // Check if we can access SilverStripe's link dialog
            if (window.jQuery && window.jQuery.entwine) {
                // Create a temporary form field to trigger the link dialog
                const tempField = $('<input type="text" class="link-dialog-trigger" style="display:none;">');
                $('body').append(tempField);

                // Set up the link dialog callback
                tempField.data('link-callback', (result) => {
                    this.handleLinkResult(editor, result, selectedText);
                    tempField.remove();
                });

                // Trigger SilverStripe link dialog if available
                if (tempField.entwine && typeof tempField.openLinkDialog === 'function') {
                    tempField.openLinkDialog();
                    return true;
                }

                tempField.remove();
            }
        } catch (e) {
            console.warn('Could not open SilverStripe link dialog:', e);
        }

        return false;
    },

    /**
     * Open a simple link dialog
     * @param {Editor} editor - TipTap editor instance
     * @param {Object} currentLink - Current link attributes
     * @param {String} selectedText - Currently selected text
     */
    openSimpleDialog: function (editor, currentLink, selectedText) {
        // Create simple dialog
        const dialogHtml = `
      <div id="ss-link-dialog" style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 20px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 9999;
        min-width: 400px;
      ">
        <h3>Insert Link</h3>
        <div style="margin-bottom: 15px;">
          <label for="link-url" style="display: block; margin-bottom: 5px;">URL:</label>
          <input type="text" id="link-url" value="${currentLink.href || ''}" 
                 style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 3px;">
        </div>
        <div style="margin-bottom: 15px;">
          <label for="link-text" style="display: block; margin-bottom: 5px;">Link Text:</label>
          <input type="text" id="link-text" value="${selectedText || ''}" 
                 style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 3px;">
        </div>
        <div style="margin-bottom: 15px;">
          <label>
            <input type="checkbox" id="link-target" ${currentLink.target === '_blank' ? 'checked' : ''}> 
            Open in new window
          </label>
        </div>
        <div style="text-align: right;">
          <button id="link-cancel" style="margin-right: 10px; padding: 8px 16px; border: 1px solid #ccc; background: white; border-radius: 3px; cursor: pointer;">Cancel</button>
          <button id="link-insert" style="padding: 8px 16px; border: none; background: #0071c1; color: white; border-radius: 3px; cursor: pointer;">Insert Link</button>
          ${currentLink.href ? '<button id="link-remove" style="margin-left: 10px; padding: 8px 16px; border: 1px solid #d32f2f; background: white; color: #d32f2f; border-radius: 3px; cursor: pointer;">Remove Link</button>' : ''}
        </div>
      </div>
      <div id="ss-link-backdrop" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 9998;
      "></div>
    `;

        $('body').append(dialogHtml);

        // Focus URL field
        $('#link-url').focus().select();

        // Handle dialog events
        $('#link-insert').on('click', () => {
            const url = $('#link-url').val().trim();
            const text = $('#link-text').val().trim();
            const target = $('#link-target').is(':checked') ? '_blank' : null;

            if (url) {
                this.insertLink(editor, url, text, target);
            }

            this.closeDialog();
        });

        $('#link-remove').on('click', () => {
            this.removeLink(editor);
            this.closeDialog();
        });

        $('#link-cancel, #ss-link-backdrop').on('click', () => {
            this.closeDialog();
        });

        // Handle Enter key
        $('#link-url, #link-text').on('keypress', (e) => {
            if (e.which === 13) {
                $('#link-insert').click();
            }
        });

        // Handle Escape key
        $(document).on('keydown.ss-link', (e) => {
            if (e.which === 27) {
                this.closeDialog();
            }
        });
    },

    /**
     * Handle link result from SilverStripe dialog
     * @param {Editor} editor - TipTap editor instance
     * @param {Object} result - Link result from SilverStripe
     * @param {String} selectedText - Currently selected text
     */
    handleLinkResult: function (editor, result, selectedText) {
        if (result && result.href) {
            this.insertLink(editor, result.href, result.text || selectedText, result.target);
        }
    },

    /**
     * Insert or update a link
     * @param {Editor} editor - TipTap editor instance
     * @param {String} url - Link URL
     * @param {String} text - Link text
     * @param {String} target - Link target
     */
    insertLink: function (editor, url, text, target) {
        const linkAttrs = { href: url };
        if (target) {
            linkAttrs.target = target;
        }

        if (text && text !== editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to)) {
            // Insert new text with link
            editor.chain()
                .focus()
                .insertContent({
                    type: 'text',
                    marks: [{ type: 'link', attrs: linkAttrs }],
                    text: text
                })
                .run();
        } else {
            // Apply link to selection or insert link
            if (editor.state.selection.empty) {
                editor.chain()
                    .focus()
                    .insertContent({
                        type: 'text',
                        marks: [{ type: 'link', attrs: linkAttrs }],
                        text: text || url
                    })
                    .run();
            } else {
                editor.chain()
                    .focus()
                    .setLink(linkAttrs)
                    .run();
            }
        }
    },

    /**
     * Remove link from selection
     * @param {Editor} editor - TipTap editor instance
     */
    removeLink: function (editor) {
        editor.chain().focus().unsetLink().run();
    },

    /**
     * Close the dialog
     */
    closeDialog: function () {
        $('#ss-link-dialog, #ss-link-backdrop').remove();
        $(document).off('keydown.ss-link');
    },

    /**
     * Check if button should be active
     * @param {Editor} editor - TipTap editor instance
     * @returns {Boolean}
     */
    isActive: function (editor) {
        return editor.isActive('link');
    },

    /**
     * Check if button should be disabled
     * @param {Editor} editor - TipTap editor instance
     * @returns {Boolean}
     */
    isDisabled: function (editor) {
        return !editor.can().setLink({ href: '#' });
    }
};
