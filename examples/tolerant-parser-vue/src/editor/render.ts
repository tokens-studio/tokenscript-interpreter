/**
 * AST to DOM rendering for the tokenscript editor.
 * Converts parsed tokens into styled DOM elements with optional rich elements.
 */

import {
  TokenType,
  type Token,
  type TolerantParseResult,
  type ASTNode,
  PartialFunctionCallNode,
} from '@tokens-studio/tokenscript-interpreter/interpreter'
import type { ColorSwatchInfo } from './types'

export interface RenderOptions {
  renderColorSwatch: boolean
  onColorSwatchClick?: (info: ColorSwatchInfo) => void
}

// Color function names to detect
const COLOR_FUNCTIONS = ['rgb', 'rgba', 'hsl', 'hsla', 'oklch']

/**
 * Get the CSS class for a token type.
 */
function getTokenClass(token: Token): string {
  switch (token.type) {
    case TokenType.REFERENCE:
      return 'ts-token-reference'
    case TokenType.PARTIAL_REFERENCE:
      return 'ts-token-reference ts-token-partial'
    case TokenType.EXPLICIT_STRING:
      return 'ts-token-string'
    case TokenType.STRING:
      // Check if it's a color function name
      if (typeof token.value === 'string' && COLOR_FUNCTIONS.includes(token.value.toLowerCase())) {
        return 'ts-token-function'
      }
      return 'ts-token-string'
    case TokenType.PARTIAL_STRING:
      return 'ts-token-string ts-token-partial'
    case TokenType.NUMBER:
      return 'ts-token-number'
    case TokenType.HEX_COLOR:
      return 'ts-token-color'
    case TokenType.OPERATION:
    case TokenType.LOGIC_AND:
    case TokenType.LOGIC_OR:
    case TokenType.LOGIC_NOT:
    case TokenType.IS_EQ:
    case TokenType.IS_GT:
    case TokenType.IS_LT:
    case TokenType.IS_GT_EQ:
    case TokenType.IS_LT_EQ:
    case TokenType.IS_NOT_EQ:
      return 'ts-token-operator'
    case TokenType.RESERVED_KEYWORD:
      return 'ts-token-keyword'
    case TokenType.LPAREN:
    case TokenType.RPAREN:
      return 'ts-token-paren'
    case TokenType.COMMA:
      return 'ts-token-comma'
    default:
      return 'ts-token-text'
  }
}

/**
 * Normalize a hex color for display (pad short hex codes).
 */
function normalizeHex(hex: string): string {
  const digits = hex.slice(1)
  if (digits.length === 1) return `#${digits}${digits}${digits}`
  if (digits.length === 2) return `#${digits}${digits.charAt(0)}`
  if (digits.length === 4) return `#${digits.slice(0, 3)}`
  if (digits.length === 5) return `#${digits.slice(0, 3)}`
  return hex
}

/**
 * Create a text span with the given class.
 */
function createTextSpan(text: string, className: string): HTMLSpanElement {
  const span = document.createElement('span')
  span.className = className
  span.textContent = text
  return span
}

/**
 * Create a color swatch element.
 */
function createColorSwatch(
  color: string,
  info: ColorSwatchInfo,
  onClick?: (info: ColorSwatchInfo) => void
): HTMLSpanElement {
  const swatch = document.createElement('span')
  swatch.className = 'ts-color-swatch'
  if (info.isPartial) {
    swatch.classList.add('ts-color-swatch-partial')
  }
  swatch.style.backgroundColor = color
  swatch.contentEditable = 'false'
  swatch.setAttribute('data-pos', String(info.pos))
  swatch.setAttribute('data-end-pos', String(info.endPos))
  // Store original text for finding position after edits
  swatch.setAttribute('data-original-text', info.originalText || '')

  if (onClick) {
    swatch.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      onClick(info)
    })
  }

  return swatch
}

/**
 * Collect color function information from AST nodes.
 */
function collectColorFunctions(
  node: ASTNode,
  colors: ColorSwatchInfo[],
  originalText: string
): void {
  if (!node) return

  const nodeAny = node as any

  // Check for function calls (complete or partial)
  if (nodeAny.nodeType === 'FunctionCallNode' || node instanceof PartialFunctionCallNode) {
    const name = (nodeAny.name?.toLowerCase() || '') as string
    const args = nodeAny.args || []
    const token = nodeAny.token

    if (COLOR_FUNCTIONS.includes(name) && token) {
      const values = args
        .map((a: any) => {
          if (!a) return null
          if (a.nodeType === 'NumNode') return a.value
          if (typeof a.value === 'number') return a.value
          return null
        })
        .filter((v: number | null) => v !== null)

      const isPartial = node instanceof PartialFunctionCallNode || values.length < 3

      let cssColor: string
      if (['rgb', 'rgba'].includes(name)) {
        const [r, g, b, alpha] = [...values, 128, 128, 128, 1]
        cssColor = name === 'rgba' && values.length >= 4
          ? `rgba(${r}, ${g}, ${b}, ${alpha})`
          : `rgb(${r ?? 128}, ${g ?? 128}, ${b ?? 128})`
      } else if (['hsl', 'hsla'].includes(name)) {
        const [h, s, l, alpha] = [...values, 0, 50, 50, 1]
        cssColor = name === 'hsla' && values.length >= 4
          ? `hsla(${h}, ${s}%, ${l}%, ${alpha})`
          : `hsl(${h ?? 0}, ${s ?? 50}%, ${l ?? 50}%)`
      } else if (name === 'oklch') {
        const [l, c, h] = [...values, 0.5, 0.15, 0]
        cssColor = `oklch(${l ?? 0.5} ${c ?? 0.15} ${h ?? 0})`
      } else {
        cssColor = '#808080'
      }

      // Find end position for function call
      let endPos = token.endPos
      if (nodeAny.args && nodeAny.args.length > 0) {
        const lastArg = nodeAny.args[nodeAny.args.length - 1]
        if (lastArg?.token?.endPos) {
          endPos = lastArg.token.endPos
        }
      }
      // Look for closing paren
      if (!isPartial) {
        const afterArgs = originalText.slice(endPos)
        const parenMatch = afterArgs.match(/^\s*\)/)
        if (parenMatch) {
          endPos += parenMatch[0].length
        }
      }

      // Store the original text for this color
      const colorOriginalText = originalText.slice(token.pos, endPos)

      colors.push({
        color: cssColor,
        pos: token.pos,
        endPos,
        isPartial,
        originalText: colorOriginalText
      })
    }
  }

  // Walk child nodes
  if (nodeAny.left) collectColorFunctions(nodeAny.left, colors, originalText)
  if (nodeAny.right) collectColorFunctions(nodeAny.right, colors, originalText)
  if (nodeAny.expr) collectColorFunctions(nodeAny.expr, colors, originalText)
  if (nodeAny.args) {
    for (const arg of nodeAny.args) {
      collectColorFunctions(arg, colors, originalText)
    }
  }
  if (nodeAny.elements) {
    for (const el of nodeAny.elements) {
      collectColorFunctions(el, colors, originalText)
    }
  }
}

/**
 * Render the parse result as a DOM fragment.
 */
export function renderToDOM(
  parseResult: TolerantParseResult,
  originalText: string,
  options: RenderOptions
): DocumentFragment {
  const fragment = document.createDocumentFragment()

  if (!originalText) {
    return fragment
  }

  const tokens = parseResult.tokens
  let lastEnd = 0

  // Collect color functions from AST for swatch rendering
  const colorFunctions: ColorSwatchInfo[] = []
  if (options.renderColorSwatch && parseResult.ast) {
    collectColorFunctions(parseResult.ast, colorFunctions, originalText)
  }

  // Create a map of positions to color swatches
  const colorAtPos = new Map<number, ColorSwatchInfo>()
  for (const color of colorFunctions) {
    colorAtPos.set(color.pos, color)
  }

  for (const token of tokens) {
    if (token.type === TokenType.EOF) break

    // Add any gap between tokens as plain text
    if (token.pos > lastEnd) {
      const gapText = originalText.slice(lastEnd, token.pos)
      fragment.appendChild(createTextSpan(gapText, 'ts-token-text'))
    }

    // Get the original text for this token
    const tokenText = originalText.slice(token.pos, token.endPos)
    const tokenClass = getTokenClass(token)

    // Create token span
    const span = document.createElement('span')
    span.className = tokenClass

    // Add color swatch for hex colors
    if (options.renderColorSwatch && token.type === TokenType.HEX_COLOR) {
      const hexValue = token.value as string
      const isPartial = hexValue.length < 4 // #F is partial
      const swatchInfo: ColorSwatchInfo = {
        color: normalizeHex(hexValue),
        pos: token.pos,
        endPos: token.endPos,
        isPartial,
        originalText: tokenText
      }
      const swatch = createColorSwatch(
        normalizeHex(hexValue),
        swatchInfo,
        options.onColorSwatchClick
      )
      span.appendChild(swatch)
    }

    // Add color swatch for color functions (check if this is a function name token)
    const colorFunc = colorAtPos.get(token.pos)
    if (options.renderColorSwatch && colorFunc &&
        token.type === TokenType.STRING &&
        typeof token.value === 'string' &&
        COLOR_FUNCTIONS.includes(token.value.toLowerCase())) {
      const swatch = createColorSwatch(
        colorFunc.color,
        colorFunc,
        options.onColorSwatchClick
      )
      span.appendChild(swatch)
    }

    // Add the text content
    span.appendChild(document.createTextNode(tokenText))

    fragment.appendChild(span)
    lastEnd = token.endPos
  }

  // Add any trailing text
  if (lastEnd < originalText.length) {
    const trailingText = originalText.slice(lastEnd)
    fragment.appendChild(createTextSpan(trailingText, 'ts-token-text'))
  }

  return fragment
}
