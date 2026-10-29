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
    action: 'ss-link-file',

    getToolbarConfig: function ({ tooltips }) {
        return {
            type: 'button',
            title: (tooltips && tooltips['ss-link-file']) || 'File Link',
            action: 'ss-link-file',
            extension: 'custom',
        };
    },

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

    run: function ({ editor, host }) {
        this.onClick(editor, this.config || {}, host);
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
        const InjectableInsertMediaModal = window.Injector.loadComponent('InsertMediaModal');
       // console.log('here', context);
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
     * Resolve the ShortcodeSerialiser singleton.
     *
     * The admin bundle publishes the serialiser's *module namespace* on
     * `window.ShortcodeSerialiser`, so serialise()/match() live on `.default`, not on the
     * namespace itself. Calling them on the namespace throws, which is how file links
     * ended up as a made-up `/assets/files/<id>` URL that 403s on the front end.
     *
     * @returns {Object|null} The serialiser, or null if the admin bundle is not loaded
     */
    getShortcodeSerialiser: function () {
        const ns = window.ShortcodeSerialiser;
        if (!ns) {
            return null;
        }
        if (typeof ns.serialise === 'function') {
            return ns;
        }
        if (ns.default && typeof ns.default.serialise === 'function') {
            return ns.default;
        }
        return null;
    },

    /**
     * Build the `[file_link,id=N]` shortcode for a file.
     *
     * A file link must always be stored as a shortcode: FileShortcodeProvider resolves it to
     * the real (possibly protected) URL at render time, and FileLinkTracking reads it to
     * publish the file alongside its owner page. A literal URL does neither, so the link 403s
     * and the file silently stays in draft.
     *
     * @param {number|string} id - File ID
     * @param {string} [anchor] - Optional anchor to append
     * @returns {string} The shortcode, with anchor if supplied
     */
    buildFileLinkShortcode: function (id, anchor) {
        const serialiser = this.getShortcodeSerialiser();
        let shortcode = '';

        if (serialiser) {
            try {
                shortcode = serialiser.serialise({
                    name: 'file_link',
                    properties: { id: id },
                }, true);
            } catch (e) {
                console.warn('Error creating file_link shortcode:', e);
            }
        }

        if (!shortcode) {
            shortcode = `[file_link,id=${id}]`;
        }

        return anchor && anchor.length ? `${shortcode}#${anchor}` : shortcode;
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
        const serialiser = this.getShortcodeSerialiser();
        if (serialiser && typeof serialiser.match === 'function') {
            const shortcode = serialiser.match('file_link', false, hrefParts[0]);
            if (shortcode) {
                return {
                    ID: shortcode.properties.id ? parseInt(shortcode.properties.id, 10) : 0,
                    Anchor: hrefParts[1] || '',
                    Description: currentLink.title || '',
                    TargetBlank: currentLink.target === '_blank',
                };
            }
        }

        // Fallback: parse shortcode manually if matcher API is unavailable.
        const shortcodeIdMatch = hrefParts[0].match(/\[file_link,\s*id\s*=\s*(\d+)\]/i);
        if (shortcodeIdMatch) {
            return {
                ID: parseInt(shortcodeIdMatch[1], 10) || 0,
                Anchor: hrefParts[1] || '',
                Description: currentLink.title || '',
                TargetBlank: currentLink.target === '_blank',
            };
        }

        // Fallback for direct URLs
        return {
            url: currentLink.href,
            title: currentLink.title || '',
            target: currentLink.target || '',
        };
    },


    /**
     * Build file attributes following TinyMCE pattern
     * @param {Object} data - File data from SilverStripe
     * @returns {Object} Link attributes
     */
    buildFileAttributes: function (data) {
        // Always prefer the shortcode. It is the only form the front end resolves and the only
        // form link tracking sees, so never fall back to a hand-built asset URL.
        const id = data.ID;
        const href = id
            ? this.buildFileLinkShortcode(id, data.Anchor)
            : (data.url || data.URL || data.FileURL || '');

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
