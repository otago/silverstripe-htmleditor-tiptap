/**
 * SilverStripe internal email extension for TipTap.
 * Inserts email links like: <a href="mailto:example@example.com">example@example.com</a>
 */

if (!window.TipTapExtensions) {
    window.TipTapExtensions = {};
}



window.TipTapExtensions['ss-link-email'] = {
    action: 'ss-link-email',

    getToolbarConfig: function ({ tooltips }) {
        return {
            type: 'button',
            title: (tooltips && tooltips['ss-link-email']) || 'Insert Email',
            action: 'ss-link-email',
            extension: 'custom',
        };
    },

    init: function (editor, config, tiptapInstance) {
        this.editor = editor;
        this.config = config;
        this.tiptapInstance = tiptapInstance;
    },

    run: function ({ editor }) {
        this.openEmailDialog(editor);
    },

    openEmailDialog: function (editor) {
        this.addModalStyles();

        const existingEmail = this.getCurrentEmail(editor);
        const existingName = this.getCurrentLinkText(editor);
        const dialog = this.createDialog(existingEmail || '', existingName || '');

        dialog.find('form').on('submit', (event) => {
            event.preventDefault();

            const rawEmail = dialog.find('input[name="email"]').val();
            const rawName = dialog.find('input[name="name"]').val();
            const email = this.sanitizeEmail(rawEmail);
            const name = this.sanitizeName(rawName);

            if (!email) {
                this.showEmailError(dialog, 'Please enter a valid email address.');
                return;
            }

            this.insertEmail(editor, email, name);
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
        dialog.find('#email').focus().select();
    },

    createDialog: function (email, name) {
        const safeEmail = this.escapeHtmlAttr(email);
        const safeName = this.escapeHtmlAttr(name);
        const html = `
            <div class="anchor-modal-overlay">
                <div class="anchor-modal">
                    <div class="anchor-modal-header">
                        <h3>Insert Email</h3>
                        <button class="anchor-modal-close" type="button">&times;</button>
                    </div>
                    <div class="anchor-modal-body">
                        <form>
                            <div class="form-group">
                                <label for="email">Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    class="form-control"
                                    value="${safeEmail}"
                                    placeholder="example@example.com"
                                    required
                                >
                            </div>
                            <div class="form-group">
                                <label for="name">Name</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    class="form-control"
                                    value="${safeName}"
                                    placeholder="John Doe"
                                >
                            </div>
                        </form>
                    </div>
                    <div class="anchor-modal-footer">
                        <button type="button" class="btn btn-secondary anchor-modal-cancel">Cancel</button>
                        <button type="submit" class="btn btn-primary anchor-modal-insert">Insert Email</button>
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
        if ($('#email-modal-styles').length) {
            return;
        }

        const styles = `
            <style id="email-modal-styles">
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

    getCurrentEmail: function (editor) {
        const anchorElement = this.getCurrentAnchorElement(editor);
        if (!anchorElement) {
            return '';
        }

        const href = anchorElement.getAttribute('href') || '';
        return href.replace(/^mailto:/i, '');
    },

    getCurrentLinkText: function (editor) {
        const anchorElement = this.getCurrentAnchorElement(editor);
        if (!anchorElement) {
            return '';
        }

        return (anchorElement.textContent || '').trim();
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

        return node.closest('a[href^="mailto:"]');
    },

    sanitizeEmail: function (rawValue) {
        if (!rawValue) {
            return '';
        }

        return String(rawValue)
            .trim()
            .replace(/\s+/g, '')
            .replace(/[^A-Za-z0-9@._+-]/g, '');
    },

    sanitizeName: function (rawValue) {
        if (!rawValue) {
            return '';
        }

        return String(rawValue).trim();
    },

    insertEmail: function (editor, email, name) {
        const displayName = name || email;
        const safeHref = this.escapeHtmlAttr(`mailto:${email}`);
        const safeText = this.escapeHtmlText(displayName);
        editor.chain().focus().insertContent(`<a href="${safeHref}">${safeText}</a>`).run();
    },

    showEmailError: function (dialog, message) {
        dialog.find('.email-error').remove();
        const errorHtml = `<div class="email-error" style="color:#c62828;font-size:12px;margin-top:6px;">${this.escapeHtmlText(message)}</div>`;
        dialog.find('#email').closest('.form-group').append(errorHtml);
        dialog.find('#email').focus();
    },

    escapeHtmlAttr: function (value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    },

    escapeHtmlText: function (value) {
        return this.escapeHtmlAttr(value);
    },

    isActive: function (editor) {
        return !!this.getCurrentAnchorElement(editor);
    },

    isDisabled: function () {
        return false;
    },
};
