/**
 * TokenscriptEditor - A minimal rich text editor for tokenscript expressions.
 *
 * Uses contenteditable with AST-based syntax highlighting and inline rich elements
 * (like color swatches). Handles cross-browser quirks for Safari iOS, IME input, etc.
 */

import { parseTolerantly, type TolerantParseResult } from '@tokens-studio/tokenscript-interpreter/interpreter'
import type { EditorOptions, ColorSwatchInfo } from './types'
import { getCursorOffset, setCursorOffset } from './selection'
import { renderToDOM } from './render'

export class TokenscriptEditor {
  private element: HTMLElement
  private text: string = ''
  private isComposing: boolean = false
  private options: EditorOptions
  private boundHandleInput: () => void
  private boundHandleKeydown: (e: KeyboardEvent) => void
  private boundHandleCompositionStart: () => void
  private boundHandleCompositionEnd: () => void
  private boundHandlePaste: (e: ClipboardEvent) => void

  constructor(options: EditorOptions) {
    this.options = options
    this.element = options.element
    this.text = options.initialValue || ''

    // Bind event handlers for cleanup
    this.boundHandleInput = this.handleInput.bind(this)
    this.boundHandleKeydown = this.handleKeydown.bind(this)
    this.boundHandleCompositionStart = () => { this.isComposing = true }
    this.boundHandleCompositionEnd = () => {
      this.isComposing = false
      this.handleInput()
    }
    this.boundHandlePaste = this.handlePaste.bind(this)

    this.setupElement()
    this.attachListeners()
    this.render()
  }

  /**
   * Set up the contenteditable element with cross-browser fixes.
   */
  private setupElement(): void {
    this.element.contentEditable = 'true'
    this.element.spellcheck = false
    this.element.setAttribute('role', 'textbox')
    this.element.setAttribute('aria-multiline', 'false')

    // Safari iOS fix - required for touch editing to work
    ;(this.element.style as any).webkitUserSelect = 'text'
    this.element.style.userSelect = 'text'

    // Prevent text formatting
    ;(this.element.style as any).webkitUserModify = 'read-write-plaintext-only'

    // Add editor class
    this.element.classList.add('ts-editor')

    // Set placeholder via data attribute
    if (this.options.placeholder) {
      this.element.dataset.placeholder = this.options.placeholder
    }

    // Consistent paragraph behavior across browsers
    try {
      document.execCommand('defaultParagraphSeparator', false, 'div')
    } catch {
      // execCommand may not be available in all contexts
    }
  }

  /**
   * Attach event listeners.
   */
  private attachListeners(): void {
    this.element.addEventListener('input', this.boundHandleInput)
    this.element.addEventListener('keydown', this.boundHandleKeydown)
    this.element.addEventListener('compositionstart', this.boundHandleCompositionStart)
    this.element.addEventListener('compositionend', this.boundHandleCompositionEnd)
    this.element.addEventListener('paste', this.boundHandlePaste)
  }

  /**
   * Handle input events - reparse and re-render.
   */
  private handleInput(): void {
    // Don't process during IME composition (CJK input)
    if (this.isComposing) return

    // Save cursor position as text offset before re-render
    const cursorOffset = getCursorOffset(this.element)

    // Extract plain text from contenteditable
    // Use textContent to get only text without HTML
    this.text = this.element.textContent || ''

    // Re-render with syntax highlighting
    this.render()

    // Restore cursor position
    setCursorOffset(this.element, cursorOffset)

    // Notify listeners
    const parseResult = parseTolerantly(this.text)
    this.options.onChange?.(this.text, parseResult)
  }

  /**
   * Handle keydown events - prevent formatting commands, handle special keys.
   */
  private handleKeydown(e: KeyboardEvent): void {
    // Prevent browser formatting commands (Ctrl+B, Ctrl+I, Ctrl+U)
    if ((e.ctrlKey || e.metaKey) && ['b', 'i', 'u'].includes(e.key.toLowerCase())) {
      e.preventDefault()
      return
    }

    // Prevent Enter from creating new lines (single-line editor)
    if (e.key === 'Enter') {
      e.preventDefault()
      return
    }

    // Handle backspace/delete near non-editable elements (color swatches)
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return

      const range = selection.getRangeAt(0)

      // Check if we're at the edge of a non-editable element
      if (range.collapsed) {
        const node = range.startContainer
        const offset = range.startOffset

        // For Backspace: check previous sibling or previous character position
        if (e.key === 'Backspace') {
          let prevNode: Node | null = null

          if (node.nodeType === Node.TEXT_NODE && offset === 0) {
            // At start of text node, check previous sibling
            prevNode = node.previousSibling
          } else if (node.nodeType === Node.ELEMENT_NODE && offset > 0) {
            // In element, check child at offset - 1
            prevNode = node.childNodes[offset - 1]
          }

          // If previous node is non-editable or contains non-editable, handle specially
          if (prevNode && this.isOrContainsNonEditable(prevNode)) {
            e.preventDefault()
            // Get cursor position, delete the character before, re-render
            const cursorOffset = getCursorOffset(this.element)
            if (cursorOffset > 0) {
              this.text = this.text.slice(0, cursorOffset - 1) + this.text.slice(cursorOffset)
              this.render()
              setCursorOffset(this.element, cursorOffset - 1)

              const parseResult = parseTolerantly(this.text)
              this.options.onChange?.(this.text, parseResult)
            }
            return
          }
        }

        // For Delete: check next sibling or next character position
        if (e.key === 'Delete') {
          let nextNode: Node | null = null

          if (node.nodeType === Node.TEXT_NODE && offset === (node.textContent?.length || 0)) {
            // At end of text node, check next sibling
            nextNode = node.nextSibling
          } else if (node.nodeType === Node.ELEMENT_NODE && offset < node.childNodes.length) {
            // In element, check child at offset
            nextNode = node.childNodes[offset]
          }

          if (nextNode && this.isOrContainsNonEditable(nextNode)) {
            e.preventDefault()
            const cursorOffset = getCursorOffset(this.element)
            if (cursorOffset < this.text.length) {
              this.text = this.text.slice(0, cursorOffset) + this.text.slice(cursorOffset + 1)
              this.render()
              setCursorOffset(this.element, cursorOffset)

              const parseResult = parseTolerantly(this.text)
              this.options.onChange?.(this.text, parseResult)
            }
            return
          }
        }
      }
    }
  }

  /**
   * Check if a node is non-editable or contains a non-editable element.
   */
  private isOrContainsNonEditable(node: Node): boolean {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement
      if (el.contentEditable === 'false' || el.classList.contains('ts-color-swatch')) {
        return true
      }
      // Check children
      const nonEditableChild = el.querySelector('[contenteditable="false"], .ts-color-swatch')
      if (nonEditableChild) {
        return true
      }
    }
    return false
  }

  /**
   * Handle paste events - ensure plain text only.
   */
  private handlePaste(e: ClipboardEvent): void {
    e.preventDefault()

    // Get plain text from clipboard
    const text = e.clipboardData?.getData('text/plain') || ''

    // Remove newlines for single-line editor
    const cleanText = text.replace(/[\r\n]+/g, ' ')

    // Insert at cursor position
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      range.deleteContents()

      const textNode = document.createTextNode(cleanText)
      range.insertNode(textNode)

      // Move cursor after inserted text
      range.setStartAfter(textNode)
      range.collapse(true)
      selection.removeAllRanges()
      selection.addRange(range)
    }

    // Trigger input handling
    this.handleInput()
  }

  /**
   * Handle color swatch click - open color picker.
   */
  private handleColorSwatchClick(info: ColorSwatchInfo): void {
    // Store the original text to find in the current text
    const originalColorText = info.originalText || this.text.slice(info.pos, info.endPos)

    // Create a hidden color input
    const colorInput = document.createElement('input')
    colorInput.type = 'color'
    colorInput.value = this.cssColorToHex(info.color)
    colorInput.style.position = 'absolute'
    colorInput.style.opacity = '0'
    colorInput.style.pointerEvents = 'none'
    document.body.appendChild(colorInput)

    // Only update on change (when picker closes) to avoid stale position issues
    colorInput.addEventListener('change', () => {
      const newColor = colorInput.value.toUpperCase()

      // Find the current position of the original color text
      const currentPos = this.text.indexOf(originalColorText)
      if (currentPos === -1) {
        // Color text no longer exists, just clean up
        document.body.removeChild(colorInput)
        return
      }

      const before = this.text.slice(0, currentPos)
      const after = this.text.slice(currentPos + originalColorText.length)

      // Format based on original color type
      let newColorString: string
      if (originalColorText.toLowerCase().startsWith('rgba')) {
        const rgb = this.hexToRgb(newColor)
        newColorString = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`
      } else if (originalColorText.toLowerCase().startsWith('rgb')) {
        const rgb = this.hexToRgb(newColor)
        newColorString = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
      } else if (originalColorText.toLowerCase().startsWith('hsla')) {
        const hsl = this.hexToHsl(newColor)
        newColorString = `hsla(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%, 1)`
      } else if (originalColorText.toLowerCase().startsWith('hsl')) {
        const hsl = this.hexToHsl(newColor)
        newColorString = `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`
      } else if (originalColorText.toLowerCase().startsWith('oklch')) {
        // Keep as hex for simplicity since oklch conversion is complex
        newColorString = newColor
      } else {
        // Hex color
        newColorString = newColor
      }

      this.text = before + newColorString + after
      this.render()

      // Notify listeners
      const parseResult = parseTolerantly(this.text)
      this.options.onChange?.(this.text, parseResult)

      document.body.removeChild(colorInput)
    })

    // Clean up if user cancels (clicks outside without selecting)
    colorInput.addEventListener('blur', () => {
      // Small delay to allow change event to fire first
      setTimeout(() => {
        if (colorInput.parentNode) {
          document.body.removeChild(colorInput)
        }
      }, 100)
    })

    colorInput.click()
  }

  /**
   * Convert CSS color to hex.
   */
  private cssColorToHex(color: string): string {
    // For hex colors, return as-is
    if (color.startsWith('#')) {
      const hex = color.slice(1)
      if (hex.length === 3) {
        return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
      }
      return color
    }

    // For rgb/rgba, parse and convert
    const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1], 10)
      const g = parseInt(rgbMatch[2], 10)
      const b = parseInt(rgbMatch[3], 10)
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
    }

    // For hsl, convert via canvas
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = color
      ctx.fillRect(0, 0, 1, 1)
      const data = ctx.getImageData(0, 0, 1, 1).data
      return `#${data[0].toString(16).padStart(2, '0')}${data[1].toString(16).padStart(2, '0')}${data[2].toString(16).padStart(2, '0')}`
    }

    return '#000000'
  }

  /**
   * Convert hex to RGB.
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 }
  }

  /**
   * Convert hex to HSL.
   */
  private hexToHsl(hex: string): { h: number; s: number; l: number } {
    const { r, g, b } = this.hexToRgb(hex)
    const rNorm = r / 255
    const gNorm = g / 255
    const bNorm = b / 255

    const max = Math.max(rNorm, gNorm, bNorm)
    const min = Math.min(rNorm, gNorm, bNorm)
    const l = (max + min) / 2

    if (max === min) {
      return { h: 0, s: 0, l: l * 100 }
    }

    const d = max - min
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    let h = 0
    switch (max) {
      case rNorm:
        h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6
        break
      case gNorm:
        h = ((bNorm - rNorm) / d + 2) / 6
        break
      case bNorm:
        h = ((rNorm - gNorm) / d + 4) / 6
        break
    }

    return { h: h * 360, s: s * 100, l: l * 100 }
  }

  /**
   * Render the current text with syntax highlighting.
   */
  private render(): void {
    const parseResult = parseTolerantly(this.text)

    const fragment = renderToDOM(parseResult, this.text, {
      renderColorSwatch: this.options.renderColorSwatch ?? true,
      onColorSwatchClick: (info) => this.handleColorSwatchClick(info)
    })

    this.element.innerHTML = ''
    this.element.appendChild(fragment)

    // Add empty class for placeholder styling
    if (!this.text) {
      this.element.classList.add('ts-editor-empty')
    } else {
      this.element.classList.remove('ts-editor-empty')
    }
  }

  // ============ Public API ============

  /**
   * Get the current text value.
   */
  getValue(): string {
    return this.text
  }

  /**
   * Set the text value programmatically.
   */
  setValue(text: string): void {
    this.text = text
    this.render()

    const parseResult = parseTolerantly(this.text)
    this.options.onChange?.(this.text, parseResult)
  }

  /**
   * Get the current parse result.
   */
  getParseResult(): TolerantParseResult {
    return parseTolerantly(this.text)
  }

  /**
   * Focus the editor.
   */
  focus(): void {
    this.element.focus()
  }

  /**
   * Blur the editor.
   */
  blur(): void {
    this.element.blur()
  }

  /**
   * Clean up event listeners.
   */
  destroy(): void {
    this.element.removeEventListener('input', this.boundHandleInput)
    this.element.removeEventListener('keydown', this.boundHandleKeydown)
    this.element.removeEventListener('compositionstart', this.boundHandleCompositionStart)
    this.element.removeEventListener('compositionend', this.boundHandleCompositionEnd)
    this.element.removeEventListener('paste', this.boundHandlePaste)

    this.element.contentEditable = 'false'
    this.element.classList.remove('ts-editor', 'ts-editor-empty')
  }
}
