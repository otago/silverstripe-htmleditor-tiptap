/**
 * SilverStripe Media Extension for TipTap
 * 
 * This extension provides inserting media (images and files) using the native SilverStripe media modal
 */

// Note: We use window.ReactDOM directly to ensure we're using the same instance as SilverStripe

// Initialize the TipTapExtensions namespace if it doesn't exist
if (!window.TipTapExtensions) {
    window.TipTapExtensions = {};
}

window.TipTapExtensions['ss-link-media'] = {

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
        // Initialize context to null, will be set via setCMSContext
        this.cmsContext = null;
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
     * Open media dialog using SilverStripe's media selector
     * @param {Editor} editor - TipTap editor instance
     * @param {string} selectedText - Currently selected text
     */
    openFileLinkDialog: function (editor, selectedText) {
        const self = this;

        // Get current link if cursor is on one
        const currentLink = editor.getAttributes('link');

        // Create modal container
        const modalId = 'tiptap-insert-media__dialog-wrapper';
        let modalContainer = document.getElementById(modalId);
        if (!modalContainer) {
            modalContainer = document.createElement('div');
            modalContainer.id = modalId;
            modalContainer.className = 'insert-media__dialog-wrapper js-injector-boot';
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


        // Get original media attributes
        const mediaAttributes = this.getOriginalMediaAttributes(editor);

        // Define event handlers
        const handleInsert = async (data, file) => {
            try {
                // Determine file category (similar to TinyMCE logic)
                let category = null;
                if (file) {
                    category = file.category;
                } else {
                    category = 'image'; // default
                }

                // Handle insertion based on category
                let result = false;
                switch (category) {
                    case 'image':
                        result = self.insertImage(editor, data, file, selectedText);
                        break;
                    default:
                        result = self.insertFile(editor, data, file, selectedText);
                        break;
                }

                if (result) {
                    self.closeModal();
                }
                return Promise.resolve();
            } catch (error) {
                console.error('Error handling media insert:', error);
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

        // Determine if link text is required based on current selection
        const { from, to } = editor.state.selection;
        const selectionContent = editor.state.doc.textBetween(from, to, '');
        const node = editor.view.domAtPos(from).node;
        const tagName = node.nodeType === Node.ELEMENT_NODE ? node.tagName : (node.parentElement ? node.parentElement.tagName : '');
        
        // Require link text if there's no selection or if an image is selected
        const requireLinkText = tagName !== 'A' && (tagName === 'IMG' || selectionContent.trim() === '');
        const fileSelected = mediaAttributes.hasOwnProperty('ID') && mediaAttributes.ID !== null;

        // Create the modal element using React.createElement (not JSX)
        const modalElement = window.React.createElement(InjectableInsertMediaModal, {
            isOpen: true,
            type: "insert-media",
            folderId: this.getFolderId(),
            onInsert: handleInsert,
            onClosed: handleHide,
            title: false,
            bodyClassName: "modal__dialog",
            className: "insert-media-react__dialog-wrapper",
            fileAttributes: mediaAttributes,
            fileSelected: fileSelected,
            requireLinkText: requireLinkText
        });

        // Render the modal
        root.render(modalElement);

    },


    /**
     * Get original media attributes from current selection (following TinyMCE pattern)
     * @param {Editor} editor - TipTap editor instance
     * @returns {Object} Original media attributes
     */
    getOriginalMediaAttributes: function (editor) {
        const { from, to } = editor.state.selection;
        const node = editor.view.domAtPos(from).node;
        const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
        
        if (!element) {
            return {};
        }

        // Handle image elements
        if (element.tagName === 'IMG') {
            const captionContainer = element.closest('.captionImage');
            const caption = captionContainer ? captionContainer.querySelector('.caption') : null;
            
            return {
                url: element.getAttribute('src'),
                AltText: element.getAttribute('alt'),
                Width: element.getAttribute('width') ? parseInt(element.getAttribute('width'), 10) : null,
                Height: element.getAttribute('height') ? parseInt(element.getAttribute('height'), 10) : null,
                Loading: element.getAttribute('data-loading'),
                TitleTooltip: element.getAttribute('title'),
                Alignment: this.findPosition(element.getAttribute('class')),
                Caption: caption ? caption.textContent : '',
                ID: element.getAttribute('data-id') ? parseInt(element.getAttribute('data-id'), 10) : null,
            };
        }

        // Handle link elements (for file links)
        if (element.tagName === 'A') {
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
        }

        return {};
    },

    /**
     * Calculate placement from css class (following TinyMCE pattern)
     * @param {string} cssClass - CSS class string
     * @returns {string} Alignment value
     */
    findPosition: function (cssClass) {
        const alignments = [
            'leftAlone',
            'center',
            'rightAlone',
            'left',
            'right',
        ];
        if (typeof cssClass !== 'string') {
            return '';
        }
        const classes = cssClass.split(' ');
        return alignments.find((alignment) => (
            classes.indexOf(alignment) > -1
        ));
    },

    /**
     * Get default upload folder ID
     * @returns {number|null} Folder ID
     */
    getFolderId: function () {
        // Try to get folder ID from editor config or data attributes
        if (this.config && this.config.upload_folder_id) {
            const folderId = Number(this.config.upload_folder_id);
            return isNaN(folderId) ? null : folderId;
        }
        return null;
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

    /**
     * Get CMS context for Injector
     * Uses stored context first, falls back to DOM detection
     * @returns {Object} CMS context
     */
    getCMSContext: function () {
        // Use stored context if available
        if (this.cmsContext) {
            console.log('ss-link-media: Using stored CMS context:', this.cmsContext);
            return this.cmsContext;
        }
        
        // Fallback to DOM detection
        const cmsContent = document.querySelector('.cms-content');
        if (cmsContent && cmsContent.id) {
            const context = { context: cmsContent.id };
            console.log('ss-link-media: Using DOM-detected CMS context:', context);
            return context;
        }
        
        console.log('ss-link-media: No CMS context found, using empty context');
        return {};
    },

    /**
     * Insert an image into the editor (following TinyMCE pattern)
     * @param {Editor} editor - TipTap editor instance
     * @param {Object} data - Image data
     * @param {Object} file - File data
     * @param {string} selectedText - Selected text
     * @returns {boolean} Success
     */
    insertImage: function (editor, data, file, selectedText) {
        try {
            console.log('=== insertImage Debug ===');
            console.log('data:', data);
            console.log('file:', file);
            console.log('selectedText:', selectedText);
            
            // Build image attributes
            const attrs = {
                src: data.url,
                alt: data.AltText || '',
                width: data.Width || null,
                height: data.Height || null,
                title: data.TitleTooltip || '',
                class: `ss-htmleditorfield-file image ${data.Alignment || ''}`.trim(),
                'data-id': data.ID,
                'data-shortcode': 'image',
                'data-loading': data.Loading || null,
            };

            console.log('attrs before cleanup:', attrs);

            // Remove null/undefined attributes
            Object.keys(attrs).forEach(key => {
                if (attrs[key] === null || attrs[key] === undefined) {
                    delete attrs[key];
                }
            });

            console.log('attrs after cleanup:', attrs);

            // Use TipTap's proper node creation for images
            const imageAttrs = {
                src: data.url || file.url || '',
                alt: data.AltText || file.title || '',
                title: data.TitleTooltip || file.title || '',
            };
            
            // Add dimensions if provided
            if (data.Width) imageAttrs.width = data.Width;
            if (data.Height) imageAttrs.height = data.Height;

            console.log('imageAttrs for TipTap:', imageAttrs);

            // Insert the image using TipTap's image command
            if (data.Caption) {
                console.log('Inserting captioned image with caption:', data.Caption);
                // For captioned images, we'll insert HTML since it's complex
                const captionHtml = `
                    <div class="captionImage ${data.Alignment || ''}" style="width: ${data.Width || 'auto'}px;">
                        <img src="${data.url || file.url || ''}" alt="${data.AltText || file.title || ''}" ${data.Width ? `width="${data.Width}"` : ''} ${data.Height ? `height="${data.Height}"` : ''} title="${data.TitleTooltip || file.title || ''}" class="ss-htmleditorfield-file image ${data.Alignment || ''}" data-id="${data.ID || file.id}" data-shortcode="image" ${data.Loading ? `data-loading="${data.Loading}"` : ''} />
                        <p class="caption ${data.Alignment || ''}">${data.Caption}</p>
                    </div>
                `;
                console.log('captionHtml:', captionHtml);
                editor.chain().focus().insertContent(captionHtml).run();
            } else {
                console.log('Inserting simple image');
                // For simple images, use the proper TipTap image command
                editor.chain().focus().setImage(imageAttrs).run();
            }

            return true;
        } catch (error) {
            console.error('Error inserting image:', error);
            return false;
        }
    },

    /**
     * Insert a file link into the editor (following TinyMCE pattern)
     * @param {Editor} editor - TipTap editor instance
     * @param {Object} data - File data
     * @param {Object} file - File data
     * @param {string} selectedText - Selected text
     * @returns {boolean} Success
     */
    insertFile: function (editor, data, file, selectedText) {
        try {
            console.log('=== insertFile Debug ===');
            console.log('data:', data);
            console.log('file:', file);
            console.log('selectedText:', selectedText);
            
            // Build shortcode for file link
            let href = '';
            if (window.ShortcodeSerialiser && data.ID) {
                try {
                    const shortcode = window.ShortcodeSerialiser.serialise({
                        name: 'file_link',
                        properties: { id: data.ID },
                    }, true);
                    href = shortcode;
                    console.log('Generated shortcode:', shortcode);
                } catch (e) {
                    console.warn('Error creating shortcode:', e);
                    href = data.url || data.URL || `/assets/files/${data.ID}`;
                }
            } else {
                href = data.url || data.URL || (data.ID ? `/assets/files/${data.ID}` : '');
            }

            console.log('Final href:', href);

            if (!href) {
                console.error('No valid href for file link');
                return false;
            }

            const linkAttributes = {
                href: href,
                target: data.TargetBlank ? '_blank' : '',
                title: data.Description || '',
            };

            console.log('linkAttributes:', linkAttributes);

            // Determine link text
            const { from, to } = editor.state.selection;
            const currentSelection = editor.state.doc.textBetween(from, to, '');
            let linkText = selectedText || currentSelection || data.Text || data.filename || data.FileFilename || 'Download File';

            console.log('currentSelection:', currentSelection);
            console.log('linkText:', linkText);

            // If there's selected text, replace it with the link
            if (currentSelection) {
                console.log('Setting link on selected text');
                editor.chain().focus().setLink(linkAttributes).run();
            } else {
                console.log('Inserting new link with text');
                // Insert new link with the provided text using TipTap's proper link command
                editor.chain()
                    .focus()
                    .insertContent(linkText)
                    .setTextSelection({ from: editor.state.selection.from - linkText.length, to: editor.state.selection.from })
                    .setLink(linkAttributes)
                    .run();
            }

            return true;
        } catch (error) {
            console.error('Error inserting file link:', error);
            return false;
        }
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
     * Check if extension is disabled
     * @param {Editor} editor - TipTap editor instance
     * @returns {boolean}
     */
    isDisabled: function (editor) {
        // For media insertion, check if we can insert content
        return !editor.can().insertContent('<img src="#" />');
    },

};

/**
 * Utility function to set CMS context on all TipTap editors on the page
 * @param {Object} context - CMS context object (e.g., { context: 'cms-main' })
 * @param {string} [selector='.htmleditor[data-tiptap-initialized]'] - jQuery selector for editors
 */
window.TipTapExtensions.setCMSContextForAll = function(context, selector = '.htmleditor[data-tiptap-initialized]') {
    if (!context || typeof context !== 'object') {
        console.warn('TipTapExtensions.setCMSContextForAll: Invalid context provided:', context);
        return;
    }
    
    if (typeof window.jQuery === 'undefined') {
        console.warn('TipTapExtensions.setCMSContextForAll: jQuery not available');
        return;
    }
    
    const $ = window.jQuery;
    const editors = $(selector);
    
    console.log(`TipTapExtensions.setCMSContextForAll: Setting context for ${editors.length} editors:`, context);
    
    editors.each(function() {
        const $editor = $(this);
        if (typeof $editor.setCMSContext === 'function') {
            $editor.setCMSContext(context);
        } else {
            console.warn('TipTapExtensions.setCMSContextForAll: Editor element does not have setCMSContext method:', this);
        }
    });
};
