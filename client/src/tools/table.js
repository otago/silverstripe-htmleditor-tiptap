const TABLE_OPTION_KEYS = {
  insertTable: 'table_insert',
  addColumnBefore: 'table_add_column_before',
  addColumnAfter: 'table_add_column_after',
  deleteColumn: 'table_delete_column',
  addRowBefore: 'table_add_row_before',
  addRowAfter: 'table_add_row_after',
  deleteRow: 'table_delete_row',
  deleteTable: 'table_delete',
  mergeCells: 'table_merge_cells',
  splitCell: 'table_split_cell',
  toggleHeaderColumn: 'table_toggle_header_column',
  toggleHeaderRow: 'table_toggle_header_row',
  toggleHeaderCell: 'table_toggle_header_cell',
};

const TABLE_OPTION_DEFAULTS = {
  insertTable: 'Insert Table',
  addColumnBefore: 'Add Column Before',
  addColumnAfter: 'Add Column After',
  deleteColumn: 'Delete Column',
  addRowBefore: 'Add Row Before',
  addRowAfter: 'Add Row After',
  deleteRow: 'Delete Row',
  deleteTable: 'Delete Table',
  mergeCells: 'Merge Cells',
  splitCell: 'Split Cell',
  toggleHeaderColumn: 'Toggle Header Column',
  toggleHeaderRow: 'Toggle Header Row',
  toggleHeaderCell: 'Toggle Header Cell',
};

const TABLE_OPTION_ORDER = Object.keys(TABLE_OPTION_KEYS);
const TABLE_SIZE_GRID_MAX_ROWS = 10;
const TABLE_SIZE_GRID_MAX_COLS = 10;

const runSimpleAction = (editor, method) => {
  if (!editor.can()[method]()) {
    return;
  }
  editor.chain().focus()[method]().run();
};

export function executeTableAction(action, editor, constants, tableSize = null) {
  if (action === 'insertTable') {
    if (!editor.can().insertTable()) {
      return;
    }

    const rows = Math.max(1, Math.min(TABLE_SIZE_GRID_MAX_ROWS, tableSize?.rows || constants.TABLE_DEFAULT_ROWS));
    const cols = Math.max(1, Math.min(TABLE_SIZE_GRID_MAX_COLS, tableSize?.cols || constants.TABLE_DEFAULT_COLS));

    editor
      .chain()
      .focus()
      .insertTable({
        rows,
        cols,
        withHeaderRow: true,
      })
      .run();
    return;
  }

  if (typeof editor.can()[action] === 'function') {
    runSimpleAction(editor, action);
  }
}

export function isTableActionDisabled(action, editor) {
  switch (action) {
    case 'addColumnBefore':
    case 'addColumnAfter':
      return !editor.can().addColumnBefore() && !editor.can().addColumnAfter();
    case 'addRowBefore':
    case 'addRowAfter':
      return !editor.can().addRowBefore() && !editor.can().addRowAfter();
    default:
      return typeof editor.can()[action] === 'function' ? !editor.can()[action]() : false;
  }
}

export function getTableOptions(tooltips) {
  return TABLE_OPTION_ORDER.map((action) => ({
    action,
    text: tooltips[TABLE_OPTION_KEYS[action]] || TABLE_OPTION_DEFAULTS[action],
  }));
}

const createTableOptionButton = ({ option, editor, dropdown, dropdownMenu, context }) => {
  const {
    $,
    constants,
    parseTooltipText,
    addTooltip,
    updateToolbarStates,
  } = context;

  const optionAction = option.action || '';
  const parts = parseTooltipText(option.text);
  const optionBtn = $(`<button type="button" data-option-action="${optionAction}" data-parent-action="table">${parts.title}</button>`);

  addTooltip(optionBtn, option.text);

  optionBtn.on('click', (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (optionBtn.hasClass(constants.CSS_CLASSES.DISABLED)) {
      return;
    }

    executeTableAction(optionAction, editor, constants);

    dropdownMenu.removeClass(constants.CSS_CLASSES.SHOW);
    setTimeout(() => {
      updateToolbarStates(dropdown.closest(`.${constants.CSS_CLASSES.TOOLBAR}`), editor);
    }, constants.TOOLBAR_UPDATE_DELAY);
  });

  return optionBtn;
};

const updateGridPreview = (gridCells, selectedRows, selectedCols) => {
  gridCells.each(function () {
    const cellElement = this;
    const cellRows = Number(cellElement.getAttribute('data-table-rows'));
    const cellCols = Number(cellElement.getAttribute('data-table-cols'));
    const isSelected = cellRows <= selectedRows && cellCols <= selectedCols;
    cellElement.classList.toggle('is-selected', isSelected);
  });
};

const createInsertTableSizePicker = ({ option, editor, dropdown, dropdownMenu, context }) => {
  const {
    $,
    constants,
    parseTooltipText,
    addTooltip,
    updateToolbarStates,
  } = context;

  const optionAction = option.action || '';
  const parts = parseTooltipText(option.text);

  const container = $('<div class="tiptap-table-size-picker"></div>');
  const insertButton = $(`<button type="button" class="tiptap-table-size-toggle" data-option-action="${optionAction}" data-parent-action="table">${parts.title}</button>`);
  const panel = $('<div class="tiptap-table-size-panel"></div>');
  const preview = $('<div class="tiptap-table-size-preview">1 x 1</div>');
  const grid = $('<div class="tiptap-table-size-grid" role="grid"></div>');

  let currentRows = 1;
  let currentCols = 1;

  addTooltip(insertButton, option.text);

  insertButton.on('click', (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (insertButton.hasClass(constants.CSS_CLASSES.DISABLED)) {
      return;
    }

    panel.toggleClass(constants.CSS_CLASSES.SHOW);
  });

  for (let row = 1; row <= TABLE_SIZE_GRID_MAX_ROWS; row += 1) {
    for (let col = 1; col <= TABLE_SIZE_GRID_MAX_COLS; col += 1) {
      const cell = $(`<button type="button" class="tiptap-table-size-cell" data-table-rows="${row}" data-table-cols="${col}" aria-label="${row} x ${col}"></button>`);

      cell.on('mouseenter', (event) => {
        const target = $(event.currentTarget);
        currentRows = Number(target.attr('data-table-rows'));
        currentCols = Number(target.attr('data-table-cols'));
        preview.text(`${currentRows} x ${currentCols}`);
        updateGridPreview(grid.find('.tiptap-table-size-cell'), currentRows, currentCols);
      });

      cell.on('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (insertButton.hasClass(constants.CSS_CLASSES.DISABLED)) {
          return;
        }

        const target = $(event.currentTarget);
        const rows = Number(target.attr('data-table-rows'));
        const cols = Number(target.attr('data-table-cols'));

        executeTableAction(optionAction, editor, constants, { rows, cols });

        panel.removeClass(constants.CSS_CLASSES.SHOW);
        dropdownMenu.removeClass(constants.CSS_CLASSES.SHOW);
        setTimeout(() => {
          updateToolbarStates(dropdown.closest(`.${constants.CSS_CLASSES.TOOLBAR}`), editor);
        }, constants.TOOLBAR_UPDATE_DELAY);
      });

      grid.append(cell);
    }
  }

  grid.on('mouseleave', () => {
    updateGridPreview(grid.find('.tiptap-table-size-cell'), currentRows, currentCols);
    preview.text(`${currentRows} x ${currentCols}`);
  });

  panel.append(preview, grid);
  container.append(insertButton, panel);

  return container;
};

const tableTool = {
  action: 'table',
  getToolbarConfig({ tooltips }) {
    return {
      type: 'dropdown',
      title: tooltips.table || 'Table',
      action: 'table',
      extension: 'table',
      options: getTableOptions(tooltips),
    };
  },
  isActive(editor) {
    return editor.isActive('table');
  },
  isDisabled(editor) {
    return !editor.can().insertTable();
  },
  runOption({ optionAction, editor, context }) {
    executeTableAction(optionAction, editor, context.constants);
  },
  renderDropdownOptions({ itemConfig, dropdown, dropdownMenu, editor, context }) {
    if (itemConfig.action !== 'table' || !Array.isArray(itemConfig.options)) {
      return false;
    }

    itemConfig.options.forEach((option) => {
      if (option.action === 'insertTable') {
        dropdownMenu.append(createInsertTableSizePicker({
          option,
          editor,
          dropdown,
          dropdownMenu,
          context,
        }));
        return;
      }

      dropdownMenu.append(createTableOptionButton({
        option,
        editor,
        dropdown,
        dropdownMenu,
        context,
      }));
    });

    return true;
  },
  isOptionActive() {
    return false;
  },
  isOptionDisabled({ optionAction, editor }) {
    return isTableActionDisabled(optionAction, editor);
  },
};

export default tableTool;
