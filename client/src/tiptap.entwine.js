// src/tiptap.entwine.js
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TextStyle from '@tiptap/extension-text-style';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import screenfull from 'screenfull';

(function ($) {
  // Configuration constants
  const CONSTANTS = {
    // Timing constants
    TOOLBAR_UPDATE_DELAY: 10,
    SUBMENU_HIDE_DELAY: 200,

    // Table configuration
    TABLE_MIN_WIDTH: 50,
    TABLE_DEFAULT_ROWS: 3,
    TABLE_DEFAULT_COLS: 3,

    // CSS classes
    CSS_CLASSES: {
      WRAPPER: 'tiptap-wrapper',
      TOOLBAR: 'tiptap-toolbar',
      FOCUSED: 'editor-focused',
      FULLSCREEN: 'tiptap-fullscreen',
      HTML_SOURCE: 'html-source-mode',
      HTML_TEXTAREA: 'tiptap-html-source',
      TOOLTIP: 'tiptap-tooltip',
      SHOW: 'show',
      DROPDOWN: 'dropdown',
      DROPDOWN_MENU: 'dropdown-menu',
      SUBMENU: 'tiptap-dropdown-submenu',
      DROPDOWN_GROUP_ITEM: 'tiptap-dropdown-group-item',
      STYLE_OPTION: 'tiptap-style-option',
      ACTIVE: 'active',
      DISABLED: 'disabled',
      SEPARATOR: 'toolbar-separator',
      NEWLINE: 'toolbar-newline',
      TABLE_DROPDOWN: 'table-dropdown',
      PROSEMIRROR: 'ProseMirror',
      GROUP_TEXT: 'group-text',
      GROUP_ARROW: 'group-arrow'
    },

    // Z-index values
    Z_INDEX: {
      TOOLTIP: 1001,
      SUBMENU: 1002
    },

    // Error messages
    ERROR_MESSAGES: {
      INVALID_JSON: 'Invalid JSON in TipTap config:',
      NO_CONFIG: 'TipTap: No config provided. Make sure TipTapFieldExtension is properly configured.',
      EXTENSION_NOT_FOUND: 'TipTap Extension not found:',
      EXTENSION_INIT_ERROR: 'Error initializing TipTap extension:'
    }
  };

  $.entwine('ss', function ($) {
    $('textarea.htmleditor').entwine({
      onmatch: function () {
        let config;
        try {
          // First try to get config from data-tiptap-config attribute (from PHP extension)
          const configAttr = this.attr('data-tiptap-config');
          if (configAttr) {
            config = JSON.parse(configAttr);
          } else {
            // Fallback to legacy data-config attribute
            config = JSON.parse(this.data('config') || '{}');
          }
        } catch (e) {
          console.warn(CONSTANTS.ERROR_MESSAGES.INVALID_JSON, e);
          config = {};
        }

        // Config should always be provided by PHP extension from YML
        if (Object.keys(config).length === 0) {
          console.error(CONSTANTS.ERROR_MESSAGES.NO_CONFIG);
          return;
        }

        if (!this.data('tiptap-initialized')) {
          // Create wrapper div for the editor
          const wrapper = $(`<div class="${CONSTANTS.CSS_CLASSES.WRAPPER}"></div>`);
          this.after(wrapper);
          this.hide();

          // Configure all available extensions
          const extensions = [
            StarterKit.configure({
              // Configure specific extensions within StarterKit
              heading: {
                levels: config.headingLevels || [1, 2, 3]
              }
            }),
            // Additional extensions not included in StarterKit
            Underline,
            Image,
            Highlight,
            Link.configure({
              openOnClick: false,
              HTMLAttributes: {
                // Change rel to different value
                // Allow search engines to follow links(remove nofollow)
                rel: null,
                // Remove target entirely so links open in current tab
                target: null,
              },
            }),
            TextAlign.configure({
              types: ['heading', 'paragraph'],
              alignments: ['left', 'center', 'right', 'justify'],
              defaultAlignment: 'left'
            }),
            Subscript,
            Superscript,
            TextStyle.extend({
              addAttributes() {
                return {
                  ...this.parent?.() || {},
                  class: {
                    default: null,
                    parseHTML: element => element.getAttribute('class'),
                    renderHTML: attributes => {
                      if (!attributes.class) return {}
                      return { class: attributes.class }
                    }
                  }
                }
              }
            }),
            Table.configure({
              resizable: true,
              cellMinWidth: CONSTANTS.TABLE_MIN_WIDTH,
            }),
            TableRow,
            TableHeader,
            TableCell
          ];

          // Create TipTap editor
          const editor = new Editor({
            element: wrapper[0],
            extensions: extensions,
            content: this.val() || config.content || '',
            autofocus: config.autofocus || false,
            onUpdate: ({ editor }) => {
              // Sync content back to textarea
              const html = editor.getHTML();
              this.val(html);

              // Trigger change event for SilverStripe form handling
              this.trigger('change');
            },
            onCreate: ({ editor }) => {

              // Add basic toolbar if enabled
              if (config.toolbar !== false) {
                this.createToolbar(wrapper, editor, config);
              }

              // Add focus/blur handlers for toolbar styling
              const proseMirrorElement = wrapper.find(`.${CONSTANTS.CSS_CLASSES.PROSEMIRROR}`)[0];
              if (proseMirrorElement) {
                proseMirrorElement.addEventListener('focus', () => {
                  wrapper.addClass(CONSTANTS.CSS_CLASSES.FOCUSED);
                });

                proseMirrorElement.addEventListener('blur', () => {
                  wrapper.removeClass(CONSTANTS.CSS_CLASSES.FOCUSED);
                });
              }

              // Add fullscreen change handlers
              if (screenfull.isEnabled) {
                const self = this;
                screenfull.on('change', () => {
                  const toolbar = wrapper.find(`.${CONSTANTS.CSS_CLASSES.TOOLBAR}`);
                  if (toolbar.length) {
                    self.updateToolbarStates(toolbar, editor);
                  }

                  // Add/remove fullscreen class for styling
                  wrapper.toggleClass(CONSTANTS.CSS_CLASSES.FULLSCREEN, screenfull.isFullscreen);
                });
              }
            },
            onDestroy: () => {
            }
          });

          // Add keyboard shortcuts
          this.addKeyboardShortcuts(wrapper, editor);

          // Store references
          this.data('tiptap-editor', editor);
          this.data('tiptap-wrapper', wrapper);
          this.data('tiptap-config', config);
          this.data('tiptap-initialized', true);
        }

        this._super();
      },

      onunmatch: function () {
        const editor = this.data('tiptap-editor');
        const wrapper = this.data('tiptap-wrapper');

        if (editor) {
          editor.destroy();
          this.removeData('tiptap-editor');
          this.removeData('tiptap-initialized');
        }

        if (wrapper) {
          // Clean up any tooltips
          wrapper.find('button').each(function () {
            const tooltip = $(this).data('tooltip');
            if (tooltip) {
              tooltip.remove();
            }
          });

          // Clean up any submenus
          wrapper.find(`.${CONSTANTS.CSS_CLASSES.DROPDOWN_GROUP_ITEM}`).each(function () {
            const submenu = $(this).data('submenu');
            if (submenu) {
              submenu.remove();
            }
          });

          wrapper.remove();
          this.removeData('tiptap-wrapper');
        }

        this.show(); // Show original textarea

        this._super();
      },

      // Generate style options from config, supporting nested groups
      generateStyleOptions: function (stylesConfig) {
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
                  previewClass: child.previewClass || child.className || child.class || '',
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
              previewClass: item.previewClass || item.className || item.class || '',
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

        return options;
      },

      // Get available toolbar items configuration
      getToolbarItemsConfig: function (config) {
        // Get tooltips from config (provided by PHP extension)
        const tooltips = config.tooltips || {};


        // Generate styles options from config
        const styleOptions = this.generateStyleOptions(config.styles || {});

        return {
          'bold': {
            type: 'button',
            title: tooltips.bold || 'Bold',
            action: 'bold',
            extension: 'bold'
          },
          'italic': {
            type: 'button',
            title: tooltips.italic || 'Italic',
            action: 'italic',
            extension: 'italic'
          },
          'underline': {
            type: 'button',
            title: tooltips.underline || 'Underline',
            action: 'underline',
            extension: 'underline'
          },
          'strikethrough': {
            type: 'button',
            title: tooltips.strikethrough || 'Strikethrough',
            action: 'strikethrough',
            extension: 'strike'
          },
          'paragraph': {
            type: 'button',
            title: tooltips.paragraph || 'Paragraph',
            action: 'paragraph',
            extension: 'heading'
          },
          'heading1': {
            type: 'button',
            title: tooltips.heading1 || 'Heading 1',
            action: 'heading1',
            extension: 'heading'
          },
          'heading2': {
            type: 'button',
            title: tooltips.heading2 || 'Heading 2',
            action: 'heading2',
            extension: 'heading'
          },
          'heading3': {
            type: 'button',
            title: tooltips.heading3 || 'Heading 3',
            action: 'heading3',
            extension: 'heading'
          },
          'heading4': {
            type: 'button',
            title: tooltips.heading4 || 'Heading 4',
            action: 'heading4',
            extension: 'heading'
          },
          'heading5': {
            type: 'button',
            title: tooltips.heading5 || 'Heading 5',
            action: 'heading5',
            extension: 'heading'
          },
          'heading6': {
            type: 'button',
            title: tooltips.heading6 || 'Heading 6',
            action: 'heading6',
            extension: 'heading'
          },
          'bulletList': {
            type: 'button',
            title: tooltips.list_bullet || 'Bullet List',
            action: 'bulletList',
            extension: 'bulletList'
          },
          'orderedList': {
            type: 'button',
            title: tooltips.list_ordered || 'Numbered List',
            action: 'orderedList',
            extension: 'orderedList'
          },
          'alignLeft': {
            type: 'button',
            title: tooltips.align_left || 'Align Left',
            action: 'alignLeft',
            extension: 'textAlign'
          },
          'alignCenter': {
            type: 'button',
            title: tooltips.align_center || 'Align Center',
            action: 'alignCenter',
            extension: 'textAlign'
          },
          'alignRight': {
            type: 'button',
            title: tooltips.align_right || 'Align Right',
            action: 'alignRight',
            extension: 'textAlign'
          },
          'alignJustify': {
            type: 'button',
            title: tooltips.align_justify || 'Justify',
            action: 'alignJustify',
            extension: 'textAlign'
          },
          'styles': {
            type: 'dropdown',
            title: tooltips.styles || 'Styles',
            action: 'styles',
            extension: 'textStyle',
            options: styleOptions
          },
          'blockquote': {
            type: 'button',
            title: tooltips.blockquote || 'Quote',
            action: 'blockquote',
            extension: 'blockquote'
          },
          'horizontalRule': {
            type: 'button',
            title: tooltips.horizontalRule || 'Insert Horizontal Rule',
            action: 'horizontalRule',
            extension: 'horizontalRule'
          },
          'codeBlock': {
            type: 'button',
            title: tooltips.codeBlock || 'Code Block',
            action: 'codeBlock',
            extension: 'codeBlock'
          },
          'code': {
            type: 'button',
            title: tooltips.code || 'Inline Code',
            action: 'code',
            extension: 'code'
          },
          'highlight': {
            type: 'button',
            title: tooltips.highlight || 'Highlight',
            action: 'highlight',
            extension: 'highlight'
          },
          'subscript': {
            type: 'button',
            title: tooltips.subscript || 'Subscript',
            action: 'subscript',
            extension: 'subscript'
          },
          'superscript': {
            type: 'button',
            title: tooltips.superscript || 'Superscript',
            action: 'superscript',
            extension: 'superscript'
          },
          'link': {
            type: 'button',
            title: tooltips.link || 'Link',
            action: 'link',
            extension: 'link'
          },
          'image': {
            type: 'button',
            title: tooltips.image || 'Image',
            action: 'image',
            extension: 'image'
          },
          'undo': {
            type: 'button',
            title: tooltips.undo || 'Undo',
            action: 'undo',
            extension: 'history'
          },
          'redo': {
            type: 'button',
            title: tooltips.redo || 'Redo',
            action: 'redo',
            extension: 'history'
          },
          'fullscreen': {
            type: 'button',
            title: tooltips.fullscreen || 'Toggle Fullscreen',
            action: 'fullscreen',
            extension: 'custom'
          },
          'htmlSource': {
            type: 'button',
            title: tooltips.htmlSource || 'HTML Source',
            action: 'htmlSource',
            extension: 'custom'
          },
          'table': {
            type: 'dropdown',
            title: tooltips.table || 'Table',
            action: 'table',
            extension: 'table',
            options: [
              { action: 'insertTable', text: tooltips.table_insert || 'Insert Table' },
              { action: 'addColumnBefore', text: tooltips.table_add_column_before || 'Add Column Before' },
              { action: 'addColumnAfter', text: tooltips.table_add_column_after || 'Add Column After' },
              { action: 'deleteColumn', text: tooltips.table_delete_column || 'Delete Column' },
              { action: 'addRowBefore', text: tooltips.table_add_row_before || 'Add Row Before' },
              { action: 'addRowAfter', text: tooltips.table_add_row_after || 'Add Row After' },
              { action: 'deleteRow', text: tooltips.table_delete_row || 'Delete Row' },
              { action: 'deleteTable', text: tooltips.table_delete || 'Delete Table' },
              { action: 'mergeCells', text: tooltips.table_merge_cells || 'Merge Cells' },
              { action: 'splitCell', text: tooltips.table_split_cell || 'Split Cell' },
              { action: 'toggleHeaderColumn', text: tooltips.table_toggle_header_column || 'Toggle Header Column' },
              { action: 'toggleHeaderRow', text: tooltips.table_toggle_header_row || 'Toggle Header Row' },
              { action: 'toggleHeaderCell', text: tooltips.table_toggle_header_cell || 'Toggle Header Cell' }
            ]
          },
          'dropdown': {
            type: 'dropdown',
            title: 'Dropdown',
            action: 'dropdown',
            extension: 'custom',
            options: [] // Will be populated dynamically from config.extensions
          },
          'newline': {
            type: 'newline'
          },
          'separator': {
            type: 'separator'
          }
        };
      },

      // Helper method to create a configurable toolbar
      createToolbar: function (wrapper, editor, config) {
        const toolbar = $(`<div class="${CONSTANTS.CSS_CLASSES.TOOLBAR}"></div>`);

        // Process extensions first
        this.createToolbarProcessExtensions(config, editor);

        // Build toolbar items
        this.createToolbarItems(toolbar, config, editor);

        // Setup event listeners
        this.createToolbarEventListeners(wrapper, toolbar, editor);
      },

      // Process extensions for toolbar
      createToolbarProcessExtensions: function (config, editor) {
        if (config.extensions) {
          this.initializeExtensions(config.extensions, editor, config);
        }
      },

      // Build toolbar items based on configuration
      createToolbarItems: function (toolbar, config, editor) {
        const toolbarConfig = this.getToolbarItemsConfig(config);
        const toolbarLayout = config.toolbar || [];

        // Build toolbar based on configuration
        toolbarLayout.forEach(item => {
          let itemName, itemConfig;

          // Handle grouped objects (like dropdown: { title: 'Links', icon: 'links', actions: [...] })
          if (typeof item === 'object' && item !== null) {
            const dropdown = this.createGenericDropdown(item, itemConfig, editor, config);
            if (dropdown) {
              toolbar.append(dropdown);
            }
            return;
          } else {
            // Regular string item
            itemName = item;
            itemConfig = toolbarConfig[itemName];
          }

          // loading extensions to main toolbar
          if (!itemConfig) {
            let buttontitle = config.tooltips && config.tooltips[itemName] ? config.tooltips[itemName] : itemName;

            // Parse tooltip to extract just the title part for button text
            const parts = this.parseTooltipText(buttontitle);
console.log('buttontitle', buttontitle, parts, config.tooltips);
            const itemConfig = {
              action: itemName,
              extension: itemName,
              title: buttontitle, // Full text with shortcuts for tooltip
              type: "button",
              buttontext: '' // Just the title part for button text
            };
            const button = this.createToolbarButton(itemConfig, editor);
            toolbar.append(button);
            return;
          }

          if (itemConfig.type === 'separator') {
            // Add separator
            const separator = $(`<div class="${CONSTANTS.CSS_CLASSES.SEPARATOR}"></div>`);
            toolbar.append(separator);
            return;
          }

          if (itemConfig.type === 'newline') {
            // Add line break - force wrap to new line
            const lineBreak = $(`<div class="${CONSTANTS.CSS_CLASSES.NEWLINE}"></div>`);
            toolbar.append(lineBreak);
            return;
          }

          // Check if required extension is available (skip check for custom buttons)
          const requiredExtensions = Array.isArray(itemConfig.extension) ? itemConfig.extension : [itemConfig.extension];
          const hasRequiredExtension = itemConfig.extension === 'custom' || requiredExtensions.some(extName =>
            editor.extensionManager.extensions.find(ext => ext.name === extName)
          );

          if (!hasRequiredExtension) {
            return;
          }

          if (itemConfig.type === 'button') {
            // Create button
            itemConfig.buttontext = '';
            const button = this.createToolbarButton(itemConfig, editor);
            toolbar.append(button);
          } else if (itemConfig.type === 'dropdown') {
            // Create dropdown
            // For extension dropdowns, pass the toolbarConfig and itemName for context
            const dropdown = this.createToolbarDropdown(itemConfig, editor, toolbarConfig[itemName]);
            toolbar.append(dropdown);
          }
        });
      },

      // Setup event listeners for toolbar
      createToolbarEventListeners: function (wrapper, toolbar, editor) {
        // Add toolbar to wrapper
        wrapper.prepend(toolbar);

        // Update button states on selection change
        editor.on('selectionUpdate', () => {
          this.updateToolbarStates(toolbar, editor);
        });
      },

      // Initialize extensions
      initializeExtensions: function (extensions, editor, config) {
        Object.keys(extensions).forEach(extensionName => {
          if (window.TipTapExtensions && window.TipTapExtensions[extensionName]) {
            const ExtensionClass = window.TipTapExtensions[extensionName];
            if (typeof ExtensionClass.init === 'function') {
              ExtensionClass.init(editor, config, this);
            }
            if (typeof ExtensionClass.setCMSContext === 'function') {
                ExtensionClass.setCMSContext(this.getCMSContext());
            }
          }
        });
      },

 
      // Add dropdown toggle functionality
      addDropdownToggle: function (button, dropdownMenu) {
        button.on('click', (e) => {
          e.preventDefault();
          e.stopPropagation();

          // Hide any visible tooltips when dropdown is clicked
          $(`.${CONSTANTS.CSS_CLASSES.TOOLTIP}.${CONSTANTS.CSS_CLASSES.SHOW}`).removeClass(CONSTANTS.CSS_CLASSES.SHOW);

          // Close all other dropdowns in the same toolbar
          const toolbar = button.closest(`.${CONSTANTS.CSS_CLASSES.TOOLBAR}`);
          toolbar.find(`.${CONSTANTS.CSS_CLASSES.DROPDOWN_MENU}`).not(dropdownMenu).removeClass(CONSTANTS.CSS_CLASSES.SHOW);

          // Toggle this dropdown
          dropdownMenu.toggleClass(CONSTANTS.CSS_CLASSES.SHOW);
        });

        // Close dropdown when clicking outside
        $(document).on('click', () => {
          dropdownMenu.removeClass('show');
          // Clean up any open submenus
          dropdownMenu.find(`.${CONSTANTS.CSS_CLASSES.DROPDOWN_GROUP_ITEM}`).each(function () {
            const submenu = $(this).data('submenu');
            if (submenu) {
              submenu.removeClass('show');
            }
          });
          // Hide any visible tooltips when clicking outside
          $('.tiptap-tooltip.show').removeClass('show');
        });
      },

      // Create generic dropdown for grouped objects
      createGenericDropdown: function (item, dropdownConfig, editor, config) {
        const dropdown = $(`<div class="${CONSTANTS.CSS_CLASSES.DROPDOWN}"></div>`);
        const button = $(`<button type="button" data-action="${item.title}" class="${item.icon}"></button>`);
        const dropdownMenu = $(`<div class="${CONSTANTS.CSS_CLASSES.DROPDOWN_MENU}"></div>`);

        // Add tooltip functionality
        this.addTooltip(button, item.title);

        // Add dropdown items
        item.items.forEach(action => {
          if (typeof action === 'string') {
            // Simple string action - look up in toolbar config
            let buttontitle = config.tooltips && config.tooltips[action] ? config.tooltips[action] : action;

            // Parse tooltip to extract just the title part for button text
            const parts = this.parseTooltipText(buttontitle);

            const actionConfig = {
              action: action,
              extension: action,
              title: buttontitle, // Full text with shortcuts for tooltip
              type: "button",
              buttontext: parts.title // Just the title part for button text
            };

            const actionButton = this.createToolbarButton(actionConfig, editor);
            if (actionButton) {
              dropdownMenu.append(actionButton);
            }
          }
        });

        // Add dropdown toggle functionality
        this.addDropdownToggle(button, dropdownMenu);

        dropdown.append(button);
        dropdown.append(dropdownMenu);

        return dropdown;
      },

      // Create a toolbar button
      createToolbarButton: function (itemConfig, editor) {
        const button = $(`<button type="button" data-action="${itemConfig.action}">${itemConfig.buttontext}</button>`);
        const self = this;

        // Add tooltip functionality
        this.addTooltip(button, itemConfig.title);

        // on button click
        button.on('click', (e) => {
          e.preventDefault();

          // Check if button is disabled
          if (button.hasClass(CONSTANTS.CSS_CLASSES.DISABLED)) {
            return;
          }


          // if you click an extension button, call its onClick method if available
          const ExtensionClass = window.TipTapExtensions[itemConfig.action];
          if (ExtensionClass) {
            if (typeof ExtensionClass.onClick === 'function') {
              ExtensionClass.onClick(editor, itemConfig, this);
            } else if (typeof ExtensionClass.openLinkDialog === 'function') {
              ExtensionClass.openLinkDialog(editor);
            }
          }

          switch (itemConfig.action) {
            case 'bold':
              if (editor.can().toggleBold()) {
                editor.chain().focus().toggleBold().run();
              }
              break;
            case 'italic':
              if (editor.can().toggleItalic()) {
                editor.chain().focus().toggleItalic().run();
              }
              break;
            case 'underline':
              if (editor.can().toggleUnderline()) {
                editor.chain().focus().toggleUnderline().run();
              }
              break;
            case 'strikethrough':
              if (editor.can().toggleStrike()) {
                editor.chain().focus().toggleStrike().run();
              }
              break;
            case 'blockquote':
              if (editor.can().toggleBlockquote()) {
                editor.chain().focus().toggleBlockquote().run();
              }
              break;
            case 'horizontalRule':
              if (editor.can().setHorizontalRule()) {
                editor.chain().focus().setHorizontalRule().run();
              }
              break;
            case 'codeBlock':
              if (editor.can().toggleCodeBlock()) {
                editor.chain().focus().toggleCodeBlock().run();
              }
              break;
            case 'code':
              if (editor.can().toggleCode()) {
                editor.chain().focus().toggleCode().run();
              }
              break;
            case 'highlight':
              if (editor.can().toggleHighlight()) {
                editor.chain().focus().toggleHighlight().run();
              }
              break;
            case 'subscript':
              if (editor.can().toggleSubscript()) {
                editor.chain().focus().toggleSubscript().run();
              }
              break;
            case 'superscript':
              if (editor.can().toggleSuperscript()) {
                editor.chain().focus().toggleSuperscript().run();
              }
              break;
            case 'bulletList':
              if (editor.can().toggleBulletList()) {
                editor.chain().focus().toggleBulletList().run();
              }
              break;
            case 'orderedList':
              if (editor.can().toggleOrderedList()) {
                editor.chain().focus().toggleOrderedList().run();
              }
              break;
            case 'alignLeft':
              if (editor.can().setTextAlign('left')) {
                editor.chain().focus().setTextAlign('left').run();
              }
              break;
            case 'alignCenter':
              if (editor.can().setTextAlign('center')) {
                editor.chain().focus().setTextAlign('center').run();
              }
              break;
            case 'alignRight':
              if (editor.can().setTextAlign('right')) {
                editor.chain().focus().setTextAlign('right').run();
              }
              break;
            case 'alignJustify':
              if (editor.can().setTextAlign('justify')) {
                editor.chain().focus().setTextAlign('justify').run();
              }
              break;
            case 'link':
              // TODO: Implement link dialog
              const url = prompt('Enter URL:');
              if (url && editor.can().setLink({ href: url })) {
                editor.chain().focus().setLink({ href: url }).run();
              }
              break;
            case 'image':
              // TODO: Implement image dialog
              const src = prompt('Enter image URL:');
              if (src && editor.can().setImage({ src })) {
                editor.chain().focus().setImage({ src }).run();
              }
              break;
            case 'undo':
              if (editor.can().undo()) {
                editor.chain().focus().undo().run();
              }
              break;
            case 'redo':
              if (editor.can().redo()) {
                editor.chain().focus().redo().run();
              }
              break;
            case 'fullscreen':
              if (screenfull.isEnabled) {
                const wrapper = button.closest('.tiptap-wrapper')[0];
                if (screenfull.isFullscreen) {
                  screenfull.exit();
                } else {
                  screenfull.request(wrapper);
                }
              }
              break;
            case 'htmlSource':
              self.toggleHtmlSource(editor, button);
              break;
            case 'paragraph':
              if (editor.can().setParagraph()) {
                editor.chain().focus().setParagraph().run();
              }
              break;
            case 'heading1':
              if (editor.can().toggleHeading({ level: 1 })) {
                editor.chain().focus().toggleHeading({ level: 1 }).run();
              }
              break;
            case 'heading2':
              if (editor.can().toggleHeading({ level: 2 })) {
                editor.chain().focus().toggleHeading({ level: 2 }).run();
              }
              break;
            case 'heading3':
              if (editor.can().toggleHeading({ level: 3 })) {
                editor.chain().focus().toggleHeading({ level: 3 }).run();
              }
              break;
            case 'heading4':
              if (editor.can().toggleHeading({ level: 4 })) {
                editor.chain().focus().toggleHeading({ level: 4 }).run();
              }
              break;
            case 'heading5':
              if (editor.can().toggleHeading({ level: 5 })) {
                editor.chain().focus().toggleHeading({ level: 5 }).run();
              }
              break;
            case 'heading6':
              if (editor.can().toggleHeading({ level: 6 })) {
                editor.chain().focus().toggleHeading({ level: 6 }).run();
              }
              break;
          }

          // Refresh toolbar states after action
          setTimeout(() => {
            self.updateToolbarStates(button.closest(`.${CONSTANTS.CSS_CLASSES.TOOLBAR}`), editor);
          }, CONSTANTS.TOOLBAR_UPDATE_DELAY);
        });

        return button;
      },

      // Create a toolbar dropdown
      createToolbarDropdown: function (itemConfig, editor, toolbarConfig) {
        const dropdown = $(`<div class="${CONSTANTS.CSS_CLASSES.DROPDOWN}"></div>`);
        const button = $(`<button type="button" data-action="${itemConfig.action}"></button>`);
        const dropdownMenu = $(`<div class="${CONSTANTS.CSS_CLASSES.DROPDOWN_MENU}"></div>`);
        const self = this;

        // Add special class for table dropdown to allow wider styling
        if (itemConfig.action === 'table') {
          dropdownMenu.addClass(CONSTANTS.CSS_CLASSES.TABLE_DROPDOWN);
        }

        // Add tooltip functionality
        this.addTooltip(button, itemConfig.title);

        // Add dropdown options
        if (itemConfig.options) {
          itemConfig.options.forEach(option => {
            let optionBtn;

            if (itemConfig.action === 'heading') {
              // Heading dropdown
              const parts = this.parseTooltipText(option.text);
              optionBtn = $(`<button type="button" data-level="${option.level || 'paragraph'}">${parts.title}</button>`);

              // Add tooltip if there's a shortcut or always for consistency
              this.addTooltip(optionBtn, option.text);

              optionBtn.on('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Check if button is disabled
                if (optionBtn.hasClass(CONSTANTS.CSS_CLASSES.DISABLED)) {
                  return;
                }

                if (option.level) {
                  if (editor.can().toggleHeading({ level: option.level })) {
                    editor.chain().focus().toggleHeading({ level: option.level }).run();
                  }
                } else {
                  if (editor.can().setParagraph()) {
                    editor.chain().focus().setParagraph().run();
                  }
                }

                dropdownMenu.removeClass(CONSTANTS.CSS_CLASSES.SHOW);

                // Refresh toolbar states after action
                setTimeout(() => {
                  self.updateToolbarStates(dropdown.closest(`.${CONSTANTS.CSS_CLASSES.TOOLBAR}`), editor);
                }, CONSTANTS.TOOLBAR_UPDATE_DELAY);
              });
            } else if (itemConfig.action === 'bulletList') {
              // List dropdown
              const parts = this.parseTooltipText(option.text);
              optionBtn = $(`<button type="button" data-list-type="${option.type}">${parts.title}</button>`);

              // Add tooltip if there's a shortcut or always for consistency
              this.addTooltip(optionBtn, option.text);

              optionBtn.on('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Check if button is disabled
                if (optionBtn.hasClass(CONSTANTS.CSS_CLASSES.DISABLED)) {
                  return;
                }

                if (option.type === 'bulletList') {
                  if (editor.can().toggleBulletList()) {
                    editor.chain().focus().toggleBulletList().run();
                  }
                } else if (option.type === 'orderedList') {
                  if (editor.can().toggleOrderedList()) {
                    editor.chain().focus().toggleOrderedList().run();
                  }
                }

                dropdownMenu.removeClass(CONSTANTS.CSS_CLASSES.SHOW);

                // Refresh toolbar states after action
                setTimeout(() => {
                  self.updateToolbarStates(dropdown.closest(`.${CONSTANTS.CSS_CLASSES.TOOLBAR}`), editor);
                }, CONSTANTS.TOOLBAR_UPDATE_DELAY);
              });
            } else if (itemConfig.action === 'styles') {
              // Styles dropdown
              if (option.isGroup) {
                // Group/submenu item
                const groupItem = $(`<div class="${CONSTANTS.CSS_CLASSES.DROPDOWN_GROUP_ITEM}">
                  <span class="${CONSTANTS.CSS_CLASSES.GROUP_TEXT}">${option.text}</span>
                  <span class="${CONSTANTS.CSS_CLASSES.GROUP_ARROW}">›</span>
                </div>`);

                // Create submenu
                const submenu = $(`<div class="${CONSTANTS.CSS_CLASSES.SUBMENU}"></div>`);

                // Add child items to submenu
                if (option.children && option.children.length > 0) {
                  option.children.forEach(child => {
                    if (child.isStyle) {
                      const parts = this.parseTooltipText(child.text);
                      const childBtn = $(`<button type="button" data-style-class="${child.className}" class="${CONSTANTS.CSS_CLASSES.STYLE_OPTION}">${parts.title}</button>`);

                      // Add tooltip if there's a shortcut or always for consistency
                      this.addTooltip(childBtn, child.text);

                      // Add preview class to the button for styling
                      if (child.previewClass) {
                        childBtn.addClass(child.previewClass);
                      }

                      childBtn.on('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        // Check if button is disabled
                        if (childBtn.hasClass(CONSTANTS.CSS_CLASSES.DISABLED)) {
                          return;
                        }

                        if (child.className) {
                          // Check if style is already active
                          if (editor.isActive('textStyle', { class: child.className })) {
                            // Remove the style
                            if (editor.can().unsetMark('textStyle')) {
                              editor.chain().focus().unsetMark('textStyle').run();
                            }
                          } else {
                            // Apply the style
                            if (editor.can().setMark('textStyle', { class: child.className })) {
                              editor.chain().focus().setMark('textStyle', { class: child.className }).run();
                            }
                          }
                        }

                        dropdownMenu.removeClass(CONSTANTS.CSS_CLASSES.SHOW);

                        // Refresh toolbar states after action
                        setTimeout(() => {
                          self.updateToolbarStates(dropdown.closest(`.${CONSTANTS.CSS_CLASSES.TOOLBAR}`), editor);
                        }, CONSTANTS.TOOLBAR_UPDATE_DELAY);
                      });

                      submenu.append(childBtn);
                    }
                  });
                }

                // Add hover/click events for submenu
                let submenuTimeout;

                groupItem.on('mouseenter', () => {
                  clearTimeout(submenuTimeout);
                  // Position submenu
                  const groupOffset = groupItem.offset();
                  const groupWidth = groupItem.outerWidth();
                  const groupHeight = groupItem.outerHeight();

                  submenu.css({
                    position: 'absolute',
                    top: groupOffset.top,
                    left: groupOffset.left + groupWidth,
                    zIndex: CONSTANTS.Z_INDEX.SUBMENU
                  });

                  submenu.addClass(CONSTANTS.CSS_CLASSES.SHOW);
                });

                groupItem.on('mouseleave', () => {
                  submenuTimeout = setTimeout(() => {
                    submenu.removeClass(CONSTANTS.CSS_CLASSES.SHOW);
                  }, CONSTANTS.SUBMENU_HIDE_DELAY);
                });

                submenu.on('mouseenter', () => {
                  clearTimeout(submenuTimeout);
                });

                submenu.on('mouseleave', () => {
                  submenuTimeout = setTimeout(() => {
                    submenu.removeClass(CONSTANTS.CSS_CLASSES.SHOW);
                  }, CONSTANTS.SUBMENU_HIDE_DELAY);
                });

                // Click to toggle submenu
                groupItem.on('click', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  submenu.toggleClass(CONSTANTS.CSS_CLASSES.SHOW);
                });

                // Append submenu to body to avoid clipping
                $('body').append(submenu);

                // Store submenu reference for cleanup
                groupItem.data('submenu', submenu);

                dropdownMenu.append(groupItem);
                return; // Skip the optionBtn append for group items
              } else if (option.isStyle) {
                // Style option
                const parts = this.parseTooltipText(option.text);
                optionBtn = $(`<button type="button" data-style-class="${option.className}" class="${CONSTANTS.CSS_CLASSES.STYLE_OPTION}">${parts.title}</button>`);

                // Add tooltip if there's a shortcut or always for consistency
                this.addTooltip(optionBtn, option.text);

                // Add preview class to the button for styling
                if (option.previewClass) {
                  optionBtn.addClass(option.previewClass);
                }

                optionBtn.on('click', (e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  // Check if button is disabled
                  if (optionBtn.hasClass(CONSTANTS.CSS_CLASSES.DISABLED)) {
                    return;
                  }

                  if (option.className) {
                    // Check if style is already active
                    if (editor.isActive('textStyle', { class: option.className })) {
                      // Remove the style
                      if (editor.can().unsetMark('textStyle')) {
                        editor.chain().focus().unsetMark('textStyle').run();
                      }
                    } else {
                      // Apply the style
                      if (editor.can().setMark('textStyle', { class: option.className })) {
                        editor.chain().focus().setMark('textStyle', { class: option.className }).run();
                      }
                    }
                  }

                  dropdownMenu.removeClass(CONSTANTS.CSS_CLASSES.SHOW);

                  // Refresh toolbar states after action
                  setTimeout(() => {
                    self.updateToolbarStates(dropdown.closest(`.${CONSTANTS.CSS_CLASSES.TOOLBAR}`), editor);
                  }, CONSTANTS.TOOLBAR_UPDATE_DELAY);
                });
              }
            } else if (itemConfig.action === 'table') {
              // Table dropdown
              const parts = this.parseTooltipText(option.text);
              optionBtn = $(`<button type="button" data-table-action="${option.action}">${parts.title}</button>`);

              // Add tooltip if there's a shortcut or always for consistency
              this.addTooltip(optionBtn, option.text);

              optionBtn.on('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Check if button is disabled
                if (optionBtn.hasClass(CONSTANTS.CSS_CLASSES.DISABLED)) {
                  return;
                }

                switch (option.action) {
                  case 'insertTable':
                    if (editor.can().insertTable()) {
                      editor.chain().focus().insertTable({ rows: CONSTANTS.TABLE_DEFAULT_ROWS, cols: CONSTANTS.TABLE_DEFAULT_COLS, withHeaderRow: true }).run();
                    }
                    break;
                  case 'addColumnBefore':
                    if (editor.can().addColumnBefore()) {
                      editor.chain().focus().addColumnBefore().run();
                    }
                    break;
                  case 'addColumnAfter':
                    if (editor.can().addColumnAfter()) {
                      editor.chain().focus().addColumnAfter().run();
                    }
                    break;
                  case 'deleteColumn':
                    if (editor.can().deleteColumn()) {
                      editor.chain().focus().deleteColumn().run();
                    }
                    break;
                  case 'addRowBefore':
                    if (editor.can().addRowBefore()) {
                      editor.chain().focus().addRowBefore().run();
                    }
                    break;
                  case 'addRowAfter':
                    if (editor.can().addRowAfter()) {
                      editor.chain().focus().addRowAfter().run();
                    }
                    break;
                  case 'deleteRow':
                    if (editor.can().deleteRow()) {
                      editor.chain().focus().deleteRow().run();
                    }
                    break;
                  case 'deleteTable':
                    if (editor.can().deleteTable()) {
                      editor.chain().focus().deleteTable().run();
                    }
                    break;
                  case 'mergeCells':
                    if (editor.can().mergeCells()) {
                      editor.chain().focus().mergeCells().run();
                    }
                    break;
                  case 'splitCell':
                    if (editor.can().splitCell()) {
                      editor.chain().focus().splitCell().run();
                    }
                    break;
                  case 'toggleHeaderColumn':
                    if (editor.can().toggleHeaderColumn()) {
                      editor.chain().focus().toggleHeaderColumn().run();
                    }
                    break;
                  case 'toggleHeaderRow':
                    if (editor.can().toggleHeaderRow()) {
                      editor.chain().focus().toggleHeaderRow().run();
                    }
                    break;
                  case 'toggleHeaderCell':
                    if (editor.can().toggleHeaderCell()) {
                      editor.chain().focus().toggleHeaderCell().run();
                    }
                    break;
                }

                dropdownMenu.removeClass(CONSTANTS.CSS_CLASSES.SHOW);

                // Refresh toolbar states after action
                setTimeout(() => {
                  self.updateToolbarStates(dropdown.closest('.tiptap-toolbar'), editor);
                }, 10);
              });
            }
            if (optionBtn) {
              dropdownMenu.append(optionBtn);
            }
          });
        }

        button.on('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          // Hide any visible tooltips when dropdown is clicked
          $(`.${CONSTANTS.CSS_CLASSES.TOOLTIP}.${CONSTANTS.CSS_CLASSES.SHOW}`).removeClass(CONSTANTS.CSS_CLASSES.SHOW);

          // Close all other dropdowns in the same toolbar
          const toolbar = dropdown.closest(`.${CONSTANTS.CSS_CLASSES.TOOLBAR}`);
          toolbar.find(`.${CONSTANTS.CSS_CLASSES.DROPDOWN_MENU}`).not(dropdownMenu).removeClass(CONSTANTS.CSS_CLASSES.SHOW);

          // Toggle this dropdown
          dropdownMenu.toggleClass(CONSTANTS.CSS_CLASSES.SHOW);
        });

        // Close dropdown when clicking outside
        $(document).on('click', () => {
          dropdownMenu.removeClass(CONSTANTS.CSS_CLASSES.SHOW);
          // Clean up any open submenus
          dropdownMenu.find(`.${CONSTANTS.CSS_CLASSES.DROPDOWN_GROUP_ITEM}`).each(function () {
            const submenu = $(this).data('submenu');
            if (submenu) {
              submenu.removeClass(CONSTANTS.CSS_CLASSES.SHOW);
            }
          });
          // Hide any visible tooltips when clicking outside
          $(`.${CONSTANTS.CSS_CLASSES.TOOLTIP}.${CONSTANTS.CSS_CLASSES.SHOW}`).removeClass(CONSTANTS.CSS_CLASSES.SHOW);
        });

        dropdown.append(button, dropdownMenu);
        return dropdown;
      },

      // Update toolbar button states
      updateToolbarStates: function (toolbar, editor) {
        const config = this.data('tiptap-config') || {};

        // Update main toolbar buttons
        this.updateToolbarMainButtons(toolbar, editor, config);

        // Update dropdown menu options
        this.updateToolbarDropdownButtons(toolbar, editor);
      },

      // Update main toolbar button states
      updateToolbarMainButtons: function (toolbar, editor, config) {
        const self = this;

        toolbar.find('button[data-action]').each(function () {
          const btn = $(this);
          const action = btn.attr('data-action');

          // Remove existing state classes
          btn.removeClass(`${CONSTANTS.CSS_CLASSES.ACTIVE} ${CONSTANTS.CSS_CLASSES.DISABLED}`);

          // Check if this is an extension
          if (config.extensions && config.extensions[action]) {
            const extensionName = action;
            if (window.TipTapExtensions && window.TipTapExtensions[extensionName]) {
              const extension = window.TipTapExtensions[extensionName];
              if (typeof extension.isActive === 'function') {
                btn.toggleClass(CONSTANTS.CSS_CLASSES.ACTIVE, extension.isActive(editor));
              }
              if (typeof extension.isDisabled === 'function') {
                btn.toggleClass(CONSTANTS.CSS_CLASSES.DISABLED, extension.isDisabled(editor));
              }
            }
            return;
          }

          // Handle built-in actions
          self.updateToolbarButtonState(btn, action, editor, config);
        });
      },

      // Update individual button state based on action
      updateToolbarButtonState: function (btn, action, editor, config) {
        const self = this;

        switch (action) {
          case 'bold':
            btn.toggleClass(CONSTANTS.CSS_CLASSES.ACTIVE, editor.isActive('bold'));
            btn.toggleClass(CONSTANTS.CSS_CLASSES.DISABLED, !editor.can().toggleBold());
            break;
          case 'italic':
            btn.toggleClass(CONSTANTS.CSS_CLASSES.ACTIVE, editor.isActive('italic'));
            btn.toggleClass(CONSTANTS.CSS_CLASSES.DISABLED, !editor.can().toggleItalic());
            break;
          case 'underline':
            btn.toggleClass(CONSTANTS.CSS_CLASSES.ACTIVE, editor.isActive('underline'));
            btn.toggleClass(CONSTANTS.CSS_CLASSES.DISABLED, !editor.can().toggleUnderline());
            break;
          case 'strikethrough':
            btn.toggleClass(CONSTANTS.CSS_CLASSES.ACTIVE, editor.isActive('strike'));
            btn.toggleClass(CONSTANTS.CSS_CLASSES.DISABLED, !editor.can().toggleStrike());
            break;
          case 'paragraph':
            btn.toggleClass(CONSTANTS.CSS_CLASSES.ACTIVE, editor.isActive('paragraph'));
            btn.toggleClass(CONSTANTS.CSS_CLASSES.DISABLED, !editor.can().setParagraph());
            break;
          case 'heading1':
            btn.toggleClass(CONSTANTS.CSS_CLASSES.ACTIVE, editor.isActive('heading', { level: 1 }));
            btn.toggleClass(CONSTANTS.CSS_CLASSES.DISABLED, !editor.can().toggleHeading({ level: 1 }));
            break;
          case 'heading2':
            btn.toggleClass(CONSTANTS.CSS_CLASSES.ACTIVE, editor.isActive('heading', { level: 2 }));
            btn.toggleClass(CONSTANTS.CSS_CLASSES.DISABLED, !editor.can().toggleHeading({ level: 2 }));
            break;
          case 'heading3':
            btn.toggleClass(CONSTANTS.CSS_CLASSES.ACTIVE, editor.isActive('heading', { level: 3 }));
            btn.toggleClass(CONSTANTS.CSS_CLASSES.DISABLED, !editor.can().toggleHeading({ level: 3 }));
            break;
          case 'heading4':
            btn.toggleClass(CONSTANTS.CSS_CLASSES.ACTIVE, editor.isActive('heading', { level: 4 }));
            btn.toggleClass(CONSTANTS.CSS_CLASSES.DISABLED, !editor.can().toggleHeading({ level: 4 }));
            break;
          case 'heading5':
            btn.toggleClass(CONSTANTS.CSS_CLASSES.ACTIVE, editor.isActive('heading', { level: 5 }));
            btn.toggleClass(CONSTANTS.CSS_CLASSES.DISABLED, !editor.can().toggleHeading({ level: 5 }));
            break;
          case 'heading6':
            btn.toggleClass(CONSTANTS.CSS_CLASSES.ACTIVE, editor.isActive('heading', { level: 6 }));
            btn.toggleClass(CONSTANTS.CSS_CLASSES.DISABLED, !editor.can().toggleHeading({ level: 6 }));
            break;
          case 'bulletList':
            btn.toggleClass(CONSTANTS.CSS_CLASSES.ACTIVE, editor.isActive('bulletList'));
            btn.toggleClass(CONSTANTS.CSS_CLASSES.DISABLED, !editor.can().toggleBulletList());
            break;
          case 'orderedList':
            btn.toggleClass(CONSTANTS.CSS_CLASSES.ACTIVE, editor.isActive('orderedList'));
            btn.toggleClass(CONSTANTS.CSS_CLASSES.DISABLED, !editor.can().toggleOrderedList());
            break;
          case 'alignLeft':
            btn.toggleClass(CONSTANTS.CSS_CLASSES.ACTIVE, editor.isActive({ textAlign: 'left' }));
            btn.toggleClass(CONSTANTS.CSS_CLASSES.DISABLED, !editor.can().setTextAlign('left'));
            break;
          case 'alignCenter':
            btn.toggleClass(CONSTANTS.CSS_CLASSES.ACTIVE, editor.isActive({ textAlign: 'center' }));
            btn.toggleClass(CONSTANTS.CSS_CLASSES.DISABLED, !editor.can().setTextAlign('center'));
            break;
          case 'alignRight':
            btn.toggleClass(CONSTANTS.CSS_CLASSES.ACTIVE, editor.isActive({ textAlign: 'right' }));
            btn.toggleClass(CONSTANTS.CSS_CLASSES.DISABLED, !editor.can().setTextAlign('right'));
            break;
          case 'alignJustify':
            btn.toggleClass(CONSTANTS.CSS_CLASSES.ACTIVE, editor.isActive({ textAlign: 'justify' }));
            btn.toggleClass(CONSTANTS.CSS_CLASSES.DISABLED, !editor.can().setTextAlign('justify'));
            break;
          case 'styles':
            // Check if any style is currently active
            const styleOptions = self.generateStyleOptions(config.styles || {});
            let isAnyStyleActive = false;

            const checkStyleActive = (option) => {
              if (option.isStyle && option.className) {
                if (editor.isActive('textStyle', { class: option.className })) {
                  isAnyStyleActive = true;
                }
              } else if (option.isGroup && option.children) {
                option.children.forEach(child => checkStyleActive(child));
              }
            };

            styleOptions.forEach(option => checkStyleActive(option));

            btn.toggleClass(CONSTANTS.CSS_CLASSES.ACTIVE, isAnyStyleActive);
            btn.toggleClass(CONSTANTS.CSS_CLASSES.DISABLED, !editor.can().setMark('textStyle'));
            break;
          case 'table':
            btn.toggleClass(CONSTANTS.CSS_CLASSES.ACTIVE, editor.isActive('table'));
            btn.toggleClass(CONSTANTS.CSS_CLASSES.DISABLED, !editor.can().insertTable());
            break;
          case 'blockquote':
            btn.toggleClass(CONSTANTS.CSS_CLASSES.ACTIVE, editor.isActive('blockquote'));
            btn.toggleClass(CONSTANTS.CSS_CLASSES.DISABLED, !editor.can().toggleBlockquote());
            break;
          case 'horizontalRule':
            btn.toggleClass(CONSTANTS.CSS_CLASSES.DISABLED, !editor.can().setHorizontalRule());
            break;
          case 'codeBlock':
            btn.toggleClass(CONSTANTS.CSS_CLASSES.ACTIVE, editor.isActive('codeBlock'));
            btn.toggleClass(CONSTANTS.CSS_CLASSES.DISABLED, !editor.can().toggleCodeBlock());
            break;
          case 'code':
            btn.toggleClass(CONSTANTS.CSS_CLASSES.ACTIVE, editor.isActive('code'));
            btn.toggleClass(CONSTANTS.CSS_CLASSES.DISABLED, !editor.can().toggleCode());
            break;
          case 'highlight':
            btn.toggleClass(CONSTANTS.CSS_CLASSES.ACTIVE, editor.isActive('highlight'));
            btn.toggleClass(CONSTANTS.CSS_CLASSES.DISABLED, !editor.can().toggleHighlight());
            break;
          case 'subscript':
            btn.toggleClass(CONSTANTS.CSS_CLASSES.ACTIVE, editor.isActive('subscript'));
            btn.toggleClass(CONSTANTS.CSS_CLASSES.DISABLED, !editor.can().toggleSubscript());
            break;
          case 'superscript':
            btn.toggleClass(CONSTANTS.CSS_CLASSES.ACTIVE, editor.isActive('superscript'));
            btn.toggleClass(CONSTANTS.CSS_CLASSES.DISABLED, !editor.can().toggleSuperscript());
            break;
          case 'link':
            btn.toggleClass(CONSTANTS.CSS_CLASSES.ACTIVE, editor.isActive('link'));
            btn.toggleClass(CONSTANTS.CSS_CLASSES.DISABLED, !editor.can().setLink({ href: '#' }));
            break;
          case 'undo':
            btn.toggleClass(CONSTANTS.CSS_CLASSES.DISABLED, !editor.can().undo());
            break;
          case 'redo':
            btn.toggleClass(CONSTANTS.CSS_CLASSES.DISABLED, !editor.can().redo());
            break;
          case 'fullscreen':
            if (screenfull.isEnabled) {
              btn.toggleClass('active', screenfull.isFullscreen);
              btn.toggleClass('disabled', false);
            } else {
              btn.toggleClass('disabled', true);
            }
            break;
          case 'htmlSource':
            const wrapper = btn.closest('.tiptap-wrapper');
            const isHtmlMode = wrapper.hasClass(CONSTANTS.CSS_CLASSES.HTML_SOURCE);
            btn.toggleClass(CONSTANTS.CSS_CLASSES.ACTIVE, isHtmlMode);
            btn.toggleClass(CONSTANTS.CSS_CLASSES.DISABLED, false);
            break;
        }
      },

      // Update dropdown menu button states
      updateToolbarDropdownButtons: function (toolbar, editor) {
        toolbar.find('.dropdown-menu button').each(function () {
          const btn = $(this);
          const level = btn.attr('data-level');
          const listType = btn.attr('data-list-type');
          const styleClass = btn.attr('data-style-class');
          const tableAction = btn.attr('data-table-action');

          // Remove existing state classes
          btn.removeClass('active disabled');

          if (listType) {
            // Handle list dropdown
            btn.toggleClass('active', editor.isActive(listType));
            if (listType === 'bulletList') {
              btn.toggleClass('disabled', !editor.can().toggleBulletList());
            } else if (listType === 'orderedList') {
              btn.toggleClass('disabled', !editor.can().toggleOrderedList());
            }
          } else if (styleClass) {
            // Handle styles dropdown
            btn.toggleClass('active', editor.isActive('textStyle', { class: styleClass }));
            btn.toggleClass('disabled', !editor.can().setMark('textStyle', { class: styleClass }));
          } else if (tableAction) {
            // Handle table dropdown
            switch (tableAction) {
              case 'insertTable':
                btn.toggleClass('disabled', !editor.can().insertTable());
                break;
              case 'addColumnBefore':
              case 'addColumnAfter':
                btn.toggleClass('disabled', !editor.can().addColumnBefore() && !editor.can().addColumnAfter());
                break;
              case 'deleteColumn':
                btn.toggleClass('disabled', !editor.can().deleteColumn());
                break;
              case 'addRowBefore':
              case 'addRowAfter':
                btn.toggleClass('disabled', !editor.can().addRowBefore() && !editor.can().addRowAfter());
                break;
              case 'deleteRow':
                btn.toggleClass('disabled', !editor.can().deleteRow());
                break;
              case 'deleteTable':
                btn.toggleClass('disabled', !editor.can().deleteTable());
                break;
              case 'mergeCells':
                btn.toggleClass('disabled', !editor.can().mergeCells());
                break;
              case 'splitCell':
                btn.toggleClass('disabled', !editor.can().splitCell());
                break;
              case 'toggleHeaderColumn':
                btn.toggleClass('disabled', !editor.can().toggleHeaderColumn());
                break;
              case 'toggleHeaderRow':
                btn.toggleClass('disabled', !editor.can().toggleHeaderRow());
                break;
              case 'toggleHeaderCell':
                btn.toggleClass('disabled', !editor.can().toggleHeaderCell());
                break;
            }
          }
        });
      },

      // Add tooltip functionality to a button
      addTooltip: function (button, tooltipText) {
        const self = this;

        // Parse tooltip text to extract title and shortcut
        const parts = this.parseTooltipText(tooltipText);

        // Create tooltip element
        const tooltip = $(`<div class="${CONSTANTS.CSS_CLASSES.TOOLTIP}"></div>`);
        const tooltipTitle = $('<div class="tooltip-title"></div>').text(parts.title);
        tooltip.append(tooltipTitle);

        if (parts.shortcut) {
          const tooltipShortcut = $('<div class="tooltip-shortcut"></div>').text(parts.shortcut);
          tooltip.append(tooltipShortcut);
        }

        // Add tooltip to body (so it's not clipped by container)
        $('body').append(tooltip);

        // Store tooltip reference on button
        button.data('tooltip', tooltip);

        // Add hover/focus events
        button.on('mouseenter focus', function (e) {
          self.showTooltip($(this), tooltip);
        });

        button.on('mouseleave blur', function (e) {
          self.hideTooltip(tooltip);
        });

        // Hide tooltip when button is removed
        button.on('remove', function () {
          tooltip.remove();
        });
      },

      // Parse tooltip text to extract title and shortcut
      parseTooltipText: function (text) {
        if (!text) return { title: '', shortcut: null };

        // Look for pattern like "Title (Shortcut)"
        const match = text.match(/^(.+?)\s*\(([^)]+)\)$/);
        if (match) {
          return {
            title: match[1].trim(),
            shortcut: match[2].trim()
          };
        }

        // No shortcut found, entire text is title
        return {
          title: text,
          shortcut: null
        };
      },

      // Show tooltip positioned relative to button
      showTooltip: function (button, tooltip) {
        // Don't show tooltip if any dropdown is open in the same toolbar
        const toolbar = button.closest('.tiptap-toolbar');
        if (toolbar.find('.dropdown-menu.show').length > 0) {
          return;
        }

        const buttonOffset = button.offset();
        const buttonWidth = button.outerWidth();
        const buttonHeight = button.outerHeight();

        // Show tooltip first to get its dimensions
        tooltip.addClass(CONSTANTS.CSS_CLASSES.SHOW);

        const tooltipWidth = tooltip.outerWidth();
        const tooltipHeight = tooltip.outerHeight();

        // Position tooltip below button, centered
        tooltip.css({
          position: 'absolute',
          top: buttonOffset.top + buttonHeight + 8,
          left: buttonOffset.left + (buttonWidth / 2) - (tooltipWidth / 2),
          zIndex: CONSTANTS.Z_INDEX.TOOLTIP
        });
      },

      // Hide tooltip
      hideTooltip: function (tooltip) {
        tooltip.removeClass(CONSTANTS.CSS_CLASSES.SHOW);
      },

      // Toggle dropdown menu
      toggleDropdown: function (dropdownContainer) {
        const dropdownMenu = dropdownContainer.find(`.${CONSTANTS.CSS_CLASSES.DROPDOWN_MENU}`);
        const isOpen = dropdownMenu.hasClass(CONSTANTS.CSS_CLASSES.SHOW);

        // Close all other dropdowns first
        const toolbar = dropdownContainer.closest(`.${CONSTANTS.CSS_CLASSES.TOOLBAR}`);
        toolbar.find(`.${CONSTANTS.CSS_CLASSES.DROPDOWN_MENU}.${CONSTANTS.CSS_CLASSES.SHOW}`).removeClass(CONSTANTS.CSS_CLASSES.SHOW);

        // Toggle this dropdown
        if (!isOpen) {
          dropdownMenu.addClass(CONSTANTS.CSS_CLASSES.SHOW);

          // Hide any visible tooltips when dropdown opens
          $(`.${CONSTANTS.CSS_CLASSES.TOOLTIP}.${CONSTANTS.CSS_CLASSES.SHOW}`).removeClass(CONSTANTS.CSS_CLASSES.SHOW);
        }
      },

      // Close dropdown menu
      closeDropdown: function (dropdownContainer) {
        const dropdownMenu = dropdownContainer.find(`.${CONSTANTS.CSS_CLASSES.DROPDOWN_MENU}`);
        dropdownMenu.removeClass(CONSTANTS.CSS_CLASSES.SHOW);
      },

      // Toggle HTML source view
      toggleHtmlSource: function (editor, button) {
        const wrapper = button.closest(`.${CONSTANTS.CSS_CLASSES.WRAPPER}`);
        const isHtmlMode = wrapper.hasClass(CONSTANTS.CSS_CLASSES.HTML_SOURCE);

        if (isHtmlMode) {
          // Switch back to WYSIWYG mode
          this.exitHtmlSource(editor, wrapper);
        } else {
          // Switch to HTML source mode
          this.enterHtmlSource(editor, wrapper);
        }
      },

      // Enter HTML source mode
      enterHtmlSource: function (editor, wrapper) {
        const proseMirrorElement = wrapper.find(`.${CONSTANTS.CSS_CLASSES.PROSEMIRROR}`);
        const currentHtml = editor.getHTML();

        // Create textarea for HTML editing
        const htmlTextarea = $(`<textarea class="${CONSTANTS.CSS_CLASSES.HTML_TEXTAREA}"></textarea>`);
        htmlTextarea.val(currentHtml);

        // Hide the ProseMirror editor
        proseMirrorElement.hide();

        // Insert the textarea after the ProseMirror editor
        proseMirrorElement.after(htmlTextarea);

        // Add class to wrapper to indicate HTML mode
        wrapper.addClass(CONSTANTS.CSS_CLASSES.HTML_SOURCE);

        // Auto-resize the textarea to fit content
        this.autoResizeTextarea(htmlTextarea);

        // Add input listener for dynamic resizing
        htmlTextarea.on('input', () => {
          this.autoResizeTextarea(htmlTextarea);
        });

        // Focus the textarea
        htmlTextarea.focus();

        // Store reference to the textarea
        wrapper.data('html-textarea', htmlTextarea);
      },

      // Exit HTML source mode
      exitHtmlSource: function (editor, wrapper) {
        const proseMirrorElement = wrapper.find(`.${CONSTANTS.CSS_CLASSES.PROSEMIRROR}`);
        const htmlTextarea = wrapper.data('html-textarea');

        if (htmlTextarea) {
          // Get the HTML content from textarea
          const htmlContent = htmlTextarea.val();

          // Update the editor with the new HTML
          editor.commands.setContent(htmlContent);

          // Remove the textarea
          htmlTextarea.remove();
          wrapper.removeData('html-textarea');
        }

        // Show the ProseMirror editor
        proseMirrorElement.show();

        // Remove class from wrapper
        wrapper.removeClass(CONSTANTS.CSS_CLASSES.HTML_SOURCE);

        // Focus the editor
        editor.commands.focus();
      },

      // Add keyboard shortcuts
      addKeyboardShortcuts: function (wrapper, editor) {
        const self = this;

        // Add keyboard event listener to the wrapper
        wrapper.on('keydown', function (e) {
          // Ctrl+Shift+H - Toggle HTML source
          if (e.ctrlKey && e.shiftKey && e.key === 'H') {
            e.preventDefault();
            const htmlSourceButton = wrapper.find('button[data-action="htmlSource"]');
            if (htmlSourceButton.length) {
              self.toggleHtmlSource(editor, htmlSourceButton);
            }
          }

          // Alignment shortcuts
          if (e.ctrlKey && !e.shiftKey && !e.altKey) {
            switch (e.key) {
              case 'L':
              case 'l':
                e.preventDefault();
                if (editor.can().setTextAlign('left')) {
                  editor.chain().focus().setTextAlign('left').run();
                }
                break;
              case 'E':
              case 'e':
                e.preventDefault();
                if (editor.can().setTextAlign('center')) {
                  editor.chain().focus().setTextAlign('center').run();
                }
                break;
              case 'R':
              case 'r':
                e.preventDefault();
                if (editor.can().setTextAlign('right')) {
                  editor.chain().focus().setTextAlign('right').run();
                }
                break;
              case 'J':
              case 'j':
                e.preventDefault();
                if (editor.can().setTextAlign('justify')) {
                  editor.chain().focus().setTextAlign('justify').run();
                }
                break;
            }
          }
        });
      },

      // Auto-resize textarea to fit content
      autoResizeTextarea: function (textarea) {
        const element = textarea[0];
        const minHeight = 200; // Minimum height in pixels
        const maxHeight = Math.max(window.innerHeight * 0.6, 400); // Maximum height (60% of viewport, min 400px)

        // Reset height to get accurate scrollHeight
        element.style.height = '0px';
        element.style.overflowY = 'hidden';

        // Get the scroll height (actual content height)
        const scrollHeight = element.scrollHeight;

        // Calculate the final height
        let finalHeight = Math.max(scrollHeight, minHeight);
        finalHeight = Math.min(finalHeight, maxHeight);

        // Set the calculated height
        element.style.height = finalHeight + 'px';

        // Enable scrolling if content exceeds max height
        if (scrollHeight > maxHeight) {
          element.style.overflowY = 'auto';
        } else {
          element.style.overflowY = 'hidden';
        }
      },

      /**
       * Set CMS context for all extensions
       * This method propagates context to all loaded extensions that support it
       * @param {Object} context - CMS context object
       */
      setCMSContext: function (context) {
        
        // Store context on the entwine instance
        this.data('tiptap-cms-context', context);
        
        // Get the editor configuration to find loaded extensions
        const config = this.data('tiptap-config');
        if (config && config.extensions) {
          // Propagate context to all loaded extensions that support setCMSContext
          Object.keys(config.extensions).forEach(extensionName => {
            if (window.TipTapExtensions && window.TipTapExtensions[extensionName]) {
              const ExtensionClass = window.TipTapExtensions[extensionName];
              if (typeof ExtensionClass.setCMSContext === 'function') {
                ExtensionClass.setCMSContext(context);
              }
            }
          });
        }
      },

      /**
       * Get stored CMS context
       * @returns {Object} CMS context object
       */
      getCMSContext: function () {
        const context = this.data('tiptap-cms-context');
        return context || {};
      }
    });
  });
})(jQuery);