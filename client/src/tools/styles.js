// styles dropdown. handles the dropdown, and the complicated nature of preselecting an area if you've allready set a style

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

// Generate style options from config, supporting nested groups
function generateStyleOptions(stylesConfig) {
  const options = [];

  const processStyleItem = (item, parentPath = '') => {
    if (item.children && Array.isArray(item.children)) {
      // This is a group - add group item and process children
      const groupItem = {
        type: 'group',
        text: item.title || item.text || 'Group',
        isGroup: true,
        children: []
      };

      // Process children
      item.children.forEach(child => {
        if (!child.children || !Array.isArray(child.children)) {
          // This is a style item
          const styleItem = {
            type: 'style',
            text: child.title || child.text || 'Style',
            className: child.className || child.class || '',
            previewClass: child.previewClass || '',
            isStyle: true
          };
          groupItem.children.push(styleItem);
        }
      });

      options.push(groupItem);
    } else {
      // This is a style item
      const styleItem = {
        type: 'style',
        text: item.title || item.text || 'Style',
        className: item.className || item.class || '',
        previewClass: item.previewClass || '',
        isStyle: true
      };
      options.push(styleItem);
    }
  };

  // Process the styles config
  if (Array.isArray(stylesConfig)) {
    stylesConfig.forEach(item => processStyleItem(item));
  } else {
    // Handle object-based config
    Object.keys(stylesConfig).forEach(key => {
      const item = stylesConfig[key];
      if (typeof item === 'object') {
        processStyleItem({ ...item, key });
      }
    });
  }

  // no style options? give them some example common classnames
  if (!options.length) {
    return [{
      type: 'group',
      text: 'Alerts',
      isGroup: true,
      children: [{
        type: 'style',
        text: 'Error',
        className: 'alert-error',
        previewClass: 'alert-error-preview',
        isStyle: true
      }, {
        type: 'style',
        text: 'Info',
        className: 'alert-info',
        previewClass: 'alert-info-preview',
        isStyle: true
      }, {
        type: 'style',
        text: 'Success',
        className: 'alert-success',
        previewClass: 'alert-success-preview',
        isStyle: true
      },]
    }, {
      type: 'style',
      text: 'Highlight',
      className: 'text-highlight',
      previewClass: 'text-highlight-preview',
      isStyle: true
    }];
  }
  return options;
};


const stylesTool = {
  action: 'styles',
  getToolbarConfig({ tooltips }) {
    this.styleOptions = [];
    return {
      type: 'dropdown',
      title: tooltips.styles || 'Styles',
      action: 'styles',
      extension: 'textStyle',
      options: []
    };
  },
  setConfigOptions( styleOptions) {
    this.styleOptions = generateStyleOptions(styleOptions);
  },
  isActive(editor) {
    return isAnyStyleActive(editor, this.styleOptions);
  },
  isDisabled(editor) {
    return !editor.can().setMark('textStyle');
  },
  renderDropdownOptions({ itemConfig, dropdown, dropdownMenu, editor, context }) {

    this.styleOptions.forEach((option) => {
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
