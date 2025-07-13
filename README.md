# SilverStripe TipTap WYSIWYG Editor

![Preview](docs/preview.gif)

A modern WYSIWYG editor for SilverStripe using the powerful and extensible [TipTap](https://tiptap.dev) editor.

With SilverStripe 6 moving TinyMCE to an optional plugin, now's the perfect time to upgrade to something **better**.

---

## Configuration

For a full configuration guide, see the [configuration document](docs/CONFIGURATION.md).

Here are some example toolbar configurations you can drop into your project.

---

### 📐 TipTap-like Toolbar (recommended)

To enable this, create a config file at `app/_config/tiptap.yml`:

![Preview](docs/preview1.png)

```yaml
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
      - 'blockquote'
      - 'codeBlock'
      - 'separator'
      - 'bold'
      - 'italic' 
      - 'strikethrough'
      - 'code'
      - 'underline'
      - 'highlight'
      - 'dropdown':
          title: 'Links'
          icon: 'links'
          actions:
            - 'ss-link-site': 'otago/silverstripe-tiptap: client/ext/silverstripe-link-page-on-site.js'
            - 'ss-link-ext': 'otago/silverstripe-tiptap: client/ext/silverstripe-link-external.js'
            - 'ss-link-file': 'otago/silverstripe-tiptap: client/ext/silverstripe-link-file.js'
      - 'separator'
      - 'subscript'
      - 'superscript'
      - 'separator'
      - 'dropdown':
          title: 'Align'
          icon: 'align'
          actions:
            - 'alignLeft'
            - 'alignCenter'
            - 'alignRight'
            - 'alignJustify'
      - 'ss-link-media': 'otago/silverstripe-tiptap: client/ext/silverstripe-link-media.js'
```


### 🧩 SilverStripe-like Toolbar (minimalist)

![Preview](docs/preview2.png)

This example replicates the traditional SilverStripe editor layout:

```yaml
SilverStripe\Forms\HTMLEditor\HTMLEditorField:
  tiptap_config:
    toolbar:
      - 'bold'
      - 'italic' 
      - 'strikethrough'
      - 'underline'
      - 'separator'
      - 'alignLeft'
      - 'alignCenter'
      - 'alignRight'
      - 'alignJustify'
      - 'separator'
      - 'bulletList'
      - 'orderedList'
      - 'separator'
      - 'blockquote'
      - 'horizontalRule'
      - 'newline'
      - 'dropdown':
          title: 'Heading and Paragraph'
          icon: 'headings'
          actions:
            - 'heading1'
            - 'heading2'
            - 'heading3'
            - 'paragraph'
      - 'separator'
      - 'table'
      - 'ss-link-media': 'otago/silverstripe-tiptap: client/ext/silverstripe-link-media.js'
      - 'dropdown':
          title: 'Links'
          icon: 'links'
          actions:
            - 'ss-link-site': 'otago/silverstripe-tiptap: client/ext/silverstripe-link-page-on-site.js'
            - 'ss-link-ext': 'otago/silverstripe-tiptap: client/ext/silverstripe-link-external.js'
            - 'ss-link-file': 'otago/silverstripe-tiptap: client/ext/silverstripe-link-file.js'
      - 'separator'
      - 'fullscreen'
      - 'htmlSource'
```