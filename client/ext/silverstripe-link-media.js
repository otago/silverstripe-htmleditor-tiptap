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

const IMAGE_NODE_PRIORITY = ['imageResize', 'imagePlus', 'image'];

function resolveImageNodeType(editor) {
    const nodes = (editor && editor.schema && editor.schema.nodes) || {};
    for (let i = 0; i < IMAGE_NODE_PRIORITY.length; i++) {
        const nodeType = IMAGE_NODE_PRIORITY[i];
        if (nodes[nodeType]) {
            return nodeType;
        }
    }
    return null;
}

function getAlignmentStyles(alignment) {
    const value = (alignment || '').trim();

    switch (value) {
        case 'left':
            return {
                containerStyle: 'margin: 0 auto 0 0;',
                wrapperStyle: 'display: flex; margin: 0;'
            };
        case 'center':
            return {
                containerStyle: 'margin: 0 auto;',
                wrapperStyle: 'display: flex; margin: 0;'
            };
        case 'right':
            return {
                containerStyle: 'margin: 0 0 0 auto;',
                wrapperStyle: 'display: flex; margin: 0;'
            };
        case 'leftAlone':
            return {
                containerStyle: 'display: inline-block; float: left; padding-right: 8px;',
                wrapperStyle: 'display: inline-block; float: left; padding-right: 8px;'
            };
        case 'rightAlone':
            return {
                containerStyle: 'display: inline-block; float: right; padding-left: 8px;',
                wrapperStyle: 'display: inline-block; float: right; padding-left: 8px;'
            };
        default:
            return null;
    }
}

function inferAlignmentFromResizeStyles(containerStyle, wrapperStyle) {
    const container = (containerStyle || '').toLowerCase();
    const wrapper = (wrapperStyle || '').toLowerCase();

    if (container.includes('margin: 0 auto;')) {
        return 'center';
    }
    if (container.includes('margin: 0 auto 0 0;')) {
        return 'left';
    }
    if (container.includes('margin: 0 0 0 auto;')) {
        return 'right';
    }
    if (container.includes('float: left') || wrapper.includes('float: left')) {
        return 'leftAlone';
    }
    if (container.includes('float: right') || wrapper.includes('float: right')) {
        return 'rightAlone';
    }

    return '';
}

function resolveMediaId(data, file) {
    const rawId = data && data.ID !== undefined && data.ID !== null
        ? data.ID
        : file && file.id !== undefined && file.id !== null
            ? file.id
            : file && file.ID !== undefined && file.ID !== null
                ? file.ID
                : null;

    if (rawId === null || rawId === '') {
        return null;
    }

    const id = parseInt(rawId, 10);
    return Number.isNaN(id) ? null : id;
}

function resolveMediaUrl(data, file) {
    const dataUrl = data && (data.url || data.URL || data.FileURL);
    if (dataUrl) {
        return dataUrl;
    }

    const fileUrl = file && (file.url || file.URL || file.FileURL);
    if (fileUrl) {
        return fileUrl;
    }

    if (data.FileFilename) {
        return `/assets/${data.FileFilename}`;
    }

    // these old hash urls were removed in older silverstripe versions
    // const dataHash = data && data.FileHash;
    // const dataFilename = data && data.FileFilename;
    // if (dataHash && dataFilename) {
    //     return `/assets/${String(dataHash).substring(0, 10)}/${dataFilename}`;
    // }

    // const fileHash = file && file.FileHash;
    // const fileFilename = file && file.FileFilename;
    // if (fileHash && fileFilename) {
    //     return `/assets/${String(fileHash).substring(0, 10)}/${fileFilename}`;
    // }

    // No URL anywhere in the payload. `/assets/files/<id>` is not a route — it 403s at the
    // web server — so an empty src, which is visibly broken in the editor, beats a link that
    // looks fine until someone clicks it.
    return '';
}

window.TipTapExtensions['ss-link-media'] = {
    action: 'ss-link-media',

    getToolbarConfig: function ({ tooltips }) {
        return {
            type: 'button',
            title: (tooltips && tooltips['ss-link-media']) || 'Media',
            action: 'ss-link-media',
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

    openImageEditor: function (editor) {
        //console.log('openImageEditor')
        this.openFileLinkDialog(editor, '', { replaceSelection: true });
    },

    /**
     * Open media dialog using SilverStripe's media selector
     * @param {Editor} editor - TipTap editor instance
     * @param {string} selectedText - Currently selected text
     */
    openFileLinkDialog: function (editor, selectedText, options = {}) {
        //console.log('openFileLinkDialog called with selectedText:', selectedText, 'and options:', options);
        const self = this;
        const replaceSelection = Boolean(options.replaceSelection);

        // Get current link if cursor is on one
        const currentLink = editor.getAttributes('link');
       // console.log('currentLink attributes:', currentLink);

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
        const InjectableInsertMediaModal = window.Injector.loadComponent('InsertMediaModal');

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
                        result = self.insertImage(editor, data, file, selectedText, { replaceSelection });
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
        const imageElement = element && element.tagName === 'IMG'
            ? element
            : element && typeof element.querySelector === 'function'
                ? element.querySelector('img')
                : null;

        if (!element && !imageElement) {
            return {};
        }

        // Handle image elements
        if (imageElement) {
            const captionContainer = imageElement.closest('.captionImage');
            const caption = captionContainer ? captionContainer.querySelector('.caption') : null;
            const styleAlignment = inferAlignmentFromResizeStyles(
                imageElement.getAttribute('containerstyle'),
                imageElement.getAttribute('wrapperstyle')
            );

            return {
                url: imageElement.getAttribute('src'),
                AltText: imageElement.getAttribute('alt'),
                Width: imageElement.getAttribute('width') ? parseInt(imageElement.getAttribute('width'), 10) : null,
                Height: imageElement.getAttribute('height') ? parseInt(imageElement.getAttribute('height'), 10) : null,
                Loading: imageElement.getAttribute('data-loading'),
                TitleTooltip: imageElement.getAttribute('title'),
                Alignment: styleAlignment || this.findPosition(imageElement.getAttribute('class')),
                Caption: caption ? caption.textContent : '',
                ID: imageElement.getAttribute('data-id') ? parseInt(imageElement.getAttribute('data-id'), 10) : null,
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
     * Convert SilverStripe [image ...] shortcodes to HTML <img ...> for TipTap rendering
     * @param {string} content - HTML/source content
     * @returns {string} Normalized content
     */
    normalizeContent: function (content) {
        if (!content || typeof content !== 'string') {
            return content;
        }

        return content.replace(/\[image\s+([^\]]*)\]/gi, (match, attrText) => {
            const attrs = {};
            const attrRegex = /(\w[\w-]*)="([^"]*)"/g;
            let attrMatch;

            while ((attrMatch = attrRegex.exec(attrText)) !== null) {
                attrs[attrMatch[1]] = attrMatch[2];
            }

            const htmlAttrs = [];
            htmlAttrs.push(`src="${attrs.src || ''}"`);
            if (attrs.alt) htmlAttrs.push(`alt="${attrs.alt}"`);
            if (attrs.width) htmlAttrs.push(`width="${attrs.width}"`);
            if (attrs.height) htmlAttrs.push(`height="${attrs.height}"`);
            if (attrs.title) htmlAttrs.push(`title="${attrs.title}"`);
            if (attrs.class) htmlAttrs.push(`class="${attrs.class}"`);
            if (attrs.id) htmlAttrs.push(`data-id="${attrs.id}"`);
            if (attrs.loading) htmlAttrs.push(`data-loading="${attrs.loading}"`);

            const alignment = this.findPosition(attrs.class || '');
            const alignmentStyles = getAlignmentStyles(alignment);
            if (alignmentStyles) {
                htmlAttrs.push(`containerstyle="${alignmentStyles.containerStyle}"`);
                htmlAttrs.push(`wrapperstyle="${alignmentStyles.wrapperStyle}"`);
            }

            htmlAttrs.push('data-shortcode="image"');

            return `<img ${htmlAttrs.join(' ')} />`;
        });
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
     * Build file attributes following TinyMCE pattern
     * @param {Object} data - File data from SilverStripe
     * @returns {Object} Link attributes
     */
    buildFileAttributes: function (data) {
        // Always prefer the shortcode. It is the only form the front end resolves and the only
        // form link tracking sees, so never fall back to a hand-built asset URL.
        const id = resolveMediaId(data, null);
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


    /**
     * Insert an image into the editor (following TinyMCE pattern)
     * @param {Editor} editor - TipTap editor instance
     * @param {Object} data - Image data
     * @param {Object} file - File data
     * @param {string} selectedText - Selected text
     * @returns {boolean} Success
     */
    insertImage: function (editor, data, file, selectedText, options = {}) {
        try {
            // console.log('=== insertImage Debug ===');
            // console.log('data:', data);
            // console.log('file:', file);
            // console.log('selectedText:', selectedText);

            const mediaId = resolveMediaId(data, file);
            const fileTitle = (data && (data.FileFilename || data.TitleTooltip || data.AltText))
                || (file && (file.title || file.Title || file.FileFilename))
                || '';
            const imageUrl = resolveMediaUrl(data, file);

            // Build image attributes
            const attrs = {
                src: imageUrl,
                alt: (data && data.AltText) || '',
                width: data.Width || null,
                height: data.Height || null,
                title: (data && data.TitleTooltip) || '',
                class: `ss-htmleditorfield-file image ${data.Alignment || ''}`.trim(),
                'data-id': mediaId,
                'data-shortcode': 'image',
                'data-loading': data.Loading || null,
            };

            // console.log('attrs before cleanup:', attrs);

            // Remove null/undefined attributes
            Object.keys(attrs).forEach(key => {
                if (attrs[key] === null || attrs[key] === undefined) {
                    delete attrs[key];
                }
            });

            //console.log('attrs after cleanup:', attrs);

            // Use TipTap's proper node creation for images
            const imageAttrs = {
                src: imageUrl,
                alt: (data && data.AltText) || fileTitle || '',
                title: (data && data.TitleTooltip) || fileTitle || '',
                'data-id': mediaId,
                dataId: mediaId,
                id: mediaId,
            };

            // Add dimensions if provided
            if (data.Width) imageAttrs.width = data.Width;
            if (data.Height) imageAttrs.height = data.Height;

            const imageNodeType = resolveImageNodeType(editor);
            if (!imageNodeType) {
                return false;
            }

            const alignmentStyles = getAlignmentStyles(data.Alignment);
            if (alignmentStyles && imageNodeType === 'imageResize') {
                imageAttrs.containerStyle = alignmentStyles.containerStyle;
                imageAttrs.wrapperStyle = alignmentStyles.wrapperStyle;
            }

            // console.log('imageAttrs for TipTap:', imageAttrs);

            // Insert the image using TipTap's image command
            if (data.Caption) {
                //  console.log('Inserting captioned image with caption:', data.Caption);
                // For captioned images, we'll insert HTML since it's complex
                const captionHtml = `
                    <div class="captionImage ${data.Alignment || ''}" style="width: ${data.Width || 'auto'}px;">
                        <img src="${imageUrl}" alt="${(data && data.AltText) || fileTitle || ''}" ${data.Width ? `width="${data.Width}"` : ''} ${data.Height ? `height="${data.Height}"` : ''} title="${(data && data.TitleTooltip) || fileTitle || ''}" class="ss-htmleditorfield-file image ${data.Alignment || ''}" ${mediaId ? `data-id="${mediaId}"` : ''} data-shortcode="image" ${data.Loading ? `data-loading="${data.Loading}"` : ''} />
                        <p class="caption ${data.Alignment || ''}">${data.Caption}</p>
                    </div>
                `;

                //console.log('captionHtml:', captionHtml);
                if (options.replaceSelection) {
                    editor.chain().focus().deleteSelection().insertContent(captionHtml).run();
                } else {
                    editor.chain().focus().insertContent(captionHtml).run();
                }
            } else {
                //   console.log('Inserting simple image');
                // For simple images, insert the best available image node type.
                const imageContent = { type: imageNodeType, attrs: imageAttrs };
                if (!editor.can().insertContent(imageContent)) {
                    return false;
                }
                if (options.replaceSelection) {
                    editor.chain().focus().deleteSelection().insertContent(imageContent).run();
                } else {
                    editor.chain().focus().insertContent(imageContent).run();
                }
            }


            // Ensure the rendered DOM node keeps a stable data-id attribute.
            if (mediaId) {
                //console.log('mediaId:', mediaId);
                const { from } = editor.state.selection;
                let imageElement = null;
                const nodeDom = editor.view.nodeDOM(from);

                if (nodeDom && nodeDom.nodeType === Node.ELEMENT_NODE) {
                    if (nodeDom.tagName === 'IMG') {
                        imageElement = nodeDom;
                    } else if (typeof nodeDom.querySelector === 'function') {
                        imageElement = nodeDom.querySelector('img');
                    }
                }

                if (!imageElement) {
                    const lookupPos = from > 0 ? from - 1 : from;
                    const domAtPos = editor.view.domAtPos(lookupPos);
                    const baseNode = domAtPos && domAtPos.node ? domAtPos.node : null;
                    const parent = baseNode && baseNode.nodeType === Node.ELEMENT_NODE ? baseNode : baseNode && baseNode.parentElement;

                    if (parent) {
                        if (parent.tagName === 'IMG') {
                            imageElement = parent;
                        } else if (typeof parent.querySelector === 'function') {
                            imageElement = parent.querySelector('img');
                        }
                    }
                }

                // if (imageElement) {
                //     console.log('Setting data-id on image element:', imageElement, 'with mediaId:', mediaId);
                //     imageElement.setAttribute('data-id', String(mediaId));
                // }
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
            // console.log('=== insertFile Debug ===');
            // console.log('data:', data);
            // console.log('file:', file);
            // console.log('selectedText:', selectedText);

            // Build shortcode for file link. `data` here is the modal's form payload, which
            // carries the File ID but no URL, so the shortcode is the only usable href.
            const fileId = resolveMediaId(data, file);
            const href = fileId
                ? this.buildFileLinkShortcode(fileId, data.Anchor)
                : (data.url || data.URL || '');

            // console.log('Final href:', href);

            if (!href) {
                console.error('No valid href for file link');
                return false;
            }

            const linkAttributes = {
                href: href,
                target: data.TargetBlank ? '_blank' : '',
                title: data.Description || '',
            };

            //   console.log('linkAttributes:', linkAttributes);

            // Determine link text
            const { from, to } = editor.state.selection;
            const currentSelection = editor.state.doc.textBetween(from, to, '');
            let linkText = selectedText || currentSelection || data.Text || data.filename || data.FileFilename || 'Download File';

            // console.log('currentSelection:', currentSelection);
            // console.log('linkText:', linkText);

            // If there's selected text, replace it with the link
            if (currentSelection) {
                //   console.log('Setting link on selected text');
                editor.chain().focus().setLink(linkAttributes).run();
            } else {
                //   console.log('Inserting new link with text');
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
        const nodeType = resolveImageNodeType(editor);
        if (!nodeType) {
            return true;
        }
        return !editor.can().insertContent({ type: nodeType, attrs: { src: '#' } });
    },

};
