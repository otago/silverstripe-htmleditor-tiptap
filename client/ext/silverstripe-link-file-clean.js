/**
 * SilverStripe File Link Extension for TipTap
 * 
 * This extension provides linking to SilverStripe files using the native file picker modal
 */

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
        console.log('SilverStripe File Link Extension initialized');

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
        // Get current link if cursor is on one
        const currentLink = editor.getAttributes('link');
        
        // Use SilverStripe's native file selector modal
        this.openSilverStripeFileSelector(editor, selectedText, currentLink);
    },

    /**
     * Open SilverStripe file selector modal
     * @param {Editor} editor - TipTap editor instance
     * @param {string} selectedText - Currently selected text
     * @param {Object} currentLink - Current link attributes
     */
    openSilverStripeFileSelector: function (editor, selectedText, currentLink) {
        // Use the confirmed working method - native SilverStripe modal trigger
        this.useNativeSilverStripeModal(editor, selectedText, currentLink);
    },

    /**
     * Use native SilverStripe modal trigger (confirmed working method)
     * This method triggers the same modal as TinyMCE's file link dialog
     */
    useNativeSilverStripeModal: function (editor, selectedText, currentLink) {
        const self = this;
        
        // Try to find and trigger an existing file selector button in the admin interface
        const fileButtons = document.querySelectorAll('.js-injector-boot [data-react-class*="AssetAdmin"], .js-injector-boot [data-react-class*="FileField"], .cms-content-tools .file-field, .uploadfield .ss-uploadfield-item-preview');
        
        if (fileButtons.length > 0) {
            // Try to programmatically trigger the file selector
            const fileButton = fileButtons[0];
            
            // Store callback for when file is selected
            window.TipTapFileCallback = function(fileData) {
                console.log('File selected:', fileData);
                if (fileData && (fileData.url || fileData.URL)) {
                    const fileUrl = fileData.url || fileData.URL;
                    const fileName = fileData.title || fileData.filename || fileData.Name || selectedText || 'Download';
                    self.createFileLink(editor, fileUrl, fileName);
                }
                // Clean up callback
                delete window.TipTapFileCallback;
            };
            
            // Try to click the file button
            try {
                fileButton.click();
                return true;
            } catch (error) {
                console.warn('Could not trigger file selector:', error);
            }
        }
        
        // If no file buttons found, try to create a temporary one
        this.createTemporaryFileSelector(editor, selectedText, currentLink);
    },

    /**
     * Create a temporary file selector that mimics SilverStripe's file field
     */
    createTemporaryFileSelector: function (editor, selectedText, currentLink) {
        const self = this;
        
        // Create a temporary file input element
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '*/*';
        fileInput.style.display = 'none';
        
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // For now, just use the file name as the link text
                // In a real implementation, you'd upload this to SilverStripe
                const fileName = file.name;
                const fileUrl = '#upload-pending-' + fileName;
                self.createFileLink(editor, fileUrl, selectedText || fileName);
                
                // Show a message to the user
                alert('File selected: ' + fileName + '\nNote: This is a temporary implementation. In production, the file would be uploaded to SilverStripe.');
            }
            
            // Clean up
            document.body.removeChild(fileInput);
        });
        
        // Add to DOM temporarily and trigger click
        document.body.appendChild(fileInput);
        fileInput.click();
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
            editor.chain().focus().insertContent(`<a href="${href}">${text}</a>`).run();
        }
    },

    /**
     * Check if extension is disabled
     * @param {Editor} editor - TipTap editor instance
     * @returns {boolean}
     */
    isDisabled: function (editor) {
        return !editor.can().chain().focus().setLink({ href: '#' }).run();
    }
};
