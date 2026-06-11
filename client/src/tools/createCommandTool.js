const invoke = (target, method, args = []) => {
  if (!target || typeof target[method] !== 'function') {
    return undefined;
  }
  return target[method](...args);
};

export function createCommandTool({ action, extension, tooltipKey, defaultTitle, canMethod, runMethod, canArgs = [], runArgs = [], isActive }) {
  return {
    action,
    getToolbarConfig({ tooltips }) {
      return {
        type: 'button',
        title: tooltips[tooltipKey] || defaultTitle,
        action,
        extension,
      };
    },
    run({ editor }) {
      if (!invoke(editor.can(), canMethod, canArgs)) {
        return;
      }

      const chain = editor.chain().focus();
      invoke(chain, runMethod, runArgs);
      chain.run();
    },
    isActive(editor) {
      if (typeof isActive === 'function') {
        return isActive(editor);
      }
      return false;
    },
    isDisabled (editor) {
      return !invoke(editor.can(), canMethod, canArgs);
    },
  };
}
