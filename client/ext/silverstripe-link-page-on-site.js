/**
 * SilverStripe Page Link Extension for TipTap
 * 
 * This extension provides linking to internal pages within the SilverStripe site
 */

// Initialize the TipTapExtensions namespace if it doesn't exist
if (!window.TipTapExtensions) {
    window.TipTapExtensions = {};
}

const $ = window.jQuery;
window.TipTapExtensions['ss-link-site'] = {

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

        // Check if SilverStripe link dialog is available
        this.hasSilverStripeDialog = typeof window.jQuery !== 'undefined' &&
            window.jQuery.entwine &&
            window.jQuery.entwine.namespaces.ss;
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

        if (this.hasSilverStripeDialog) {
            console.log('Opening SilverStripe link dialog');
            // Use SilverStripe's built-in link dialog
            this.openSilverStripeDialog(editor, selectedText);
        } else {
            console.log('Opening SilverStripe simple dialog');
            // Fallback to simple prompt
            this.openSimpleDialog(editor, selectedText);
        }
    },

    /**
     * Open SilverStripe link dialog
     * @param {Editor} editor - TipTap editor instance
     * @param {string} selectedText - Currently selected text
     */
    openSilverStripeDialog: function (editor, selectedText) {
        // Get current link if cursor is on one
        const currentLink = editor.getAttributes('link');
        
        // Create modal dialog
        this.createPageLinkModal(editor, selectedText, currentLink);
    },

    /**
     * Create page link modal with tree dropdown
     * @param {Editor} editor - TipTap editor instance
     * @param {string} selectedText - Currently selected text
     * @param {Object} currentLink - Current link attributes
     */
    createPageLinkModal: function (editor, selectedText, currentLink) {
        // Create modal HTML
        const modalHtml = `
            <div class="page-link-modal-overlay">
                <div class="page-link-modal">
                    <div class="page-link-modal-header">
                        <h3>Link to Page</h3>
                        <button class="page-link-modal-close" type="button">&times;</button>
                    </div>
                    <div class="page-link-modal-body">
                        <div class="form-group">
                            <label for="page-link-text">Link Text:</label>
                            <input type="text" id="page-link-text" class="form-control" value="${selectedText || ''}" placeholder="Enter link text">
                        </div>
                        <div class="form-group">
                            <label for="page-tree-select">Select Page:</label>
                            <div class="page-tree-container">
                                <div class="page-tree-list" id="page-tree-list">
                                    <!-- Tree items will be populated here -->
                                </div>
                                <div class="page-tree-loading" style="display: none;">
                                    <div class="spinner"></div>
                                    <span>Loading page tree...</span>
                                </div>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="page-link-description">Description (rollover text):</label>
                            <input type="text" id="page-link-description" class="form-control" placeholder="Optional description that appears on hover">
                        </div>
                        <div class="form-group">
                            <div class="checkbox-wrapper">
                                <label>
                                    <input type="checkbox" id="page-link-new-window"> Open in new window
                                </label>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="page-link-url">URL Preview:</label>
                            <input type="text" id="page-link-url" class="form-control" readonly placeholder="[sitetree_link,id=X]">
                        </div>
                    </div>
                    <div class="page-link-modal-footer">
                        <button type="button" class="btn btn-secondary page-link-cancel">Cancel</button>
                        <button type="button" class="btn btn-primary page-link-insert">Insert Link</button>
                    </div>
                </div>
            </div>
        `;

        // Add CSS styles
        this.addModalStyles();

        // Insert modal into DOM
        const modal = $(modalHtml);
        $('body').append(modal);

        // Load page tree
        this.loadPageTree(modal);

        // Set up event handlers
        this.setupModalEvents(modal, editor, selectedText, currentLink);
    },

    /**
     * Add CSS styles for the modal
     */
    addModalStyles: function () {
        if ($('#page-link-modal-styles').length === 0) {
            const styles = `
                <style id="page-link-modal-styles">
                    .page-link-modal-overlay {
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
                    .page-link-modal {
                        background: white;
                        border-radius: 8px;
                        width: 90%;
                        max-width: 500px;
                        max-height: 90vh;
                        overflow: hidden;
                        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                    }
                    .page-link-modal-header {
                        padding: 15px 20px;
                        border-bottom: 1px solid #e0e0e0;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .page-link-modal-header h3 {
                        margin: 0;
                        font-size: 18px;
                        color: #333;
                    }
                    .page-link-modal-close {
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
                    .page-link-modal-close:hover {
                        color: #333;
                    }
                    .page-link-modal-body {
                        padding: 20px;
                        max-height: 60vh;
                        overflow-y: auto;
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
                    .page-tree-container {
                        position: relative;
                    }
                    .page-tree-list {
                        max-height: 300px;
                        overflow-y: auto;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        background: white;
                    }
                    .page-tree-item {
                        display: flex;
                        align-items: center;
                        padding: 8px 12px;
                        cursor: pointer;
                        user-select: none;
                        border-bottom: 1px solid #f0f0f0;
                    }
                    .page-tree-item:last-child {
                        border-bottom: none;
                    }
                    .page-tree-item:hover {
                        background: #f8f9fa;
                    }
                    .page-tree-item.selected {
                        background: #007cba;
                        color: white;
                    }
                    .page-tree-item.has-children {
                        font-weight: 500;
                    }
                    .page-tree-toggle {
                        width: 20px;
                        height: 20px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin-right: 8px;
                        cursor: pointer;
                        color: #666;
                        flex-shrink: 0;
                    }
                    .page-tree-toggle:hover {
                        color: #333;
                    }
                    .page-tree-toggle.expandable {
                        cursor: pointer;
                    }
                    .page-tree-toggle.expandable:before {
                        content: "▶";
                        font-size: 12px;
                    }
                    .page-tree-toggle.expanded:before {
                        content: "▼";
                    }
                    .page-tree-toggle.no-children:before {
                        content: "•";
                        font-size: 8px;
                        color: #ccc;
                    }
                    .page-tree-title {
                        flex: 1;
                        padding: 2px 0;
                    }
                    .page-tree-children {
                        display: none;
                        margin-left: 28px;
                        border-left: 2px solid #e0e0e0;
                        padding-left: 12px;
                    }
                    .page-tree-children.expanded {
                        display: block;
                    }
                    .page-tree-item-wrapper {
                        display: block;
                    }
                    .page-tree-loading {
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(255, 255, 255, 0.9);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                        border-radius: 4px;
                    }
                    .spinner {
                        width: 20px;
                        height: 20px;
                        border: 2px solid #f3f3f3;
                        border-top: 2px solid #007cba;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    .page-link-modal-footer {
                        padding: 15px 20px;
                        border-top: 1px solid #e0e0e0;
                        display: flex;
                        justify-content: flex-end;
                        gap: 10px;
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
                </style>
            `;
            $('head').append(styles);
        }
    },

    /**
     * Load page tree via AJAX
     * @param {jQuery} modal - Modal element
     */
    loadPageTree: function (modal) {
        const treeContainer = modal.find('#page-tree-list');
        const loading = modal.find('.page-tree-loading');
        
        // Show loading spinner
        loading.show();
        
        // Make AJAX request to load page tree
        $.ajax({
            url: '/api/pagetree/json',
            method: 'GET',
            dataType: 'json',
            success: (response) => {
                loading.hide();
                
                if (response.success && response.data) {
                    this.populatePageTree(treeContainer, response.data, modal);
                } else {
                    this.showError(modal, 'Failed to load page tree: ' + (response.error || 'Unknown error'));
                }
            },
            error: (xhr, status, error) => {
                loading.hide();
                this.showError(modal, 'Failed to load page tree: ' + error);
            }
        });
    },

    /**
     * Populate page tree with collapsible structure
     * @param {jQuery} container - Tree container element
     * @param {Array} pages - Page tree data
     * @param {jQuery} modal - Modal element reference
     */
    populatePageTree: function (container, pages, modal) {
        const self = this;
        
        pages.forEach(page => {
            const hasChildren = page.children && page.children.length > 0;
            
            // Create tree item wrapper
            const itemWrapper = $(`
                <div class="page-tree-item-wrapper">
                    <div class="page-tree-item ${hasChildren ? 'has-children' : ''}" data-page-id="${page.id}">
                        <div class="page-tree-toggle ${hasChildren ? 'expandable' : 'no-children'}"></div>
                        <div class="page-tree-title">${page.menuTitle || page.title}</div>
                    </div>
                </div>
            `);
            
            const item = itemWrapper.find('.page-tree-item');
            
            // Add children container if there are children
            if (hasChildren) {
                const childrenContainer = $('<div class="page-tree-children"></div>');
                itemWrapper.append(childrenContainer);
                
                // Set up toggle functionality
                item.find('.page-tree-toggle').on('click', function(e) {
                    e.stopPropagation();
                    const toggle = $(this);
                    const children = itemWrapper.find('.page-tree-children').first();
                    
                    if (toggle.hasClass('expanded')) {
                        // Collapse
                        toggle.removeClass('expanded');
                        children.removeClass('expanded');
                    } else {
                        // Expand
                        toggle.addClass('expanded');
                        children.addClass('expanded');
                        
                        // Populate children if not already done
                        if (children.children().length === 0) {
                            self.populatePageTree(children, page.children, modal);
                        }
                    }
                });
            }
            
            // Set up click handler for selection
            item.on('click', function(e) {
                if ($(e.target).hasClass('page-tree-toggle')) {
                    return; // Don't select when clicking toggle
                }
                
                // Remove selection from other items
                modal.find('.page-tree-item').removeClass('selected');
                
                // Select this item
                $(this).addClass('selected');
                
                // Update the URL preview
                const urlPreview = `[sitetree_link,id=${page.id}]`;
                modal.find('#page-link-url').val(urlPreview);
                modal.find('.page-link-insert').prop('disabled', false);
                
                // Store selected page ID for later use
                modal.data('selectedPageId', page.id);
            });
            
            container.append(itemWrapper);
        });
    },

    /**
     * Set up modal event handlers
     * @param {jQuery} modal - Modal element
     * @param {Editor} editor - TipTap editor instance
     * @param {string} selectedText - Currently selected text
     * @param {Object} currentLink - Current link attributes
     */
    setupModalEvents: function (modal, editor, selectedText, currentLink) {
        const self = this;
        
        // Close modal events
        modal.find('.page-link-modal-close, .page-link-cancel').on('click', function () {
            self.closeModal(modal);
        });
        
        // Close on overlay click
        modal.find('.page-link-modal-overlay').on('click', function (e) {
            if (e.target === this) {
                self.closeModal(modal);
            }
        });
        
        // Page selection is now handled in populatePageTree method
        // No need for separate change event handler
        
        // Insert link button
        modal.find('.page-link-insert').on('click', function () {
            const selectedPageId = modal.data('selectedPageId');
            const linkText = modal.find('#page-link-text').val();
            const linkDescription = modal.find('#page-link-description').val();
            const openInNewWindow = modal.find('#page-link-new-window').is(':checked');

            if (selectedPageId) {
                const linkUrl = `[sitetree_link,id=${selectedPageId}]`;
                self.createLink(editor, linkUrl, linkText, linkDescription, openInNewWindow);
                self.closeModal(modal);
            } else {
                alert('Please select a page from the tree before inserting the link.');
            }
        });
        
        // Set current values if editing existing link
        if (currentLink && currentLink.href) {
            console.log('Editing existing link:', currentLink);
            
            // Try to extract page ID from SilverStripe link format
            const match = currentLink.href.match(/\[sitetree_link,id=(\d+)\]/);
            if (match) {
                const pageId = match[1];
                console.log('Found page ID in link:', pageId);
                // Set the selected page once tree is loaded
                setTimeout(() => {
                    self.findAndSelectPage(modal, pageId);
                }, 1000); // Increased timeout to ensure tree is fully loaded
            }
            
            // Set other link attributes immediately
            if (currentLink.title) {
                modal.find('#page-link-description').val(currentLink.title);
            }
            if (currentLink.target === '_blank') {
                modal.find('#page-link-new-window').prop('checked', true);
            }
        }
        
        // Initially disable insert button
        modal.find('.page-link-insert').prop('disabled', true);
    },

    /**
     * Show error message in modal
     * @param {jQuery} modal - Modal element
     * @param {string} message - Error message
     */
    showError: function (modal, message) {
        const errorHtml = `<div class="alert alert-danger" style="margin-top: 10px; padding: 10px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; color: #721c24;">${message}</div>`;
        modal.find('.page-tree-container').append(errorHtml);
    },

    /**
     * Close modal
     * @param {jQuery} modal - Modal element
     */
    closeModal: function (modal) {
        modal.fadeOut(200, function () {
            modal.remove();
        });
    },

    /**
     * Open simple dialog (fallback)
     * @param {Editor} editor - TipTap editor instance
     * @param {string} selectedText - Currently selected text
     */
    openSimpleDialog: function (editor, selectedText) {
        const currentLink = editor.getAttributes('link');
        const url = prompt('Enter page URL:', currentLink.href || '');
        
        if (url !== null) {
            this.createLink(editor, url, selectedText);
        }
    },

    /**
     * Create or update link
     * @param {Editor} editor - TipTap editor instance
     * @param {string} url - Link URL
     * @param {string} selectedText - Selected text
     * @param {string} description - Link description (title attribute)
     * @param {boolean} openInNewWindow - Whether to open in new window
     */
    createLink: function (editor, url, selectedText, description, openInNewWindow) {
        if (url) {
            // Build link attributes
            const linkAttributes = { href: url };
            if (description) {
                linkAttributes.title = description;
            }
            if (openInNewWindow) {
                linkAttributes.target = '_blank';
                linkAttributes.rel = 'noopener noreferrer'; // Security best practice
            }
            
            // If no text is selected, use the URL as text
            if (!selectedText) {
                let linkHtml = `<a href="${url}"`;
                if (description) {
                    linkHtml += ` title="${description.replace(/"/g, '&quot;')}"`;
                }
                if (openInNewWindow) {
                    linkHtml += ` target="_blank" rel="noopener noreferrer"`;
                }
                linkHtml += `>${url}</a>`;
                
                editor.chain().focus().insertContent(linkHtml).run();
            } else {
                // Apply link to selected text
                editor.chain().focus().setLink(linkAttributes).run();
            }
        } else {
            // Remove link if URL is empty
            editor.chain().focus().unsetLink().run();
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
     * Find and select a page in the tree, expanding parent nodes as needed
     * @param {jQuery} modal - Modal element
     * @param {string} pageId - Page ID to select
     */
    findAndSelectPage: function (modal, pageId) {
        console.log('findAndSelectPage called with pageId:', pageId, 'Type:', typeof pageId);
        
        // First, try to find the page if it's already loaded
        // Try both as string and number in case of type mismatch
        let pageItem = modal.find(`[data-page-id="${pageId}"]`);
        if (pageItem.length === 0) {
            pageItem = modal.find(`[data-page-id="${parseInt(pageId)}"]`);
        }
        if (pageItem.length === 0) {
            pageItem = modal.find(`[data-page-id="${pageId.toString()}"]`);
        }
        
        console.log('Found page item:', pageItem.length > 0 ? 'Yes' : 'No');
        
        if (pageItem.length > 0) {
            this.selectAndScrollToPage(modal, pageItem);
        } else {
            // Page not found - it might be in a collapsed tree
            // Try to find it by searching through all the data
            console.log('Page not found in DOM, searching through tree data...');
            this.searchAndExpandToPage(modal, pageId);
        }
    },

    /**
     * Search through tree data to find a page and expand to it
     * @param {jQuery} modal - Modal element
     * @param {string} pageId - Page ID to find
     */
    searchAndExpandToPage: function (modal, pageId) {
        const self = this;
        
        // Try expanding all nodes recursively to find the page
        console.log('Searching for page ID:', pageId);
        
        // Function to recursively expand all nodes
        function expandAllNodes(container, depth = 0) {
            console.log(`Expanding nodes at depth ${depth}...`);
            const expandables = container.find('.page-tree-toggle.expandable:not(.expanded)');
            
            if (expandables.length > 0) {
                expandables.each(function() {
                    const toggle = $(this);
                    console.log('Expanding toggle for:', toggle.siblings('.page-tree-title').text());
                    toggle.trigger('click');
                });
                
                // Wait a bit for children to load, then expand the next level
                setTimeout(() => {
                    const pageItem = modal.find(`[data-page-id="${pageId}"]`);
                    if (pageItem.length > 0) {
                        console.log('Found page after expanding at depth', depth);
                        self.selectAndScrollToPage(modal, pageItem);
                    } else if (depth < 5) { // Prevent infinite recursion
                        // Try expanding the next level
                        expandAllNodes(modal.find('.page-tree-list'), depth + 1);
                    } else {
                        console.log('Page not found after expanding all levels');
                        // Show all available page IDs for debugging
                        const availableIds = modal.find('[data-page-id]').map(function() { 
                            return $(this).data('page-id'); 
                        }).get();
                        console.log('Available page IDs:', availableIds);
                        console.log('Looking for page ID:', pageId, 'Type:', typeof pageId);
                    }
                }, 200);
            } else {
                console.log('No more expandable nodes at depth', depth);
                // Final check
                const pageItem = modal.find(`[data-page-id="${pageId}"]`);
                if (pageItem.length > 0) {
                    console.log('Found page in final check');
                    self.selectAndScrollToPage(modal, pageItem);
                } else {
                    console.log('Page not found in final check');
                    // Show all available page IDs for debugging
                    const availableIds = modal.find('[data-page-id]').map(function() { 
                        return $(this).data('page-id'); 
                    }).get();
                    console.log('Available page IDs:', availableIds);
                    console.log('Looking for page ID:', pageId, 'Type:', typeof pageId);
                    
                    // Try type conversion - maybe it's a string vs number issue
                    const pageItemAsString = modal.find(`[data-page-id="${pageId.toString()}"]`);
                    const pageItemAsNumber = modal.find(`[data-page-id="${parseInt(pageId)}"]`);
                    console.log('Found as string:', pageItemAsString.length > 0);
                    console.log('Found as number:', pageItemAsNumber.length > 0);
                }
            }
        }
        
        // Start the recursive expansion
        expandAllNodes(modal.find('.page-tree-list'), 0);
    },

    /**
     * Select a page item and scroll to it
     * @param {jQuery} modal - Modal element
     * @param {jQuery} pageItem - Page item element
     */
    selectAndScrollToPage: function (modal, pageItem) {
        // Expand all parent nodes by traversing up the tree
        let currentWrapper = pageItem.closest('.page-tree-item-wrapper');
        let parentChildren = currentWrapper.closest('.page-tree-children');
        
        console.log('Expanding parent nodes...');
        while (parentChildren.length > 0) {
            // Expand the parent children container
            parentChildren.addClass('expanded');
            
            // Find the parent item wrapper and expand its toggle
            const parentWrapper = parentChildren.prev('.page-tree-item-wrapper');
            if (parentWrapper.length > 0) {
                const parentToggle = parentWrapper.find('.page-tree-toggle').first();
                parentToggle.addClass('expanded');
            }
            
            // Move up to the next level
            parentChildren = parentWrapper.closest('.page-tree-children');
        }
        
        // Select the item
        console.log('Selecting page item...');
        pageItem.trigger('click');
        
        // Scroll to the selected item
        const treeList = modal.find('.page-tree-list');
        if (treeList.length > 0 && pageItem.offset()) {
            const scrollTop = pageItem.offset().top - treeList.offset().top + treeList.scrollTop() - 50;
            treeList.scrollTop(scrollTop);
        }
    },
};
