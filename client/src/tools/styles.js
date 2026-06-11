const isAnyStyleActive = (editor, options = []) => {
  const walk = (list) => list.some((option) => {
    if (option.isStyle && option.className) {
      return editor.isActive('textStyle', { class: option.className });
    }

    if (option.isGroup && Array.isArray(option.children)) {
      return walk(option.children);
    }

    return false;
  });

  return walk(options);
};

const applyOrRemoveStyle = (editor, styleClass) => {
  if (!styleClass) {
    return;
  }

  if (editor.isActive('textStyle', { class: styleClass })) {
    if (editor.can().unsetMark('textStyle')) {
      editor.chain().focus().unsetMark('textStyle').run();
    }
    return;
  }

  if (editor.can().setMark('textStyle', { class: styleClass })) {
    editor.chain().focus().setMark('textStyle', { class: styleClass }).run();
  }
};

const createStyleButton = ({ option, editor, dropdown, dropdownMenu, context }) => {
  const {
    constants,
    parseTooltipText,
    addTooltip,
    updateToolbarStates,
  } = context;

  const parts = parseTooltipText(option.text);
  const optionBtn = context.$(`<button type="button" data-style-class="${option.className}" class="${constants.CSS_CLASSES.STYLE_OPTION}">${parts.title}</button>`);

  addTooltip(optionBtn, option.text);

  if (option.previewClass) {
    optionBtn.addClass(option.previewClass);
  }

  optionBtn.on('click', (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (optionBtn.hasClass(constants.CSS_CLASSES.DISABLED)) {
      return;
    }

    applyOrRemoveStyle(editor, option.className);

    dropdownMenu.removeClass(constants.CSS_CLASSES.SHOW);

    setTimeout(() => {
      updateToolbarStates(dropdown.closest(`.${constants.CSS_CLASSES.TOOLBAR}`), editor);
    }, constants.TOOLBAR_UPDATE_DELAY);
  });

  return optionBtn;
};

const createStyleGroup = ({ option, editor, dropdown, dropdownMenu, context }) => {
  const { $, constants } = context;
  const groupItem = $(`<div class="${constants.CSS_CLASSES.DROPDOWN_GROUP_ITEM}">
    <span class="${constants.CSS_CLASSES.GROUP_TEXT}">${option.text}</span>
    <span class="${constants.CSS_CLASSES.GROUP_ARROW}">›</span>
  </div>`);
  const submenu = $(`<div class="${constants.CSS_CLASSES.SUBMENU}"></div>`);

  if (Array.isArray(option.children) && option.children.length > 0) {
    option.children.forEach((child) => {
      if (!child.isStyle) {
        return;
      }

      submenu.append(createStyleButton({
        option: child,
        editor,
        dropdown,
        dropdownMenu,
        context,
      }));
    });
  }

  let submenuTimeout;

  groupItem.on('mouseenter', () => {
    clearTimeout(submenuTimeout);
    const groupOffset = groupItem.offset();
    const groupWidth = groupItem.outerWidth();

    submenu.css({
      position: 'absolute',
      top: groupOffset.top,
      left: groupOffset.left + groupWidth,
      zIndex: constants.Z_INDEX.SUBMENU,
    });

    submenu.addClass(constants.CSS_CLASSES.SHOW);
  });

  groupItem.on('mouseleave', () => {
    submenuTimeout = setTimeout(() => {
      submenu.removeClass(constants.CSS_CLASSES.SHOW);
    }, constants.SUBMENU_HIDE_DELAY);
  });

  submenu.on('mouseenter', () => {
    clearTimeout(submenuTimeout);
  });

  submenu.on('mouseleave', () => {
    submenuTimeout = setTimeout(() => {
      submenu.removeClass(constants.CSS_CLASSES.SHOW);
    }, constants.SUBMENU_HIDE_DELAY);
  });

  groupItem.on('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    submenu.toggleClass(constants.CSS_CLASSES.SHOW);
  });

  $('body').append(submenu);
  groupItem.data('submenu', submenu);

  return groupItem;
};

const stylesTool = {
  action: 'styles',
  getToolbarConfig({ tooltips, styleOptions }) {
    return {
      type: 'dropdown',
      title: tooltips.styles || 'Styles',
      action: 'styles',
      extension: 'textStyle',
      options: styleOptions,
    };
  },
  isActive(editor, config, context) {
    const styleOptions = context.generateStyleOptions(config.styles || {});
    return isAnyStyleActive(editor, styleOptions);
  },
  isDisabled(editor) {
    return !editor.can().setMark('textStyle');
  },
  renderDropdownOptions({ itemConfig, dropdown, dropdownMenu, editor, context }) {
    if (itemConfig.action !== 'styles' || !Array.isArray(itemConfig.options)) {
      return false;
    }

    itemConfig.options.forEach((option) => {
      if (option.isGroup) {
        dropdownMenu.append(createStyleGroup({
          option,
          editor,
          dropdown,
          dropdownMenu,
          context,
        }));
        return;
      }

      if (!option.isStyle) {
        return;
      }

      dropdownMenu.append(createStyleButton({
        option,
        editor,
        dropdown,
        dropdownMenu,
        context,
      }));
    });

    return true;
  },
};

export default stylesTool;
