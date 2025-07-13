/**
 * SilverStripe File Link Extension for TipTap
 * 
 * This extension provides linking to SilverStripe files using the native file picker modal
 */

// Note: We use window.ReactDOM directly to ensure we're using the same instance as SilverStripe

// Initialize the TipTapExtensions namespace if it doesn't exist
if (!window.TipTapExtensions) {
    window.TipTapExtensions = {};
}

window.TipTapExtensions['ss-link-file'] = {

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

        this.openFileLinkDialog(editor, selectedText);
    },

    /**
     * Open file link dialog using SilverStripe's file selector
     * @param {Editor} editor - TipTap editor instance
     * @param {string} selectedText - Currently selected text
     */
    openFileLinkDialog: function (editor, selectedText) {
        const self = this;

        // Get current link if cursor is on one
        const currentLink = editor.getAttributes('link');

        // Create modal container
        const modalId = 'tiptap-insert-link__dialog-wrapper--file';
        let modalContainer = document.getElementById(modalId);
        if (!modalContainer) {
            modalContainer = document.createElement('div');
            modalContainer.id = modalId;
            modalContainer.className = 'insert-link__dialog-wrapper js-injector-boot';
            document.body.appendChild(modalContainer);
        }

        // Create React root
        const root = window.ReactDom.createRoot(modalContainer);
        this.modalRoot = root;
        this.modalContainer = modalContainer;

        // Load the InsertMediaModal component
        const context = this.getCMSContext();
        const InjectableInsertMediaModal = window.Injector.loadComponent('InsertMediaModal', context);

        if (!InjectableInsertMediaModal) {
            console.error('InsertMediaModal component not available');
            return;
        }


        // Get original file attributes
        const fileAttributes = this.getOriginalFileAttributes(editor);

        // Define event handlers
        const handleInsert = async (data) => {
            try {
                if (data && (data.url || data.URL || data.ID)) {
                    const attributes = self.buildFileAttributes(data);
                    if (attributes.href) {
                        self.createFileLink(editor, attributes.href, selectedText || data.title || data.filename || data.Name || data.FileFilename);
                    }
                }
                self.closeModal();
                return Promise.resolve();
            } catch (error) {
                console.error('Error handling file insert:', error);
                return Promise.reject(error);
            }
        };

        const handleHide = async () => {
            try {
                self.closeModal();
                return Promise.resolve();
            } catch (error) {
                console.error('Error handling modal close:', error);
                return Promise.reject(error);
            }
        };

        // Create the modal element using React.createElement (not JSX)
        const modalElement = window.React.createElement(InjectableInsertMediaModal, {
            isOpen: true,
            type: "insert-link",
            folderId: null,
            onInsert: handleInsert,
            onClosed: handleHide,
            title: false,
            bodyClassName: "modal__dialog",
            className: "insert-link__dialog-wrapper--internal",
            fileAttributes: fileAttributes,
            requireLinkText: false
        });

        // Render the modal
        root.render(modalElement);

    },


    /**
     * Get original file attributes from current link (following TinyMCE pattern)
     * @param {Editor} editor - TipTap editor instance
     * @returns {Object} Original file attributes
     */
    getOriginalFileAttributes: function (editor) {
        const currentLink = editor.getAttributes('link');
        if (!currentLink || !currentLink.href) {
            return {};
        }

        // Get href and split anchor
        const hrefParts = currentLink.href.split('#');
        if (!hrefParts[0]) {
            return {};
        }

        // Check if it's a file link shortcode
        if (window.ShortcodeSerialiser) {
            const shortcode = window.ShortcodeSerialiser.match('file_link', false, hrefParts[0]);
            if (shortcode) {
                return {
                    ID: shortcode.properties.id ? parseInt(shortcode.properties.id, 10) : 0,
                    Anchor: hrefParts[1] || '',
                    Description: currentLink.title || '',
                    TargetBlank: currentLink.target === '_blank',
                };
            }
        }

        // Fallback for direct URLs
        return {
            url: currentLink.href,
            title: currentLink.title || '',
            target: currentLink.target || '',
        };
    },


    /**
     * Set CMS context for modal rendering
     * This method ensures proper context propagation when multiple editors are present
     * @param {Object} context - CMS context object (e.g., { context: 'cms-main' })
     */
    setCMSContext: function (context) {
        if (!context || typeof context !== 'object') {
            console.warn('ss-link-media: Invalid context provided to setCMSContext:', context);
            return;
        }
        
        console.log('ss-link-media: Setting CMS context:', context);
        this.cmsContext = context;
    },

    /**
     * Get CMS context for Injector
     * @returns {Object} CMS context
     */
    getCMSContext: function () {
        return this.cmsContext ;
    },

    /**
     * Build file attributes following TinyMCE pattern
     * @param {Object} data - File data from SilverStripe
     * @returns {Object} Link attributes
     */
    buildFileAttributes: function (data) {
        // Try different approaches to build the file link
        let href = '';
        
        // If we have ShortcodeSerialiser available, try to use it
        if (window.ShortcodeSerialiser && data.ID) {
            try {
                // Try different serialization methods that might be available
                if (typeof window.ShortcodeSerialiser.serialise === 'function') {
                    const shortcode = window.ShortcodeSerialiser.serialise({
                        name: 'file_link',
                        properties: { id: data.ID },
                    }, true);
                    href = shortcode;
                } else if (typeof window.ShortcodeSerialiser.serialize === 'function') {
                    // Try US spelling
                    const shortcode = window.ShortcodeSerialiser.serialize({
                        name: 'file_link',
                        properties: { id: data.ID },
                    }, true);
                    href = shortcode;
                } else if (typeof window.ShortcodeSerialiser.create === 'function') {
                    // Try create method
                    href = window.ShortcodeSerialiser.create('file_link', { id: data.ID });
                } else {
                    // Manual shortcode construction
                    href = `[file_link,id=${data.ID}]`;
                }
                
                // Add anchor if provided
                const anchor = data.Anchor && data.Anchor.length ? `#${data.Anchor}` : '';
                href = `${href}${anchor}`;
                
            } catch (e) {
                console.warn('Error creating shortcode:', e);
                // Fall through to direct URL approach
            }
        }
        
        // Fallback to direct URL if shortcode creation failed
        if (!href) {
            href = data.url || data.URL || data.FileURL;
            if (!href && data.ID) {
                // Try to construct a file URL using the file hash and filename
                if (data.FileHash && data.FileFilename) {
                    href = `/assets/${data.FileHash.substring(0, 10)}/${data.FileFilename}`;
                } else {
                    // Last resort - simple ID-based URL
                    href = `/assets/files/${data.ID}`;
                }
            }
        }

        const attributes = {
            href: href || '',
            target: data.TargetBlank ? '_blank' : '',
            title: data.Description || data.Title || data.FileFilename || '',
        };
        
        return attributes;
    },

    /**
     * Close the modal and clean up
     */
    closeModal: function () {
        if (this.modalRoot) {
            try {
                // React 18+ cleanup using root
                this.modalRoot.unmount();
                this.modalRoot = null;
            } catch (e) {
                console.warn('Error unmounting React root:', e);
            }
        }

        if (this.modalContainer) {
            try {
                // Remove the DOM element
                if (this.modalContainer.parentNode) {
                    this.modalContainer.parentNode.removeChild(this.modalContainer);
                }
            } catch (e) {
                console.warn('Error removing modal container:', e);
            }
            this.modalContainer = null;
        }
    },

    /**
     * Create a file link in the editor
     * @param {Editor} editor - TipTap editor instance
     * @param {string} href - File URL
     * @param {string} text - Link text
     */
    createFileLink: function (editor, href, text) {
        const { from, to } = editor.state.selection;
        const selectedText = editor.state.doc.textBetween(from, to, '');

        // If there's selected text, replace it with the link
        if (selectedText) {
            editor.chain().focus().setLink({ href: href }).run();
        } else {
            // Insert new link with the provided text
            const linkText = text || this.getFilenameFromUrl(href);
            editor.chain().focus().insertContent(`<a href="${href}">${linkText}</a>`).run();
        }
    },

    /**
     * Extract filename from URL
     * @param {string} url - File URL
     * @returns {string} Filename
     */
    getFilenameFromUrl: function (url) {
        const parts = url.split('/');
        const filename = parts[parts.length - 1];
        return filename || 'Download File';
    },

    /**
     * Check if extension is disabled
     * @param {Editor} editor - TipTap editor instance
     * @returns {boolean}
     */
    isDisabled: function (editor) {
        return !editor.can().chain().focus().setLink({ href: '#' }).run();
    },


};
