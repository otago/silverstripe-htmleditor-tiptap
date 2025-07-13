/**
 * SilverStripe External Link Extension for TipTap
 * 
 * This extension provides linking to external URLs
 */

// Initialize the TipTapExtensions namespace if it doesn't exist
if (!window.TipTapExtensions) {
    window.TipTapExtensions = {};
}

//const $ = window.jQuery;
window.TipTapExtensions['ss-link-ext'] = {

    /**
     * Initialize the extension
     * @param {Editor} editor - TipTap editor instance
     * @param {Object} config - TipTap configuration
     * @param {Object} tiptapInstance - TipTap entwine instance
     */
    init: function (editor, config, tiptapInstance) {
        // Store references for later use
        this.editor = editor;
        this.config = config;
        this.tiptapInstance = tiptapInstance;
    },


    /**
     * Handle click event
     * @param {Editor} editor - TipTap editor instance
     * @param {Object} config - TipTap configuration
     * @param {Object} tiptapInstance - TipTap entwine instance
     */
    onClick: function (editor, config, tiptapInstance) {
        // Check if text is selected
        const { from, to } = editor.state.selection;
        const selectedText = editor.state.doc.textBetween(from, to, '');

        this.openExternalLinkDialog(editor, selectedText);
    },

    /**
     * Open external link dialog
     * @param {Editor} editor - TipTap editor instance
     * @param {string} selectedText - Currently selected text
     */
    openExternalLinkDialog: function (editor, selectedText) {
        // Get current link if cursor is on one
        const currentLink = editor.getAttributes('link');
        
        // Create a more sophisticated dialog
        const dialog = this.createDialog(currentLink.href || '', selectedText);
        
        // Set up smart detection for existing relative/anchor links
        this.setupSmartDetection(dialog, currentLink.href || '');
        
        // If editing an existing link, populate the checkboxes
        if (currentLink.target === '_blank') {
            dialog.find('input[name="target"]').prop('checked', true);
        }
        
        // Handle dialog submission
        dialog.find('form').on('submit', (e) => {
            e.preventDefault();
            
            const url = dialog.find('input[name="url"]').val();
            const text = dialog.find('input[name="text"]').val();
            const openInNewTab = dialog.find('input[name="target"]').is(':checked');
            const isRelative = dialog.find('input[name="relative"]').is(':checked');
            
            if (url) {
                // Validate URL before creating link
                if (this.validateUrl(url, isRelative, dialog)) {
                    this.createLink(editor, url, text, openInNewTab, isRelative);
                    dialog.remove();
                }
            } else {
                // Remove link if URL is empty
                editor.chain().focus().unsetLink().run();
                dialog.remove();
            }
        });
        
        // Handle insert button click
        dialog.find('.external-link-insert').on('click', (e) => {
            e.preventDefault();
            dialog.find('form').trigger('submit');
        });
        
        // Handle cancel
        dialog.find('.external-link-cancel, .external-link-modal-close').on('click', () => {
            dialog.remove();
        });
        
        // Close on overlay click
        dialog.find('.external-link-modal-overlay').on('click', function (e) {
            if (e.target === this) {
                dialog.remove();
            }
        });
        
        // Show dialog
        $('body').append(dialog);
        
        // Focus the URL input
        dialog.find('#external-link-url').focus();
    },

    /**
     * Create dialog HTML
     * @param {string} currentUrl - Current URL value
     * @param {string} selectedText - Selected text
     * @returns {jQuery} Dialog element
     */
    createDialog: function (currentUrl, selectedText) {
        // Add CSS styles first
        this.addModalStyles();
        
        const dialogHtml = `
            <div class="external-link-modal-overlay">
                <div class="external-link-modal">
                    <div class="external-link-modal-header">
                        <h3>Add External Link</h3>
                        <button class="external-link-modal-close" type="button">&times;</button>
                    </div>
                    <div class="external-link-modal-body">
                        <form>
                            <div class="form-group">
                                <label for="external-link-url">URL:</label>
                                <input type="url" id="external-link-url" name="url" value="${currentUrl}" class="form-control" placeholder="https://example.com or /relative-path or #anchor" required>
                            </div>
                            <div class="form-group">
                                <label for="external-link-text">Link Text:</label>
                                <input type="text" id="external-link-text" name="text" value="${selectedText}" class="form-control" placeholder="Link text">
                            </div>
                            <div class="form-group">
                                <div class="checkbox-wrapper">
                                    <label>
                                        <input type="checkbox" name="relative"> Relative/anchor link (e.g., /my-route or #anchor)
                                    </label>
                                </div>
                            </div>
                            <div class="form-group">
                                <div class="checkbox-wrapper">
                                    <label>
                                        <input type="checkbox" name="target"> Open in new tab
                                    </label>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="external-link-modal-footer">
                        <button type="button" class="btn btn-secondary external-link-cancel">Cancel</button>
                        <button type="submit" class="btn btn-primary external-link-insert">Add Link</button>
                    </div>
                </div>
            </div>
        `;
        
        return $(dialogHtml);
    },

    /**
     * Add CSS styles for the modal
     */
    addModalStyles: function () {
        if ($('#external-link-modal-styles').length === 0) {
            const styles = `
                <style id="external-link-modal-styles">
                    .external-link-modal-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0, 0, 0, 0.5);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 10000;
                    }
                    .external-link-modal {
                        background: white;
                        border-radius: 8px;
                        width: 90%;
                        max-width: 500px;
                        max-height: 90vh;
                        overflow: hidden;
                        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                    }
                    .external-link-modal-header {
                        padding: 15px 20px;
                        border-bottom: 1px solid #e0e0e0;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .external-link-modal-header h3 {
                        margin: 0;
                        font-size: 18px;
                        color: #333;
                    }
                    .external-link-modal-close {
                        background: none;
                        border: none;
                        font-size: 24px;
                        cursor: pointer;
                        color: #666;
                        padding: 0;
                        width: 30px;
                        height: 30px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .external-link-modal-close:hover {
                        color: #333;
                    }
                    .external-link-modal-body {
                        padding: 20px;
                        max-height: 60vh;
                        overflow-y: auto;
                    }
                    .external-link-modal-footer {
                        padding: 15px 20px;
                        border-top: 1px solid #e0e0e0;
                        display: flex;
                        justify-content: flex-end;
                        gap: 10px;
                    }
                    .form-group {
                        margin-bottom: 15px;
                    }
                    .form-group label {
                        display: block;
                        margin-bottom: 5px;
                        font-weight: 500;
                        color: #333;
                    }
                    .form-control {
                        width: 100%;
                        padding: 8px 12px;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        font-size: 14px;
                        box-sizing: border-box;
                    }
                    .form-control:focus {
                        outline: none;
                        border-color: #007cba;
                        box-shadow: 0 0 0 2px rgba(0, 124, 186, 0.1);
                    }
                    .checkbox-wrapper {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    .checkbox-wrapper label {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        cursor: pointer;
                        font-weight: normal;
                        margin-bottom: 0;
                    }
                    .checkbox-wrapper input[type="checkbox"] {
                        width: auto;
                        margin: 0;
                        cursor: pointer;
                    }
                    .btn {
                        padding: 8px 16px;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                        text-decoration: none;
                        display: inline-block;
                    }
                    .btn-secondary {
                        background: #f8f9fa;
                        color: #6c757d;
                        border: 1px solid #6c757d;
                    }
                    .btn-secondary:hover {
                        background: #e2e6ea;
                    }
                    .btn-primary {
                        background: #007cba;
                        color: white;
                    }
                    .btn-primary:hover {
                        background: #005a87;
                    }
                    .btn-primary:disabled {
                        background: #ccc;
                        cursor: not-allowed;
                    }
                </style>
            `;
            $('head').append(styles);
        }
    },

    /**
     * Create or update link
     * @param {Editor} editor - TipTap editor instance
     * @param {string} url - Link URL
     * @param {string} text - Link text
     * @param {boolean} openInNewTab - Whether to open in new tab
     * @param {boolean} isRelative - Whether this is a relative/anchor link
     */
    createLink: function (editor, url, text, openInNewTab, isRelative) {
        if (url) {
            // Only add protocol if it's not a relative link and doesn't already have a protocol
            if (!isRelative && !url.match(/^https?:\/\//)) {
                url = 'https://' + url;
            }
            
            const linkAttributes = { href: url };
            if (openInNewTab) {
                linkAttributes.target = '_blank';
                linkAttributes.rel = 'noopener noreferrer';
            } else {
                // Explicitly set target and rel to empty strings to override any defaults
                linkAttributes.target = null;
                linkAttributes.rel = null;
            }
            console.log('Link attributes:', linkAttributes);
            
            // Log current link state before modification
            const beforeLink = editor.getAttributes('link');
            
            // If no text is provided, use the URL as text
            const linkText = text || url;
            
            // Check if text is selected in the editor
            const { from, to } = editor.state.selection;
            const hasSelection = from !== to;
            
            if (hasSelection || !text) {
                // If text is selected or no text provided, apply link to selection or insert with default text
                editor.chain().focus().setLink(linkAttributes).run();
            } else {
                // Insert new link with specified text
                const linkHtml = `<a href="${url}"${openInNewTab ? ' target="_blank" rel="noopener noreferrer"' : ''}>${linkText}</a>`;
                editor.chain().focus().insertContent(linkHtml).run();
            }
        }
    },

    /**
     * Check if button should be active
     * @param {Editor} editor - TipTap editor instance
     * @returns {boolean}
     */
    isActive: function (editor) {
        return editor.isActive('link');
    },

    /**
     * Check if button should be disabled
     * @param {Editor} editor - TipTap editor instance
     * @returns {boolean}
     */
    isDisabled: function (editor) {
        return !editor.can().chain().focus().setLink({ href: '#' }).run();
    },

    /**
     * Set up smart detection for relative/anchor links
     * @param {jQuery} dialog - Dialog element
     * @param {string} currentUrl - Current URL value
     */
    setupSmartDetection: function (dialog, currentUrl) {
        const urlInput = dialog.find('#external-link-url');
        const relativeCheckbox = dialog.find('input[name="relative"]');
        const self = this;
        
        // Check if current URL is relative/anchor and set checkbox accordingly
        if (currentUrl && this.isRelativeOrAnchor(currentUrl)) {
            relativeCheckbox.prop('checked', true);
            urlInput.attr('placeholder', '/relative-path or #anchor');
            urlInput.attr('type', 'text');
        }
        
        // Add real-time validation as user types
        urlInput.on('input', function() {
            const url = $(this).val();
            if (url && !relativeCheckbox.is(':checked')) {
                // If not in relative mode, check if URL looks like it should be relative
                if (self.isRelativeOrAnchor(url)) {
                    // Auto-check the relative checkbox
                    relativeCheckbox.prop('checked', true);
                    urlInput.attr('placeholder', '/relative-path or #anchor');
                    urlInput.attr('type', 'text');
                }
            }
        });
        
        // Handle checkbox changes
        relativeCheckbox.on('change', function() {
            if ($(this).is(':checked')) {
                urlInput.attr('placeholder', '/relative-path or #anchor');
                urlInput.attr('type', 'text');
            } else {
                urlInput.attr('placeholder', 'https://example.com or /relative-path or #anchor');
                urlInput.attr('type', 'url');
            }
        });
    },

    /**
     * Check if URL is relative or anchor
     * @param {string} url - URL to check
     * @returns {boolean}
     */
    isRelativeOrAnchor: function (url) {
        if (!url) return false;
        
        // Check for anchor links
        if (url.startsWith('#')) return true;
        
        // Check for relative paths
        if (url.startsWith('/')) return true;
        
        // Check for relative paths without leading slash
        if (!url.match(/^https?:\/\//) && !url.includes('.') && !url.includes(':')) {
            return true;
        }
        
        return false;
    },

    /**
     * Validate URL based on whether it's relative or not
     * @param {string} url - URL to validate
     * @param {boolean} isRelative - Whether relative mode is enabled
     * @param {jQuery} dialog - Dialog element for showing errors
     * @returns {boolean}
     */
    validateUrl: function (url, isRelative, dialog) {
        // Remove any existing error messages
        dialog.find('.url-error').remove();
        
        if (!url) {
            this.showUrlError(dialog, 'Please enter a URL');
            return false;
        }
        
        if (isRelative) {
            // In relative mode, allow anything that looks like a relative URL
            return true;
        } else {
            // In non-relative mode, check if it looks like it should be relative
            if (this.isRelativeOrAnchor(url)) {
                this.showUrlError(dialog, 'This looks like a relative/anchor link. Please check the "Relative/anchor link" checkbox or enter a full URL.');
                return false;
            }
            
            // Check if it's a valid external URL or will become one
            const urlToCheck = url.match(/^https?:\/\//) ? url : 'https://' + url;
            
            try {
                new URL(urlToCheck);
                return true;
            } catch (e) {
                this.showUrlError(dialog, 'Please enter a valid URL (e.g., https://example.com)');
                return false;
            }
        }
    },

    /**
     * Show URL validation error
     * @param {jQuery} dialog - Dialog element
     * @param {string} message - Error message
     */
    showUrlError: function (dialog, message) {
        const urlGroup = dialog.find('#external-link-url').closest('.form-group');
        const errorHtml = `<div class="url-error" style="color: #dc3545; font-size: 12px; margin-top: 5px;">${message}</div>`;
        urlGroup.append(errorHtml);
        
        // Focus the URL input
        dialog.find('#external-link-url').focus();
    },

    // ...existing code...
};
