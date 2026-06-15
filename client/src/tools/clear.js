import { createCommandTool } from './createCommandTool';


// from https://github.com/awcodes/filament-tiptap-editor/discussions/382
// and https://raw.githubusercontent.com/Leecason/element-tiptap/refs/heads/master/src/utils/format_clear.ts
const FormatMarks = {
  bold: 'bold',
  italic: 'italic',
  underline: 'underline',
  strike: 'strike',
  link: 'link',
  textColor: 'text_color',
  textHighlight: 'text_highlight',
};

const FORMAT_MARK_NAMES = [
  FormatMarks.bold,
  FormatMarks.italic,
  FormatMarks.underline,
  FormatMarks.strike,
  FormatMarks.link,
  FormatMarks.textColor,
  FormatMarks.textHighlight,
];

export function clearMarks(tr, schema) {
  const { doc, selection } = tr;
  if (!selection || !doc) return tr;

  const { from, to, empty } = selection;
  if (empty) return tr;

  const markTypesToRemove = new Set(
    FORMAT_MARK_NAMES.map(n => schema.marks[n]).filter(Boolean)
  );

  if (!markTypesToRemove.size) return tr;

  const tasks = [];
  doc.nodesBetween(from, to, (node, pos) => {
    if (node.marks && node.marks.length) {
      node.marks.forEach(mark => {
        if (markTypesToRemove.has(mark.type)) {
          tasks.push({ node, pos, mark });
        }
      });
      return true;
    }
    return true;
  });

  tasks.forEach(job => {
    const { node, mark, pos } = job;
    tr = tr.removeMark(pos, pos + node.nodeSize, mark.type);
  });

  return tr;
}


export default {
  action: 'clear',
  getToolbarConfig({ tooltips }) {
    return {
      type: 'button',
      title: tooltips.clear || 'Clear Formatting',
      action: 'clear',
      extension: 'clear',
    };
  },
  run({ editor }) {
    // intergrate clearMarks here
      editor.chain().focus().command(({ tr, state }) => {
        const { schema } = state;
        const clearedTr = clearMarks(tr, schema);
        if (clearedTr.docChanged) {
          return clearedTr;
        }
        return false;
      }).run();
  },
  isActive: (editor) => false,
  isDisabled: function (editor) {
    return false;
  },
};