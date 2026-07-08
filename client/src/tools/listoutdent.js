import listindent from "@/tools/listindent.js";

const canOutdent = (editor) => {
    return editor.can().chain().focus().liftListItem('listItem').run();
};

export default {
    action: 'listoutdent',

    getToolbarConfig({ tooltips }) {
        return {
            type: 'button',
            title: tooltips.outdent || 'Decrease indent',
            action: 'listoutdent',
            icon: 'outdent',
        };
    },

    run({ editor }) {
        editor.chain().focus().liftListItem('listItem').run();
    },

    isActive() {
        return false;
    },

    isDisabled(editor) {
        return !canOutdent(editor);
    },
};