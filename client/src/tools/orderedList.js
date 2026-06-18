// note this is a bit more complicated than just a check for is an ordered list.
// we want to be able to embed an ordered list inside a bullet list and vice versa, and 
// if you click the button for one list type when your cursor is in the other list type,
//  we want to convert the nearest ancestor list to the new type, rather than creating a new list inside the existing one.
const hasAncestorListType = (editor, typeName) => {
  const { $from } = editor.state.selection;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === typeName) {
      return true;
    }
  }

  return false;
};

const convertNearestAncestorListType = (editor, fromTypeName, toTypeName) => {
  const { state, view } = editor;
  const { $from } = state.selection;
  const fromType = state.schema.nodes[fromTypeName];
  const toType = state.schema.nodes[toTypeName];

  if (!fromType || !toType) {
    return false;
  }

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type !== fromType) {
      continue;
    }

    const pos = $from.before(depth);
    const tr = state.tr.setNodeMarkup(pos, toType, node.attrs, node.marks);
    view.dispatch(tr);
    editor.commands.focus();
    return true;
  }

  return false;
};

const canToggleOrderedList = (editor) => {
  return editor.can().toggleOrderedList() || hasAncestorListType(editor, 'bulletList');
};

export default {
  action: 'orderedList',
  getToolbarConfig({ tooltips }) {
    return {
      type: 'button',
      title: tooltips.list_ordered || 'Numbered List',
      action: 'orderedList',
      extension: 'orderedList',
    };
  },
  run({ editor }) {
    if (convertNearestAncestorListType(editor, 'bulletList', 'orderedList')) {
      return;
    }

    if (editor.can().toggleOrderedList()) {
      editor.chain().focus().toggleOrderedList().run();
    }
  },
  isActive(editor) {
    // if the first child you run into is the other list type, we want to consider that as an ancestor for the purposes of toggling
    const { $from } = editor.state.selection;

    for (let depth = $from.depth; depth > 0; depth -= 1) {
      if ($from.node(depth).type.name === 'bulletList') {
        return false;
      }
      if ($from.node(depth).type.name === 'orderedList') {
        return true;
      }
    }

    return false;
  },
  isDisabled(editor) {
    return !canToggleOrderedList(editor);
  },
};