/**
 * Tokenscript Editor
 *
 * A minimal rich text editor for tokenscript expressions with:
 * - AST-based syntax highlighting
 * - Inline rich elements (color swatches)
 * - Cross-browser support (Safari iOS, IME, etc.)
 * - Cursor position preservation across re-renders
 */

export { TokenscriptEditor } from './TokenscriptEditor'
export type { EditorOptions, EditorState, ColorSwatchInfo } from './types'
export { getCursorOffset, setCursorOffset, getSelectionRange, setSelectionRange } from './selection'
export { renderToDOM } from './render'
