/**
 * SilverStripe internal anchor extension for TipTap.
 * Inserts empty anchors like: <a id="my-anchor"></a>
 */

if (!window.TipTapExtensions) {
    window.TipTapExtensions = {};
}


window.TipTapExtensions['ss-link-anchor'] = {
    action: 'ss-link-anchor',

    getToolbarConfig: function ({ tooltips }) {
        return {
            type: 'button',
            title: (tooltips && tooltips['ss-link-anchor']) || 'Insert Anchor',
            action: 'ss-link-anchor',
            extension: 'custom',
        };
    },

    init: function (editor, config, tiptapInstance) {
        this.editor = editor;
        this.config = config;
        this.tiptapInstance = tiptapInstance;
    },

    run: function ({ editor }) {
        this.openAnchorDialog(editor);
    },

    openAnchorDialog: function (editor) {
        this.addModalStyles();

        const existingAnchorId = this.getCurrentAnchorId(editor);
        const dialog = this.createDialog(existingAnchorId || '');

        dialog.find('form').on('submit', (event) => {
            event.preventDefault();

            const rawAnchorName = dialog.find('input[name="anchor-name"]').val();
            const anchorName = this.sanitizeAnchorName(rawAnchorName);

            if (!anchorName) {
                this.showNameError(dialog, 'Please enter a valid anchor name.');
                return;
            }

            this.insertAnchor(editor, anchorName);
            dialog.remove();
        });

        dialog.find('.anchor-modal-cancel, .anchor-modal-close').on('click', () => {
            dialog.remove();
        });

        dialog.find('.anchor-modal-overlay').on('click', function (event) {
            if (event.target === this) {
                dialog.remove();
            }
        });

        $('body').append(dialog);
        dialog.find('#anchor-name').focus().select();
    },

    createDialog: function (anchorName) {
        const safeValue = this.escapeHtmlAttr(anchorName);
        const html = `
            <div class="anchor-modal-overlay">
                <div class="anchor-modal">
                    <div class="anchor-modal-header">
                        <h3>Insert Internal Anchor</h3>
                        <button class="anchor-modal-close" type="button">&times;</button>
                    </div>
                    <div class="anchor-modal-body">
                        <form>
                            <div class="form-group">
                                <label for="anchor-name">Anchor Name</label>
                                <input
                                    type="text"
                                    id="anchor-name"
                                    name="anchor-name"
                                    class="form-control"
                                    value="${safeValue}"
                                    placeholder="my-section"
                                    required
                                >
                            </div>
                        </form>
                    </div>
                    <div class="anchor-modal-footer">
                        <button type="button" class="btn btn-secondary anchor-modal-cancel">Cancel</button>
                        <button type="submit" class="btn btn-primary anchor-modal-insert">Insert Anchor</button>
                    </div>
                </div>
            </div>
        `;

        const dialog = $(html);
        dialog.find('.anchor-modal-insert').on('click', () => {
            dialog.find('form').trigger('submit');
        });

        return dialog;
    },

    addModalStyles: function () {
        if ($('#anchor-modal-styles').length) {
            return;
        }

        const styles = `
            <style id="anchor-modal-styles">
                .anchor-modal-overlay {
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
                .anchor-modal {
                    background: #fff;
                    border-radius: 8px;
                    width: 90%;
                    max-width: 420px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                    overflow: hidden;
                }
                .anchor-modal-header {
                    padding: 14px 18px;
                    border-bottom: 1px solid #e0e0e0;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .anchor-modal-header h3 {
                    margin: 0;
                    font-size: 17px;
                }
                .anchor-modal-close {
                    background: none;
                    border: none;
                    font-size: 24px;
                    line-height: 1;
                    cursor: pointer;
                    color: #666;
                }
                .anchor-modal-body {
                    padding: 16px 18px;
                }
                .anchor-modal-footer {
                    border-top: 1px solid #e0e0e0;
                    padding: 12px 18px;
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                }
                .anchor-modal .form-group label {
                    display: block;
                    margin-bottom: 6px;
                    font-weight: 600;
                }
                .anchor-modal .form-control {
                    width: 100%;
                    padding: 8px 10px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    box-sizing: border-box;
                }
                .anchor-modal .btn {
                    border: none;
                    border-radius: 4px;
                    padding: 8px 14px;
                    cursor: pointer;
                }
                .anchor-modal .btn-secondary {
                    background: #f4f4f4;
                    color: #444;
                }
                .anchor-modal .btn-primary {
                    background: #007cba;
                    color: #fff;
                }
            </style>
        `;

        $('head').append(styles);
    },

    getCurrentAnchorId: function (editor) {
        const anchorElement = this.getCurrentAnchorElement(editor);
        if (!anchorElement) {
            return '';
        }

        return anchorElement.getAttribute('id') || '';
    },

    getCurrentAnchorElement: function (editor) {
        const position = editor.state.selection.from;
        const domAtPos = editor.view.domAtPos(position);
        let node = domAtPos && domAtPos.node;

        if (!node) {
            return null;
        }

        if (node.nodeType === Node.TEXT_NODE) {
            node = node.parentElement;
        }

        if (!node || node.nodeType !== Node.ELEMENT_NODE) {
            return null;
        }

        return node.closest('a[id]:not([href])');
    },

    sanitizeAnchorName: function (rawValue) {
        if (!rawValue) {
            return '';
        }

        return String(rawValue)
            .trim()
            .replace(/^#+/, '')
            .replace(/\s+/g, '-')
            .replace(/[^A-Za-z0-9_:\-.]/g, '');
    },

    insertAnchor: function (editor, anchorName) {
        editor.chain().focus().insertContent({
            type: 'internalAnchor',
            attrs: { id: anchorName },
        }).run();
    },

    showNameError: function (dialog, message) {
        dialog.find('.anchor-name-error').remove();
        const errorHtml = `<div class="anchor-name-error" style="color:#c62828;font-size:12px;margin-top:6px;">${this.escapeHtmlAttr(message)}</div>`;
        dialog.find('#anchor-name').closest('.form-group').append(errorHtml);
        dialog.find('#anchor-name').focus();
    },

    escapeHtmlAttr: function (value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    },

    isActive: function (editor) {
        return !!this.getCurrentAnchorElement(editor);
    },

    isDisabled: function () {
        return false;
    },
};
