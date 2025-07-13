# Example custom TipTap configuration
# Save this in your app/_config/ folder as tiptap-custom.yml

---
Name: tiptap-custom
After:
  - 'tiptap-config'
---

# Custom TipTap configuration example
SilverStripe\Forms\HTMLEditor\HTMLEditorField:
  tiptap_config:
    # Custom toolbar layout - minimal setup
    toolbar:
      - 'undo'
      - 'redo'
      - 'separator'
      - 'heading'
      - 'bold'
      - 'italic' 
      - 'underline'
      - 'separator'
      - 'lists'
      - 'separator'
      - 'blockquote'
      - 'codeBlock'
      - 'highlight'
      - 'separator'
      - 'fullscreen'
      - 'code'
    
    # Only include essential extensions
    extensions:
      - 'StarterKit'
      - 'Underline'
    
    # Only allow H1 and H2
    headingLevels:
      - 1
      - 2
    
    # Custom settings
    autofocus: true
    placeholder: 'Write your content here...'
    minHeight: 150

# Alternative: Rich editor setup
# Uncomment the section below for a feature-rich editor

# SilverStripe\Forms\HTMLEditor\HTMLEditorField:
#   tiptap_config:
#     # Full toolbar with all features
#     toolbar:
#       - 'bold'
#       - 'italic'
#       - 'underline'
#       - 'separator'
#       - 'heading'
#       - 'lists'
#       - 'separator'
#       - 'blockquote'
#       - 'codeBlock'
#       - 'highlight'
#       - 'link'
#       - 'image'
#       - 'separator'
#       - 'undo'
#       - 'redo'
#     
#     # All available extensions
#     extensions:
#       - 'StarterKit'
#       - 'Underline'
#       - 'Highlight'
#       - 'Link'
#       - 'Image'
#     
#     # All heading levels
#     headingLevels:
#       - 1
#       - 2
#       - 3
#       - 4
#       - 5
#       - 6
#     
#     # Rich editor settings
#     autofocus: false
#     placeholder: 'Start creating amazing content...'
#     minHeight: 300
