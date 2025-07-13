<?php

namespace OP;

use SilverStripe\Core\Extension;
use SilverStripe\Core\Config\Config;
use SilverStripe\Forms\HTMLEditor\HTMLEditorField;
use SilverStripe\i18n\i18n;
use SilverStripe\View\Requirements;
use SilverStripe\Core\Manifest\ModuleResourceLoader;
use Exception;
use SilverStripe\Dev\Debug;

/**
 * Extension for HTMLEditorField to add TipTap configuration
 */
class TipTapFieldExtension extends Extension
{
    /**
     * Get the TipTap configuration for this field
     * 
     * @return array
     */
    public function getTipTapConfig()
    {
        $config = Config::inst()->get(HTMLEditorField::class, 'tiptap_config') ?: [];

        // Add tooltip translations
        $config['tooltips'] = $this->getTooltipTranslations();

        // Process toolbar extensions and include their JavaScript files
        $config = $this->processToolbarExtensions($config);

        return $config;
    }


    /**
     * Get the TipTap configuration for this field as a JSON string
     * 
     * @param string $extensionName e.g. 'ss-link'
     * @param string $extensionPath e.g. 'otago/silverstripe-tiptap: client/ext/silverstripe-link-page-on-site.js'
     * @return array
     */
    public function loadTipTapExtension($extensionName, $extensionPath)
    {
        // Convert module resource path to public URL
        $resourceLoader = new ModuleResourceLoader();
        $resolvedPath = $resourceLoader->resolveURL($extensionPath);

        // Include the JavaScript file
        Requirements::javascript($resolvedPath);

        // Add to processed toolbar
        $processedToolbar[] = $extensionName;

        // Store extension info for JavaScript
        return [
            'name' => $extensionName,
            'path' => $resolvedPath,
            'type' => 'extension'
        ];
    }

    /**
     * Process toolbar extensions and include their JavaScript files
     * 
     * @param array $config
     * @return array
     */
    protected function processToolbarExtensions($config)
    {
        if (!isset($config['toolbar']) || !is_array($config['toolbar'])) {
            return $config;
        }

        $processedToolbar = [];
        $extensions = [];

        foreach ($config['toolbar'] as $item) {
            if (is_array($item)) {
                // dropdown grouped items
                if (array_key_exists('dropdown', $item)) {
                    $dropdownItems = [];
                    foreach ($item['actions'] as $action) {
                        // if it's an array, it's another extension definition
                        if (is_array($action)) {
                            foreach ($action as $subExtensionName => $subExtensionPath) {
                                $extensions[$subExtensionName] = $this->loadTipTapExtension($subExtensionName, $subExtensionPath);
                                $dropdownItems[] = $subExtensionName;
                            }
                        } else {
                            // else it's a in built action
                            $dropdownItems[] = $action;
                        }
                    }
                    $processedToolbar[] = [
                        'title' => isset($item['title']) ? $item['title'] : '',
                        'icon' => isset($item['icon']) ? $item['icon'] : '',
                        'items' => $dropdownItems
                    ];
                } else {
                    // Handle extension definition: ['ss-link' => 'path/to/extension.js']
                    foreach ($item as $extensionName => $extensionPath) {
                        if (is_string($extensionPath)) {
                            $extensions[$extensionName] = $this->loadTipTapExtension($extensionName, $extensionPath);
                            $processedToolbar[] = $extensionName;
                        }
                    }
                }
            } else {
                // Regular toolbar item
                $processedToolbar[] = $item;
            }
        }

        $config['toolbar'] = $processedToolbar;
        $config['extensions'] = $extensions;

        return $config;
    }

    /**
     * Get internationalized tooltip translations for TipTap tools
     * 
     * @return array
     */
    public function getTooltipTranslations()
    {
        return [
            'bold' => _t('SilverStripeTipTap.BOLD_TOOLTIP', 'Bold (Ctrl+B)'),
            'italic' => _t('SilverStripeTipTap.ITALIC_TOOLTIP', 'Italic (Ctrl+I)'),
            'underline' => _t('SilverStripeTipTap.UNDERLINE_TOOLTIP', 'Underline (Ctrl+U)'),
            'strikethrough' => _t('SilverStripeTipTap.STRIKETHROUGH_TOOLTIP', 'Strikethrough (Ctrl+Shift+X)'),
            'subscript' => _t('SilverStripeTipTap.SUBSCRIPT_TOOLTIP', 'Subscript (Ctrl+,)'),
            'superscript' => _t('SilverStripeTipTap.SUPERSCRIPT_TOOLTIP', 'Superscript (Ctrl+.)'),
            'code' => _t('SilverStripeTipTap.CODE_TOOLTIP', 'Inline Code (Ctrl+E)'),
            'highlight' => _t('SilverStripeTipTap.HIGHLIGHT_TOOLTIP', 'Highlight'),
            'heading' => _t('SilverStripeTipTap.HEADING_TOOLTIP', 'Headings'),
            'align' => _t('SilverStripeTipTap.ALIGN_TOOLTIP', 'Text Alignment'),
            'styles' => _t('SilverStripeTipTap.STYLES_TOOLTIP', 'Styles'),
            'blockquote' => _t('SilverStripeTipTap.BLOCKQUOTE_TOOLTIP', 'Quote (Ctrl+Shift+B)'),
            'horizontalRule' => _t('SilverStripeTipTap.HORIZONTALRULE_TOOLTIP', 'Insert Horizontal Rule'),
            'codeBlock' => _t('SilverStripeTipTap.CODEBLOCK_TOOLTIP', 'Code Block (Ctrl+Alt+C)'),
            'link' => _t('SilverStripeTipTap.LINK_TOOLTIP', 'Link (Ctrl+K)'),
            'image' => _t('SilverStripeTipTap.IMAGE_TOOLTIP', 'Image'),
            'undo' => _t('SilverStripeTipTap.UNDO_TOOLTIP', 'Undo (Ctrl+Z)'),
            'redo' => _t('SilverStripeTipTap.REDO_TOOLTIP', 'Redo (Ctrl+Y)'),
            'fullscreen' => _t('SilverStripeTipTap.FULLSCREEN_TOOLTIP', 'Toggle Fullscreen (F11)'),
            'htmlSource' => _t('SilverStripeTipTap.HTMLSOURCE_TOOLTIP', 'HTML Source (Ctrl+Shift+H)'),

            // Dropdown options
            'heading_h1' => _t('SilverStripeTipTap.HEADING_H1', 'Heading 1'),
            'heading_h2' => _t('SilverStripeTipTap.HEADING_H2', 'Heading 2'),
            'heading_h3' => _t('SilverStripeTipTap.HEADING_H3', 'Heading 3'),
            'heading_h4' => _t('SilverStripeTipTap.HEADING_H4', 'Heading 4'),
            'heading_h5' => _t('SilverStripeTipTap.HEADING_H5', 'Heading 5'),
            'heading_h6' => _t('SilverStripeTipTap.HEADING_H6', 'Heading 6'),
            'heading_paragraph' => _t('SilverStripeTipTap.HEADING_PARAGRAPH', 'Paragraph'),

            'list_bullet' => _t('SilverStripeTipTap.LIST_BULLET', 'Bullet List'),
            'list_ordered' => _t('SilverStripeTipTap.LIST_ORDERED', 'Numbered List'),

            'alignLeft' => _t('SilverStripeTipTap.ALIGN_LEFT', 'Align Left'),
            'alignCenter' => _t('SilverStripeTipTap.ALIGN_CENTER', 'Align Center'),
            'alignRight' => _t('SilverStripeTipTap.ALIGN_RIGHT', 'Align Right'),
            'alignJustify' => _t('SilverStripeTipTap.ALIGN_JUSTIFY', 'Justify'),

            // Table dropdown options
            'table' => _t('SilverStripeTipTap.TABLE_TOOLTIP', 'Table'),
            'table_insert' => _t('SilverStripeTipTap.TABLE_INSERT', 'Insert Table'),
            'table_add_column_before' => _t('SilverStripeTipTap.TABLE_ADD_COLUMN_BEFORE', 'Add Column Before'),
            'table_add_column_after' => _t('SilverStripeTipTap.TABLE_ADD_COLUMN_AFTER', 'Add Column After'),
            'table_delete_column' => _t('SilverStripeTipTap.TABLE_DELETE_COLUMN', 'Delete Column'),
            'table_add_row_before' => _t('SilverStripeTipTap.TABLE_ADD_ROW_BEFORE', 'Add Row Before'),
            'table_add_row_after' => _t('SilverStripeTipTap.TABLE_ADD_ROW_AFTER', 'Add Row After'),
            'table_delete_row' => _t('SilverStripeTipTap.TABLE_DELETE_ROW', 'Delete Row'),
            'table_delete' => _t('SilverStripeTipTap.TABLE_DELETE', 'Delete Table'),
            'table_merge_cells' => _t('SilverStripeTipTap.TABLE_MERGE_CELLS', 'Merge Cells'),
            'table_split_cell' => _t('SilverStripeTipTap.TABLE_SPLIT_CELL', 'Split Cell'),
            'table_toggle_header_column' => _t('SilverStripeTipTap.TABLE_TOGGLE_HEADER_COLUMN', 'Toggle Header Column'),
            'table_toggle_header_row' => _t('SilverStripeTipTap.TABLE_TOGGLE_HEADER_ROW', 'Toggle Header Row'),
            'table_toggle_header_cell' => _t('SilverStripeTipTap.TABLE_TOGGLE_HEADER_CELL', 'Toggle Header Cell'),

            'bulletList' => _t('SilverStripeTipTap.BULLET_LIST', 'Bullet List'),
            'orderedList' => _t('SilverStripeTipTap.ORDERED_LIST', 'Ordered List'),

            // the silverstripe link extensions
            'ss-link-ext' => _t('SilverStripeTipTap.SS_LINK_EXT', 'Insert External Link'),
            'ss-link-site' => _t('SilverStripeTipTap.SS_LINK_SITE', 'Insert Site Link'),
            'ss-link-file' => _t('SilverStripeTipTap.SS_LINK_FILE', 'Insert File'),
            'ss-link-media' => _t('SilverStripeTipTap.SS_LINK_MEDIA', 'Insert Media'),
        ];
    }

    /**
     * Add TipTap configuration to field attributes
     */
    public function onBeforeRender()
    {
        if ($this->owner instanceof HTMLEditorField) {
            $config = $this->getTipTapConfig();
            $this->owner->setAttribute('data-tiptap-config', json_encode($config));
            $this->owner->addExtraClass('tiptap-editor');
        }
    }
}
