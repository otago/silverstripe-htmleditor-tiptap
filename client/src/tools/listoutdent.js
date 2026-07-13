import listindent from "@/tools/listindent.js";

const canOutdent = (editor) => {
   // return false;
    return Boolean(editor && editor.can && editor.can().outdent());
};

export default {
    action: 'listoutdent',

    getToolbarConfig({ tooltips }) {
        return {
            type: 'button',
            title: tooltips.outdent || 'Decrease bullet point indent',
            action: 'listoutdent',
            icon: 'outdent',
        };
    },

    run({ editor }) {
        editor.chain().focus().outdent().run();
    },

    isActive() {
        return false;
    },

    isDisabled(editor) {
        return !canOutdent(editor);
    },
};