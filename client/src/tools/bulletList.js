// this is similar to orderedlist.js, only with bullets instead. 
// the extra complexity is that if you have an ordered list and click the bullet list button, we want to convert the ordered list to a bullet list, and vice versa.
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

const canToggleBulletList = (editor) => {
  return editor.can().toggleBulletList() || hasAncestorListType(editor, 'orderedList');
};

export default {
  action: 'bulletList',
  getToolbarConfig({ tooltips }) {
    return {
      type: 'button',
      title: tooltips.list_bullet || 'Bullet List',
      action: 'bulletList',
      extension: 'bulletList',
    };
  },
  run({ editor }) {
    if (convertNearestAncestorListType(editor, 'orderedList', 'bulletList')) {
      return;
    }

    if (editor.can().toggleBulletList()) {
      editor.chain().focus().toggleBulletList().run();
    }
  },
  isActive(editor) {
    // if the first child you run into is the other list type, we want to consider that as an ancestor for the purposes of toggling
    const { $from } = editor.state.selection;

    for (let depth = $from.depth; depth > 0; depth -= 1) {
      if ($from.node(depth).type.name === 'orderedList') {
        return false;
      }
      if ($from.node(depth).type.name === 'bulletList') {
        return true;
      }
    }

    return false;
  },
  isDisabled(editor) {
    return !canToggleBulletList(editor);
  },
};