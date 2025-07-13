# TipTap Configuration Guide

This TipTap editor can be extensively customized through SilverStripe's YML configuration system.

## Basic Usage

The editor automatically applies to all `HTMLEditorField` instances. The default configuration provides a balanced set of tools suitable for most content editing needs.

## Configuration Options

### Toolbar Layout

Control which buttons appear in the toolbar and their order:

```yml
SilverStripe\Forms\HTMLEditor\HTMLEditorField:
  tiptap_config:
    toolbar:
      - 'undo'
      - 'redo'
      - 'separator'
      - 'dropdown':
        title: 'Heading and Paragraph'
        icon: 'headings'
        actions:
        - 'heading1'
        - 'heading2'
        - 'heading3'
        - 'paragraph'
      - 'dropdown':
        title: 'Lists'
        icon: 'lists'
        actions:
        - 'bulletList'
        - 'orderedList'
      - 'separator'
      - 'bold'
      - 'italic'
      - 'underline'
      - 'strikethrough'
      - 'separator'
      - 'blockquote'
      - 'codeBlock'
      - 'highlight'
```

### Available Toolbar Items

#### Basic Formatting
- **bold** - Bold text button (Ctrl+B)
- **italic** - Italic text button (Ctrl+I)
- **underline** - Underline text button (Ctrl+U)
- **strikethrough** - Strikethrough text button (Ctrl+Shift+X)
- **code** - Inline code button (for `inline code` snippets) (Ctrl+E)
- **subscript** - Subscript button (for X<sub>2</sub> formatting) (Ctrl+,)
- **superscript** - Superscript button (for X<sup>2</sup> formatting) (Ctrl+.)
- **highlight** - Text highlight button

#### Structure and Layout
- **paragraph** - Paragraph button
- **heading1** - Heading 1 button (Ctrl+Alt+1)
- **heading2** - Heading 2 button (Ctrl+Alt+2)
- **heading3** - Heading 3 button (Ctrl+Alt+3)
- **heading4** - Heading 4 button (Ctrl+Alt+4)
- **heading5** - Heading 5 button (Ctrl+Alt+5)
- **heading6** - Heading 6 button (Ctrl+Alt+6)
- **heading** - Heading dropdown (H1, H2, H3, Paragraph) - *Alternative to individual buttons*
- **bulletList** - Bullet list button
- **orderedList** - Numbered list button
- **lists** - List dropdown (Bullet List, Numbered List) - *Alternative to individual buttons*

#### Alignment
- **alignLeft** - Align text left button (Ctrl+L)
- **alignCenter** - Align text center button (Ctrl+E)
- **alignRight** - Align text right button (Ctrl+R)
- **alignJustify** - Justify text button (Ctrl+J)
- **align** - Text alignment dropdown (Left, Center, Right, Justify) - *Alternative to individual buttons*

#### Advanced Features
- **styles** - Custom styles dropdown (configurable CSS classes)
- **table** - Table dropdown (Insert Table, Add/Delete Rows/Columns, Merge/Split Cells, Toggle Headers)
- **blockquote** - Blockquote button (Ctrl+Shift+B)
- **horizontalRule** - Insert horizontal rule (`<hr/>`) button
- **codeBlock** - Code block button (Ctrl+Alt+C)
- **link** - Link button (basic prompt-based) (Ctrl+K)
- **image** - Image button (basic prompt-based)

#### Editor Controls
- **undo** - Undo button (Ctrl+Z)
- **redo** - Redo button (Ctrl+Y)
- **fullscreen** - Toggle fullscreen mode button (F11)
- **htmlSource** - Toggle HTML source view button (Ctrl+Shift+H)

#### Layout Controls
- **separator** - Visual separator between button groups
- **newline** - Force toolbar to wrap to the next line

#### Dropdown Configuration
- **dropdown** - Create grouped dropdowns with custom titles, icons, and actions

Example dropdown configuration:
```yml
- 'dropdown':
    title: 'Custom Group'
    icon: 'custom-icon'
    actions:
    - 'bold'
    - 'italic'
    - 'underline'
```


### Dynamic Extension System

You can place your own extension as a parameter in the toolbar config:

```yml
SilverStripe\Forms\HTMLEditor\HTMLEditorField:
  tiptap_config:
    toolbar:
      - 'ss-foo-bar-ext': 'app/my-toolbar-ext: app/client/myextension.js'
```

The TipTap integration supports dynamic loading of JavaScript extensions through YML configuration. This allows you to add custom toolbar buttons and functionality without modifying the core code.

#### Setting Up Extensions

1. **Create Extension Directory**: Extensions should be placed in the `client/ext/` directory of your module
2. **Expose Directory**: Add the `client/ext` directory to your module's `composer.json` expose configuration:

```json
{
  "extra": {
    "expose": [
      "client/dist",
      "client/css",
      "client/ext"
    ]
  }
}
```

3. **Run Composer**: After updating composer.json, run `composer vendor-expose` to make the files publicly accessible

#### Extension Configuration

Extensions can be defined in several ways:

1. **Single Extension**: Add individual extensions to the toolbar
2. **Extension Dropdown**: Group multiple related extensions in a dropdown

```yml
SilverStripe\Forms\HTMLEditor\HTMLEditorField:
  tiptap_config:
    toolbar:
      # Single extension
      - 'my-extension': 'my/module: client/ext/my-extension.js'
      # Extension dropdown
      - 'dropdown':
        title: 'Links'
        icon: 'links'
        actions:
        - 'ss-link-site': 'otago/silverstripe-tiptap: client/ext/silverstripe-link-page-on-site.js'
        - 'ss-link-ext': 'otago/silverstripe-tiptap: client/ext/silverstripe-link-external.js'
        - 'ss-link-file': 'otago/silverstripe-tiptap: client/ext/silverstripe-link-file.js'
```

#### Extension JavaScript Structure

Extensions should export an object with the following structure:

```javascript
// client/ext/my-extension.js
export default {
  name: 'my-extension',
  
  // Called when the extension is initialized
  init: function(editor, config) {
    console.log('Extension initialized', editor, config);
  },
  
  // Called when rendering as a standalone toolbar button
  createButton: function(editor, config, tiptapInstance) {
    const button = $('<button type="button" data-action="my-extension">My Extension</button>');
    
    button.on('click', () => {
      this.onClick(editor, config, tiptapInstance);
    });
    
    return button;
  },
  
  // Called when the extension is clicked (used by both button and dropdown)
  onClick: function(editor, config, tiptapInstance) {
    console.log('Extension clicked');
  },
  
  // Called to check if the button/item should be active
  isActive: function(editor) {
    return false;
  },
  
  // Called to check if the button/item should be disabled
  isDisabled: function(editor) {
    return false;
  }
};
```

### Heading Levels

Customize which heading levels are available:

```yml
SilverStripe\Forms\HTMLEditor\HTMLEditorField:
  tiptap_config:
    headingLevels:
      - 1  # H1
      - 2  # H2
      - 3  # H3
```

### Editor Settings

```yml
SilverStripe\Forms\HTMLEditor\HTMLEditorField:
  tiptap_config:
    autofocus: false                    # Auto-focus editor on load
    placeholder: 'Start typing...'      # Placeholder text
    minHeight: 200                      # Minimum editor height in pixels
```

### Custom Styles

Configure custom CSS classes that users can apply to text selections:

```yml
SilverStripe\Forms\HTMLEditor\HTMLEditorField:
  tiptap_config:
    styles:
      - title: 'Warning Text'
        className: 'warning'
        previewClass: 'warning-preview'
      - title: 'Alerts'
        children:
          - title: 'Error'
            className: 'alert-error'
            previewClass: 'alert-error-preview'
          - title: 'Info'
            className: 'alert-info'
            previewClass: 'alert-info-preview'
      - title: 'Highlight Text'
        className: 'text-highlight'
        previewClass: 'text-highlight-preview'
```

**Style Configuration Options:**
- **title** - Display name in the dropdown
- **className** - CSS class applied to the selected text
- **previewClass** - CSS class applied to the dropdown button for preview styling
- **children** - Array of child styles (creates grouped dropdown sections)

**Features:**
- Supports nested groups for better organization with tree menu structure
- Hoverable/clickable submenus with right arrows (›) to indicate expansion
- Preview styling in the dropdown shows how styles will look
- Applied as `class` attribute on `<span>` elements
- Toggle functionality - clicking again removes the style
- Fully configurable through YML without code changes

**Tree Menu Structure:**
When using nested groups, subcategories appear as expandable menu items with right arrows. Hover over or click on a group item to reveal its submenu with the available styles.

### Table Editor

The editor includes comprehensive table editing capabilities that provide full parity with SilverStripe's TinyMCE table editor. The table functionality is accessible through a dropdown menu.

**Available Table Actions:**
- **Insert Table** - Creates a new 3x3 table with header row
- **Add Column Before** - Adds a new column to the left of the current selection
- **Add Column After** - Adds a new column to the right of the current selection  
- **Delete Column** - Removes the currently selected column
- **Add Row Before** - Adds a new row above the current selection
- **Add Row After** - Adds a new row below the current selection
- **Delete Row** - Removes the currently selected row
- **Delete Table** - Removes the entire table
- **Merge Cells** - Combines selected cells into a single cell
- **Split Cell** - Splits a merged cell back into individual cells
- **Toggle Header Column** - Converts selected column to/from header cells
- **Toggle Header Row** - Converts selected row to/from header cells  
- **Toggle Header Cell** - Converts selected cell to/from header cell

**Features:**
- Column resizing support with visual handles
- Cell selection highlighting
- Automatic table formatting and borders
- Responsive table wrapper for overflow handling
- Context-aware button states (actions only available when appropriate)
- Full keyboard navigation support
- Proper semantic HTML markup (`<table>`, `<thead>`, `<tbody>`, `<th>`, `<td>`)

**Usage:**
```yml
SilverStripe\Forms\HTMLEditor\HTMLEditorField:
  tiptap_config:
    toolbar:
      - 'table'  # Add table dropdown
```

The table editor automatically handles complex table operations like cell merging, header management, and maintains proper table structure throughout editing operations.

## Custom Configurations

### Minimal Editor

For simple content editing:

```yml
SilverStripe\Forms\HTMLEditor\HTMLEditorField:
  tiptap_config:
    toolbar:
      - 'bold'
      - 'italic'
      - 'separator'
      - 'undo'
      - 'redo'
    extensions:
      - 'StarterKit'
```

### Rich Editor

For comprehensive content creation:

```yml
SilverStripe\Forms\HTMLEditor\HTMLEditorField:
  tiptap_config:
    toolbar:
      - 'bold'
      - 'italic'
      - 'underline'
      - 'separator'
      - 'dropdown':
        title: 'Headings'
        icon: 'headings'
        actions:
        - 'paragraph'
        - 'heading1'
        - 'heading2'
        - 'heading3'
        - 'heading4'
        - 'heading5'
        - 'heading6'
      - 'dropdown':
        title: 'Lists'
        icon: 'lists'
        actions:
        - 'bulletList'
        - 'orderedList'
      - 'separator'
      - 'blockquote'
      - 'horizontalRule'
      - 'codeBlock'
      - 'highlight'
      - 'link'
      - 'image'
      - 'separator'
      - 'styles'
      - 'table'
      - 'separator'
      - 'fullscreen'
      - 'htmlSource'
      - 'separator'
      - 'undo'
      - 'redo'
```

### Blog Editor

For blog post editing:

```yml
SilverStripe\Forms\HTMLEditor\HTMLEditorField:
  tiptap_config:
    toolbar:
      - 'bold'
      - 'italic'
      - 'separator'
      - 'paragraph'
      - 'heading2'
      - 'heading3'
      - 'heading4'
      - 'bulletList'
      - 'orderedList'
      - 'separator'
      - 'blockquote'
      - 'horizontalRule'
      - 'link'
      - 'separator'
      - 'undo'
      - 'redo'
    placeholder: 'Write your blog post...'
    minHeight: 400
```

### HTML Source Editor

The HTML source editor allows users to view and edit the raw HTML content directly. This is useful for advanced users who need to tweak the HTML markup manually.

**Features:**
- Toggle between WYSIWYG and HTML source modes
- Syntax highlighting for better HTML readability
- Monospace font for better code editing experience
- Proper textarea with resize functionality
- Automatic content synchronization when switching modes
- Clean, responsive interface

**Usage:**
```yml
SilverStripe\Forms\HTMLEditor\HTMLEditorField:
  tiptap_config:
    toolbar:
      - 'htmlSource'  # Add HTML source toggle button
```

**How it works:**
1. Click the HTML source button (code icon) to switch to HTML mode
2. The WYSIWYG editor is hidden and replaced with a textarea containing the HTML
3. Edit the HTML directly in the textarea
4. Click the HTML source button again to switch back to WYSIWYG mode
5. The editor content is automatically updated with your HTML changes

### Fullscreen Mode

The editor includes a fullscreen toggle button that allows users to expand the editor to take up the entire browser window. This provides a distraction-free writing experience.

**Features:**
- Cross-browser fullscreen API support using the `screenfull` library
- Automatic button state updates (enter/exit fullscreen icons)
- Enhanced styling when in fullscreen mode
- Larger padding and improved typography for better readability
- ESC key support to exit fullscreen (browser default)

**Usage:**
```yml
SilverStripe\Forms\HTMLEditor\HTMLEditorField:
  tiptap_config:
    toolbar:
      - 'fullscreen'  # Add fullscreen toggle button
```

The fullscreen button will only be enabled if the browser supports the Fullscreen API.

### Horizontal Rules

The editor includes a horizontal rule button that allows users to insert `<hr/>` elements into the content. This creates a visual separator between content sections.

**Features:**
- Inserts standard HTML `<hr/>` elements
- Button is automatically disabled when horizontal rules cannot be inserted
- Includes internationalized tooltip with clear description
- Works seamlessly with SilverStripe's HTML processing

**Usage:**
```yml
SilverStripe\Forms\HTMLEditor\HTMLEditorField:
  tiptap_config:
    toolbar:
      - 'horizontalRule'  # Add horizontal rule button
```

The horizontal rule feature uses TipTap's built-in HorizontalRule extension (included in StarterKit) and requires no additional setup.

## Internationalization and Tooltips

### Tooltip Support

The editor automatically provides tooltips for all toolbar buttons, including keyboard shortcuts where available. Tooltips are displayed on hover and include:

- **Button descriptions** - What each button does
- **Keyboard shortcuts** - Common shortcuts like Ctrl+B for bold, Ctrl+I for italic, etc.
- **Internationalization** - All tooltips can be translated through SilverStripe's i18n system

### Language Support

To translate tooltips and interface elements, create language files in your project:

```yml
# lang/en.yml
en:
  SilverStripeTipTap:
    BOLD_TOOLTIP: 'Bold (Ctrl+B)'
    ITALIC_TOOLTIP: 'Italic (Ctrl+I)'
    UNDERLINE_TOOLTIP: 'Underline (Ctrl+U)'
    # ... etc
```

```yml
# lang/de.yml  
de:
  SilverStripeTipTap:
    BOLD_TOOLTIP: 'Fett (Strg+B)'
    ITALIC_TOOLTIP: 'Kursiv (Strg+I)'
    UNDERLINE_TOOLTIP: 'Unterstreichen (Strg+U)'
    # ... etc
```

### Available Translation Keys

The following keys are available for translation:

#### Toolbar Buttons
- `BOLD_TOOLTIP`, `ITALIC_TOOLTIP`, `UNDERLINE_TOOLTIP`, `STRIKETHROUGH_TOOLTIP`
- `SUBSCRIPT_TOOLTIP`, `SUPERSCRIPT_TOOLTIP`, `CODE_TOOLTIP`, `HIGHLIGHT_TOOLTIP`
- `HEADING_TOOLTIP`, `LISTS_TOOLTIP`, `ALIGN_TOOLTIP`, `STYLES_TOOLTIP`
- `BLOCKQUOTE_TOOLTIP`, `HORIZONTALRULE_TOOLTIP`, `CODEBLOCK_TOOLTIP`, `LINK_TOOLTIP`, `IMAGE_TOOLTIP`
- `UNDO_TOOLTIP`, `REDO_TOOLTIP`, `FULLSCREEN_TOOLTIP`, `HTMLSOURCE_TOOLTIP`

#### Dropdown Options
- `HEADING_H1` through `HEADING_H6`, `HEADING_PARAGRAPH`
- `LIST_BULLET`, `LIST_ORDERED`
- `ALIGN_LEFT`, `ALIGN_CENTER`, `ALIGN_RIGHT`, `ALIGN_JUSTIFY`

#### SilverStripe Extensions
- `SS_LINK_EXT`, `SS_LINK_SITE`, `SS_LINK_FILE`, `SS_LINK_MEDIA`

### Keyboard Shortcuts

The editor supports these keyboard shortcuts:

- **Ctrl+B** - Bold
- **Ctrl+I** - Italic  
- **Ctrl+U** - Underline
- **Ctrl+Shift+X** - Strikethrough
- **Ctrl+Alt+1** - Heading 1
- **Ctrl+Alt+2** - Heading 2
- **Ctrl+Alt+3** - Heading 3
- **Ctrl+Alt+4** - Heading 4
- **Ctrl+Alt+5** - Heading 5
- **Ctrl+Alt+6** - Heading 6
- **Ctrl+L** - Align Left
- **Ctrl+E** - Align Center
- **Ctrl+R** - Align Right
- **Ctrl+J** - Justify
- **Ctrl+,** - Subscript
- **Ctrl+.** - Superscript
- **Ctrl+E** - Inline code
- **Ctrl+Shift+B** - Blockquote
- **Ctrl+Alt+C** - Code block
- **Ctrl+K** - Link
- **Ctrl+Z** - Undo
- **Ctrl+Y** - Redo
- **F11** - Toggle fullscreen
- **Ctrl+Shift+H** - Toggle HTML source mode

## Extension Architecture

This TipTap integration uses an optimized extension setup:

- **StarterKit**: Provides core extensions (Bold, Italic, Paragraph, Heading, Lists, Blockquote, CodeBlock, History, etc.)
- **Additional Extensions**: Only adds extensions not included in StarterKit (Underline, Strike, Image, Highlight, Link, TextAlign, Subscript, Superscript)
- **No Redundancy**: Avoids loading duplicate extensions that could cause conflicts

All extensions are pre-configured at build time for optimal performance and reliability.

## File Locations

1. **Default Configuration**: `silverstripe-tiptap/_config/tiptap-config.yml`
2. **Custom Configuration**: Create in your `app/_config/` folder
3. **Example Configuration**: `silverstripe-tiptap/_config/tiptap-custom-example.yml`

## Configuration Priority

SilverStripe YML configurations follow a priority system:

1. Later configurations override earlier ones
2. Use `After:` directive to ensure your config loads after the default
3. Use `Before:` directive to load before other configurations

Example:
```yml
---
Name: my-tiptap-config
After:
  - 'tiptap-config'
---
```

## Programmatic Configuration

You can also configure the editor programmatically in PHP:

```php
use SilverStripe\Forms\HTMLEditor\HTMLEditorField;

$field = HTMLEditorField::create('Content', 'Content');
$field->setAttribute('data-tiptap-config', json_encode([
    'toolbar' => ['bold', 'italic', 'undo', 'redo'],
    'placeholder' => 'Custom placeholder...'
]));
```

## Troubleshooting

- **Buttons not appearing**: Check that the required extension is included in the `extensions` array
- **Configuration not applying**: Ensure YML files are in the correct location and properly formatted
- **Build cache**: Run `dev/build?flush=1` after changing configurations
- **Check console**: Browser console will show warnings for missing extensions or invalid configurations
