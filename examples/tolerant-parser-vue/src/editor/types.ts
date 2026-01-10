import type { TolerantParseResult } from '@tokens-studio/tokenscript-interpreter/interpreter'

export interface EditorOptions {
  /** The element to attach the editor to */
  element: HTMLElement
  /** Initial value */
  initialValue?: string
  /** Called when content changes */
  onChange?: (value: string, result: TolerantParseResult) => void
  /** Called when cursor position changes */
  onCursorChange?: (position: number) => void
  /** Show inline color swatches (default: true) */
  renderColorSwatch?: boolean
  /** Placeholder text when empty */
  placeholder?: string
}

export interface EditorState {
  text: string
  cursorPosition: number
  parseResult: TolerantParseResult | null
}

export interface ColorSwatchInfo {
  color: string
  pos: number
  endPos: number
  isPartial: boolean
  originalText?: string  // The original text for this color (used for replacement)
}
