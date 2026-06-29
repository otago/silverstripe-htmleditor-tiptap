// src/tiptap.entwine.js
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import BubbleMenu from '@tiptap/extension-bubble-menu';
import TextAlign from '@tiptap/extension-text-align';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TextStyle from '@tiptap/extension-text-style';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Youtube from '@tiptap/extension-youtube';
import ImageResize from 'tiptap-extension-resize-image';
import screenfull from 'screenfull';
import InternalAnchor from './InternalAnchor';

import {
  shouldShowLinkBubbleMenu,
  initializeLinkBubbleMenu,
  cleanupLinkBubbleMenu,
  linkbubbletool
} from './tools/linkbubble'

// Import tools to register in the toolbar
import alignCenter from './tools/alignCenter';
import alignJustify from './tools/alignJustify';
import alignLeft from './tools/alignLeft';
import alignRight from './tools/alignRight';
import blockquote from './tools/blockquote';
import bold from './tools/bold';
import bulletList from './tools/bulletList';
import code from './tools/code';
import codeBlock from './tools/codeBlock';
import fullscreen from './tools/fullscreen';
import heading1 from './tools/heading1';
import heading2 from './tools/heading2';
import heading3 from './tools/heading3';
import heading4 from './tools/heading4';
import heading5 from './tools/heading5';
import heading6 from './tools/heading6';
import highlight from './tools/highlight';
import horizontalRule from './tools/horizontalRule';
import image from './tools/image';
import italic from './tools/italic';
import link from './tools/link';
import listindent from './tools/listindent';
import listoutdent from './tools/listoutdent';
import orderedList from './tools/orderedList';
import paragraph from './tools/paragraph';
import redo from './tools/redo';
import removeLink from './tools/removeLink';
import styles from './tools/styles';
import subscript from './tools/subscript';
import superscript from './tools/superscript';
import strikethrough from './tools/strikethrough';
import table from './tools/table';
import underline from './tools/underline';
import undo from './tools/undo';
import clear from './tools/clear';
import youtube from './tools/youtube';
import paste from './tools/paste';
import htmlSource from './tools/htmlSource';


// all available tools
const TOOLS = [
  bold,
  italic,
  underline,
  strikethrough,
  paragraph,
  heading1,
  heading2,
  heading3,
  heading4,
  heading5,
  heading6,
  bulletList,
  orderedList,
  alignLeft,
  alignCenter,
  alignRight,
  alignJustify,
  styles,
  blockquote,
  horizontalRule,
  codeBlock,
  code,
  highlight,
  subscript,
  superscript,
  link,
  removeLink,
  image,
  undo,
  redo,
  fullscreen,
  htmlSource,
  table,
  clear,
  youtube,
  paste,
  listindent,
  listoutdent
];


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
  };

  $.entwine('ss', function ($) {
    $('textarea.htmleditor').entwine({
      onmatch: function () {

        // todo: make the config init better
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
          console.warn('Invalid JSON in TipTap config:', e);
          config = {};
        }

        // Config should always be provided by PHP extension from YML
        if (Object.keys(config).length === 0) {
          console.error('TipTap: No config provided. Make sure TipTapFieldExtension is properly configured.');
          return;
        }

        this.data('tiptap-tools', this.buildToolRegistry(config));

        if (!this.data('tiptap-initialized')) {
          // Create wrapper div for the editor
          const wrapper = $(`<div class="${CONSTANTS.CSS_CLASSES.WRAPPER}"></div>`);
          this.after(wrapper);
          this.hide();

          // Configure all available extensions
          const extensions = [
            StarterKit,
            ImageResize,
            Youtube,
            // Additional extensions not included in StarterKit
            Underline,
            Image,
            Highlight,
            InternalAnchor,
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
            linkbubbletool(wrapper),
            TextAlign.configure({
              types: ['heading', 'paragraph'],
              alignments: ['left', 'center', 'right', 'justify'],
              defaultAlignment: 'left'
            }),
            Subscript,
            Superscript,
            TextStyle.extend({
              parseHTML() {
                // we want to keep both styles and classes, but TextStyle by default only keeps styles, so we need to extend the parser to also keep classes. We also want to ignore empty style and class attributes, otherwise we end up with a lot of <span> elements with empty attributes.
                return [
                  {
                    tag: 'span',
                    getAttrs: element => {
                      const hasStyles = element.hasAttribute('style');
                      const hasClasses = element.hasAttribute('class');

                      if (!hasStyles && !hasClasses) {
                        return false;
                      }

                      return {};
                    },
                  },
                ];
              },
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
            TableCell,
          ];

          // Create TipTap editor
          const initialContent = this.normalizeContent(this.val() || config.content || '');

          const editor = new Editor({
            element: wrapper[0],
            extensions: extensions,
            content: initialContent,
            autofocus: config.autofocus || false,
            onUpdate: ({ editor }) => {
              const html = editor.getHTML();
              this.dispatchReduxFormChange(html);
            },
            onCreate: ({ editor }) => {

              // Add basic toolbar if enabled
              if (config.toolbar !== false) {
                this.createToolbar(wrapper, editor, config);
              }

              // Add focus/blur handlers for toolbar styling
              const proseMirrorElement = wrapper.find(`.${CONSTANTS.CSS_CLASSES.PROSEMIRROR}`)[0];
              if (proseMirrorElement) {
                const handleElementalToggleKeys = (event) => {
                  // Prevent Enter/Space from bubbling to Elemental's expand/collapse handlers.
                  if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
                    event.stopPropagation();
                  }
                };

                proseMirrorElement.addEventListener('keydown', handleElementalToggleKeys);
                proseMirrorElement.addEventListener('keyup', handleElementalToggleKeys);

                wrapper.data('tiptap-elemental-guard', {
                  proseMirrorElement,
                  handleElementalToggleKeys,
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

              //  this.initializeLinkBubbleMenu(wrapper, editor);
              initializeLinkBubbleMenu(wrapper, editor, this.getTool('ss-link-site'));
            },
            onDestroy: () => {
              //   this.cleanupLinkBubbleMenu(wrapper);
              cleanupLinkBubbleMenu(wrapper);

              const guard = wrapper.data('tiptap-elemental-guard');
              if (guard && guard.proseMirrorElement) {
                guard.proseMirrorElement.removeEventListener('keydown', guard.handleElementalToggleKeys);
                guard.proseMirrorElement.removeEventListener('keyup', guard.handleElementalToggleKeys);
                wrapper.removeData('tiptap-elemental-guard');
              }

              const outsideHandlers = wrapper.data('tiptap-outside-handlers');
              if (outsideHandlers) {
                document.removeEventListener('pointerdown', outsideHandlers.handleOutsideInteraction, true);
                document.removeEventListener('focusin', outsideHandlers.handleOutsideInteraction, true);
                document.removeEventListener('keydown', outsideHandlers.handleEscapeKey, true);
                wrapper.removeData('tiptap-outside-handlers');
              }
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

      // create a list of avalible tools to use
      buildToolRegistry: function (config) {
        const tools = {};
        TOOLS.forEach((tool) => {
          tools[tool.action] = tool;
        });

        const extensionConfig = config.extensions || {};
        Object.keys(extensionConfig).forEach((action) => {
          if (window.TipTapExtensions && window.TipTapExtensions[action]) {
            tools[action] = window.TipTapExtensions[action];
          }
        });

        return { tools };
      },

      getToolRegistry: function () {
        return this.data('tiptap-tools') || { tools: {} };
      },

      getTool: function (action) {
        const registry = this.getToolRegistry();
        return registry.tools[action] || null;
      },

      // Helper method to create a configurable toolbar
      createToolbar: function (wrapper, editor, config) {
        const toolbar = $(`<div class="${CONSTANTS.CSS_CLASSES.TOOLBAR}"></div>`);

        // Process extensions first
        this.initializeExtensions(editor, config);

        // Build toolbar items
        this.createToolbarItems(toolbar, config, editor);

        // Setup event listeners
        this.createToolbarEventListeners(wrapper, toolbar, editor);
      },


      // Build toolbar items based on configuration
      createToolbarItems: function (toolbar, config, editor) {
        const toolbarLayout = config.toolbar || [];
        const registry = this.getToolRegistry();

        // Build toolbar based on configuration. if the extension has getToolbarConfig(), it can be something other than a button.
        toolbarLayout.forEach(item => {
          let itemConfig = null;

          if (registry.tools[item] && typeof registry.tools[item].getToolbarConfig === 'function') {
            itemConfig = registry.tools[item].getToolbarConfig({ tooltips: config.tooltips });
          }
          if (registry.tools[item] && typeof registry.tools[item].setConfigOptions === 'function') {
            registry.tools[item].setConfigOptions(config.styles || {});
          }

          // Handle grouped objects (like dropdown: { title: 'Links', icon: 'links', actions: [...] })
          if (typeof item === 'object' && item !== null) {
            toolbar.append(this.createGenericDropdown(item, itemConfig, editor, config));
            return;
          }

          // loading extensions to main toolbar
          if (!itemConfig) {
            let buttontitle = config.tooltips && config.tooltips[item] ? config.tooltips[item] : item;

            itemConfig = {
              action: item,
              extension: item,
              title: buttontitle, // Full text with shortcuts for tooltip
              type: "button",
              buttontext: '' // Just the title part for button text
            };
          }

          // Add separator
          if (itemConfig.action === 'separator') {
            const separator = $(`<div class="${CONSTANTS.CSS_CLASSES.SEPARATOR}"></div>`);
            toolbar.append(separator);
            return;
          }

          // Add line break - force wrap to new line
          if (itemConfig.action === 'newline') {
            const lineBreak = $(`<div class="${CONSTANTS.CSS_CLASSES.NEWLINE}"></div>`);
            toolbar.append(lineBreak);
            return;
          }

          if (itemConfig.type === 'button') {
            // Create button
            itemConfig.buttontext = '';
            const button = this.createToolbarButton(itemConfig, editor);
            toolbar.append(button);
          } else if (itemConfig.type === 'dropdown') {
            //  Create dropdown
            //  For extension dropdowns, pass the toolbarConfig and itemName for context
            const dropdown = this.createToolbarDropdown(itemConfig, editor, registry.tools[item]);
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

        // Close dropdowns/tooltips on outside interactions, even if bubbling is stopped elsewhere.
        if (!wrapper.data('tiptap-outside-handlers')) {
          const handleOutsideInteraction = (event) => {
            if ($(event.target).closest(`.${CONSTANTS.CSS_CLASSES.DROPDOWN}`).length > 0) {
              return;
            }
            this.closeToolbarOverlays(toolbar);
          };

          const handleEscapeKey = (event) => {
            if (event.key === 'Escape') {
              this.closeToolbarOverlays(toolbar);
            }
          };

          document.addEventListener('pointerdown', handleOutsideInteraction, true);
          document.addEventListener('focusin', handleOutsideInteraction, true);
          document.addEventListener('keydown', handleEscapeKey, true);

          wrapper.data('tiptap-outside-handlers', {
            handleOutsideInteraction,
            handleEscapeKey,
          });
        }
      },

      closeToolbarOverlays: function (container) {
        container.find(`.${CONSTANTS.CSS_CLASSES.DROPDOWN_MENU}`).removeClass(CONSTANTS.CSS_CLASSES.SHOW);
        container.find(`.${CONSTANTS.CSS_CLASSES.DROPDOWN_GROUP_ITEM}`).each(function () {
          const submenu = $(this).data('submenu');
          if (submenu) {
            submenu.removeClass(CONSTANTS.CSS_CLASSES.SHOW);
          }
        });
        container.find(`.${CONSTANTS.CSS_CLASSES.TOOLTIP}.${CONSTANTS.CSS_CLASSES.SHOW}`).removeClass(CONSTANTS.CSS_CLASSES.SHOW);
      },

      createLinkBubbleMenu: function (wrapper) {
        const existing = wrapper.find('.tiptap-link-bubble-menu');
        if (existing.length > 0) {
          return existing;
        }

        const menu = $(`
          <div class="tiptap-link-bubble-menu" aria-label="Link actions">
            <span class="link-type-badge" data-link-type="raw">Link</span>
            <button type="button" class="link-edit">Edit link</button>
            <button type="button" class="link-remove">Remove</button>
          </div>
        `);

        wrapper.append(menu);
        return menu.get(0);
      },

      // Convert SilverStripe [image ...] shortcodes to HTML <img ...> for TipTap rendering
      normalizeContent: function (content) {
        const registry = this.getToolRegistry();
        let normalizedContent = content;

        Object.keys(registry.tools).forEach((action) => {
          const tool = registry.tools[action];
          if (typeof tool.normalizeContent == 'function') {
            normalizedContent = tool.normalizeContent(normalizedContent);
          }
        });

        return normalizedContent;
      },

      // Initialize extensions
      initializeExtensions: function (editor, config) {
        const registry = this.getToolRegistry();
        Object.keys(registry.tools).forEach((action) => {
          const capability = registry.tools[action];
          if (typeof capability.init === 'function') {
            capability.init({ editor, config, host: this });
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

        this.addTooltip(button, itemConfig.title);

        // on button click
        button.on('click', (e) => {
          e.preventDefault();

          if (button.hasClass(CONSTANTS.CSS_CLASSES.DISABLED)) {
            return;
          }

          const capability = this.getTool(itemConfig.action);
          if (capability) {
            capability.run({
              editor,
              button,
              itemConfig,
              host: this,
              context: {
                $,
                constants: CONSTANTS,
                normalizeContent: (html) => this.normalizeContent(html),
                autoResizeTextarea: (textarea) => this.autoResizeTextarea(textarea),
                dispatchReduxFormChange: (change) => self.dispatchReduxFormChange(change),
              },
            });
          }

          // Refresh toolbar states after action
          setTimeout(() => {
            self.updateToolbarStates(button.closest(`.${CONSTANTS.CSS_CLASSES.TOOLBAR}`), editor);
          }, CONSTANTS.TOOLBAR_UPDATE_DELAY);
        });

        return button;
      },

      // Create a toolbar dropdown - used for table and style
      createToolbarDropdown: function (itemConfig, editor, tool) {
        const dropdown = $(`<div class="${CONSTANTS.CSS_CLASSES.DROPDOWN}"></div>`);
        const button = $(`<button type="button" data-action="${itemConfig.action}"></button>`);
        const dropdownMenu = $(`<div class="${CONSTANTS.CSS_CLASSES.DROPDOWN_MENU}"></div>`);
        const self = this;
        const capability = this.getTool(itemConfig.action);

        // Add special class for table dropdown to allow wider styling
        if (itemConfig.type === 'dropdown') {
          dropdownMenu.addClass(CONSTANTS.CSS_CLASSES.TABLE_DROPDOWN);
        }

        // Add tooltip functionality
        this.addTooltip(button, itemConfig.title);

        // Add dropdown options
        const wasCustomRendered = capability && capability.renderDropdownOptions({
          itemConfig,
          dropdown,
          dropdownMenu,
          button,
          editor,
          host: this,
          context: {
            $,
            constants: CONSTANTS,
            parseTooltipText: (text) => this.parseTooltipText(text),
            addTooltip: (btn, text) => this.addTooltip(btn, text),
            updateToolbarStates: (toolbar, editorInstance) => this.updateToolbarStates(toolbar, editorInstance),
          },
        });

        // Outside close for dropdown menus handled once at editor level (capture phase) in createToolbarEventListeners.
        button.on('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          // Hide any visible tooltips when dropdown is clicked
          $(`.${CONSTANTS.CSS_CLASSES.TOOLTIP}.${CONSTANTS.CSS_CLASSES.SHOW}`).removeClass(CONSTANTS.CSS_CLASSES.SHOW);

          // Close all other dropdowns in the same toolbar
          const toolbar = dropdown.closest(`.${CONSTANTS.CSS_CLASSES.TOOLBAR}`);
          toolbar.find(`.${CONSTANTS.CSS_CLASSES.DROPDOWN_MENU}`).not(dropdownMenu).removeClass(CONSTANTS.CSS_CLASSES.SHOW);

          // can you use this sub tool?
          itemConfig.options.forEach(option => {
            let optionBtn = dropdownMenu.find(`button[data-option-action="${option.action}"]`);
            optionBtn.toggleClass(
              CONSTANTS.CSS_CLASSES.DISABLED,
              tool.isOptionDisabled({ optionAction: option.action, editor })
            );
          });

          // Toggle this dropdown
          dropdownMenu.toggleClass(CONSTANTS.CSS_CLASSES.SHOW);
        });


        dropdown.append(button, dropdownMenu);
        return dropdown;
      },

      // Update toolbar button states
      updateToolbarStates: function (toolbar, editor) {
        // Update main toolbar buttons
        this.updateToolbarMainButtons(toolbar, editor);

        // Update dropdown menu options
        this.updateToolbarDropdownButtons(toolbar, editor);
      },

      // Update main toolbar button states
      updateToolbarMainButtons: function (toolbar, editor) {
        const self = this;

        toolbar.find('button[data-action]').each(function () {
          const btn = $(this);
          const action = btn.attr('data-action');

          // Remove existing state classes
          btn.removeClass(`${CONSTANTS.CSS_CLASSES.ACTIVE} ${CONSTANTS.CSS_CLASSES.DISABLED}`);

          // Handle built-in actions
          self.updateToolbarButtonState(btn, action, editor);
        });
      },

      // Update individual button state based on action
      updateToolbarButtonState: function (button, action, editor) {
        const capability = this.getTool(action);
        this.applyCapabilityButtonState(button, capability, editor, CONSTANTS);
      },

      // Update dropdown menu button states
      updateToolbarDropdownButtons: function (toolbar, editor) {
        toolbar.find('.dropdown-menu button').each(function () {
          const btn = $(this);
          this.applyDropdownButtonState(btn, editor, CONSTANTS, (action) => {
            if (!action) {
              return null;
            }
            return this.getTool(action);
          });
        }.bind(this));
      },

      applyCapabilityButtonState: function (btn, capability, editor, constants) {
        if (!capability) {
          return;
        }

        if (typeof capability.isActive === 'function') {
          const active = capability.isActive(editor);
          btn.toggleClass(constants.CSS_CLASSES.ACTIVE, !!active);
        }

        if (typeof capability.isDisabled === 'function') {
          const disabled = capability.isDisabled(editor);
          btn.toggleClass(constants.CSS_CLASSES.DISABLED, !!disabled);
        }
      },

      applyDropdownButtonState: function (btn, editor, constants, resolveCapability) {
        const styleClass = btn.attr('data-style-class');
        const optionAction = btn.attr('data-option-action');
        const parentAction = btn.attr('data-parent-action');

        btn.removeClass(`${constants.CSS_CLASSES.ACTIVE} ${constants.CSS_CLASSES.DISABLED}`);

        if (styleClass) {
          btn.toggleClass(constants.CSS_CLASSES.ACTIVE, editor.isActive('textStyle', { class: styleClass }));
          btn.toggleClass(constants.CSS_CLASSES.DISABLED, !editor.can().setMark('textStyle', { class: styleClass }));
          return;
        }

        if (!optionAction) {
          return;
        }

        const parentCapability = parentAction ? resolveCapability(parentAction) : null;
        if (parentCapability) {
          btn.toggleClass(
            constants.CSS_CLASSES.ACTIVE,
            parentCapability.isOptionActive({ optionAction, editor })
          );
          btn.toggleClass(
            constants.CSS_CLASSES.DISABLED,
            parentCapability.isOptionDisabled({ optionAction, editor })
          );
          return;
        }

        const optionCapability = resolveCapability(optionAction);
        this.applyCapabilityButtonState(btn, optionCapability, editor, constants);
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


      // Add keyboard shortcuts
      addKeyboardShortcuts: function (wrapper, editor) {
        const self = this;

        // Add keyboard event listener to the wrapper
        wrapper.on('keydown', function (e) {

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

      findElementReduxFormName: function () {
        const store = window.ss && window.ss.store;
        const textareaName = this.attr('name');
        if (!store || !textareaName) {
          return null;
        }

        const elementForms = store.getState()?.form?.formState?.element || {};
        const entries = Object.entries(elementForms);

        for (let i = 0; i < entries.length; i++) {
          const [formName, formState] = entries[i];
          const registeredFields = formState?.registeredFields || {};
          const values = formState?.values || {};
          if (
            Object.prototype.hasOwnProperty.call(registeredFields, textareaName)
            || Object.prototype.hasOwnProperty.call(values, textareaName)
          ) {
            return formName;
          }
        }

        return null;
      },


      // below is the event to trigger the redux form, for the elmental forms.
      // this also retriggers the change for the content of the tiptap form. for example the HTML view version.
      dispatchReduxFormChange: function (html) {
        const textareaElement = this[0];
        const textareaValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          'value'
        )?.set;
        if (textareaElement) {
          if (textareaValueSetter) {
            textareaValueSetter.call(textareaElement, html);
          } else {
            textareaElement.value = html;
          }
        }

        this.val(html);

        const store = window.ss && window.ss.store;

        const formName = this.findElementReduxFormName();
        if (!formName) {
          return;
        }

        const reduxFormName = `element.${formName}`;
        store.dispatch({
          type: '@@redux-form/CHANGE',
          meta: {
            form: reduxFormName,
            field: this.attr('name') || '',
            touch: true,
            persistentSubmitErrors: false,
          },
          payload: html,
        });
      },

      // Auto-resize textarea to fit content
      autoResizeTextarea: function (textarea) {
        const element = textarea[0];
        const minHeight = 200; // Minimum height in pixels
        const maxHeight = Math.max(window.innerHeight * 0.6, 400); // Maximum height (60% of viewport, min 400px)
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

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

        // Keep viewport stable in case browser auto-scrolls during resize.
        if (window.scrollX !== scrollX || window.scrollY !== scrollY) {
          window.scrollTo(scrollX, scrollY);
        }
      },
    });
  });
})(jQuery);