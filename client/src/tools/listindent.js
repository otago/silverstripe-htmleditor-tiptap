const canIndent = (editor) => {
    return Boolean(editor && editor.can &&  editor.can().indent());
};

export default {
    action: 'listindent',

    getToolbarConfig({ tooltips }) {
        return {
            type: 'button',
            title: tooltips.indent || 'Increase indent',
            action: 'listindent',
            icon: 'indent', // or whatever icon your toolbar uses
        };
    },

    run({ editor }) {
        editor.chain().focus().indent().run();
    },

    isActive() {
        return false;
    },

    isDisabled(editor) {
        return !canIndent(editor);
    },
};