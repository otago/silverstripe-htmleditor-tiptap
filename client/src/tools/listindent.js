const canIndent = (editor) => {
    return editor.can().chain().focus().liftListItem('listItem').run();
    return editor.can().chain().focus().sinkListItem('listItem').run();
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
        console.log("indent");
        editor.chain().focus().sinkListItem('listItem').run();
    },

    isActive() {
        return false;
    },

    isDisabled(editor) {
        return !canIndent(editor);
    },
};