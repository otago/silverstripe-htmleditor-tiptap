
import { Editor, Node, mergeAttributes } from '@tiptap/core';


export default Node.create({
  name: 'internalAnchor',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('id'),
        renderHTML: attributes => {
          if (!attributes.id) {
            return {};
          }
          return { id: attributes.id };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'a[id]:not([href])' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['a', mergeAttributes(HTMLAttributes)];
  },
});