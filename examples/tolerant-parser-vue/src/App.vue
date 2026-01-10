<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  parseTolerantly,
  collectAllReferences,
  ParseState,
  TokenType,
  PartialFunctionCallNode,
  type Token,
  type TolerantParseResult,
  type ReferenceInfo,
  type ASTNode,
} from '@tokens-studio/tokenscript-interpreter/interpreter'

const input = ref('')

const parseResult = computed<TolerantParseResult | null>(() => {
  if (!input.value) return null
  return parseTolerantly(input.value)
})

const references = computed<ReferenceInfo[]>(() => {
  if (!parseResult.value?.ast) return []
  return collectAllReferences(parseResult.value.ast)
})

const isComplete = computed(() => parseResult.value?.state === ParseState.COMPLETE)

// Color extraction
interface ColorInfo {
  value: string
  cssColor: string
  isPartial: boolean
  type: 'hex' | 'rgb' | 'hsl' | 'oklch'
}

const colors = computed<ColorInfo[]>(() => {
  const result: ColorInfo[] = []
  if (!parseResult.value) return result

  // Extract hex colors from tokens
  for (const token of parseResult.value.tokens) {
    if (token.type === TokenType.HEX_COLOR) {
      const hex = token.value as string
      result.push({
        value: hex,
        cssColor: normalizeHex(hex),
        isPartial: hex.length < 4, // #F is partial, #FFF is complete
        type: 'hex'
      })
    }
  }

  // Extract color functions from AST
  if (parseResult.value.ast) {
    collectColorFunctions(parseResult.value.ast, result)
  }

  return result
})

function normalizeHex(hex: string): string {
  // Pad partial hex colors for preview
  const digits = hex.slice(1)
  if (digits.length === 1) return `#${digits}${digits}${digits}`
  if (digits.length === 2) return `#${digits}0`
  if (digits.length === 4) return `#${digits.slice(0, 3)}`
  if (digits.length === 5) return `#${digits.slice(0, 3)}`
  return hex
}

function collectColorFunctions(node: ASTNode, colors: ColorInfo[]): void {
  if (!node) return

  const nodeAny = node as any

  // Check for function calls (complete or partial)
  if (nodeAny.nodeType === 'FunctionCallNode' || node instanceof PartialFunctionCallNode) {
    const name = nodeAny.name?.toLowerCase() || ''
    const args = nodeAny.args || []

    if (['rgb', 'rgba'].includes(name)) {
      const values = args.map((a: any) => getNumericValue(a)).filter((v: number | null) => v !== null)
      const isPartial = node instanceof PartialFunctionCallNode || values.length < 3
      const [r, g, b, alpha] = [...values, 255, 255, 255, 1]
      colors.push({
        value: `${name}(${values.join(', ')}${isPartial ? '...' : ''})`,
        cssColor: alpha !== undefined && name === 'rgba'
          ? `rgba(${r}, ${g}, ${b}, ${alpha})`
          : `rgb(${r}, ${g}, ${b})`,
        isPartial,
        type: 'rgb'
      })
    } else if (['hsl', 'hsla'].includes(name)) {
      const values = args.map((a: any) => getNumericValue(a)).filter((v: number | null) => v !== null)
      const isPartial = node instanceof PartialFunctionCallNode || values.length < 3
      const [h, s, l, alpha] = [...values, 0, 50, 50, 1]
      colors.push({
        value: `${name}(${values.join(', ')}${isPartial ? '...' : ''})`,
        cssColor: alpha !== undefined && name === 'hsla'
          ? `hsla(${h}, ${s}%, ${l}%, ${alpha})`
          : `hsl(${h}, ${s}%, ${l}%)`,
        isPartial,
        type: 'hsl'
      })
    } else if (name === 'oklch') {
      const values = args.map((a: any) => getNumericValue(a)).filter((v: number | null) => v !== null)
      const isPartial = node instanceof PartialFunctionCallNode || values.length < 3
      const [l, c, h] = [...values, 0.5, 0.15, 0]
      colors.push({
        value: `oklch(${values.join(', ')}${isPartial ? '...' : ''})`,
        cssColor: `oklch(${l} ${c} ${h})`,
        isPartial,
        type: 'oklch'
      })
    }
  }

  // Walk child nodes
  if (nodeAny.left) collectColorFunctions(nodeAny.left, colors)
  if (nodeAny.right) collectColorFunctions(nodeAny.right, colors)
  if (nodeAny.expr) collectColorFunctions(nodeAny.expr, colors)
  if (nodeAny.args) {
    for (const arg of nodeAny.args) {
      collectColorFunctions(arg, colors)
    }
  }
  if (nodeAny.elements) {
    for (const el of nodeAny.elements) {
      collectColorFunctions(el, colors)
    }
  }
}

function getNumericValue(node: any): number | null {
  if (!node) return null
  if (node.nodeType === 'NumNode') return node.value
  if (typeof node.value === 'number') return node.value
  return null
}

interface HighlightedSegment {
  text: string
  class: string
}

const highlightedSegments = computed<HighlightedSegment[]>(() => {
  if (!parseResult.value?.tokens) return []

  const tokens = parseResult.value.tokens
  const segments: HighlightedSegment[] = []
  let lastEnd = 0

  for (const token of tokens) {
    if (token.type === TokenType.EOF) break

    // Add any gap between tokens as plain text
    if (token.pos > lastEnd) {
      segments.push({
        text: input.value.slice(lastEnd, token.pos),
        class: 'token-text'
      })
    }

    // Get the original text for this token
    const tokenText = input.value.slice(token.pos, token.endPos)
    const tokenClass = getTokenClass(token)

    segments.push({
      text: tokenText,
      class: tokenClass
    })

    lastEnd = token.endPos
  }

  // Add any trailing text
  if (lastEnd < input.value.length) {
    segments.push({
      text: input.value.slice(lastEnd),
      class: 'token-text'
    })
  }

  return segments
})

function getTokenClass(token: Token): string {
  switch (token.type) {
    case TokenType.REFERENCE:
      return 'token-reference'
    case TokenType.PARTIAL_REFERENCE:
      return 'token-reference-partial'
    case TokenType.EXPLICIT_STRING:
    case TokenType.STRING:
      return 'token-string'
    case TokenType.PARTIAL_STRING:
      return 'token-string-partial'
    case TokenType.NUMBER:
      return 'token-number'
    case TokenType.HEX_COLOR:
      return 'token-color'
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
      return 'token-operator'
    case TokenType.RESERVED_KEYWORD:
      return 'token-function'
    default:
      return 'token-text'
  }
}

const examples = [
  '{foo} {color.',
  '#FF5733',
  '#F0',
  'rgb(255, 128',
  'rgb(100, 150, 200)',
  'hsl(200, 80',
  '{color} + {size',
]

function setExample(example: string) {
  input.value = example
}
</script>

<template>
  <div class="container">
    <h1>Tolerant Parser Demo</h1>
    <p class="subtitle">
      Type tokenscript expressions and see how incomplete input is parsed and highlighted
    </p>

    <div class="input-section">
      <label for="expression">Expression</label>
      <input
        id="expression"
        v-model="input"
        class="input-field"
        type="text"
        placeholder="Try typing: {color.primary"
        autocomplete="off"
        spellcheck="false"
      />
    </div>

    <div class="output-section">
      <h2>Highlighted Output</h2>
      <div class="highlighted-output">
        <span
          v-for="(segment, index) in highlightedSegments"
          :key="index"
          :class="segment.class"
        >{{ segment.text }}</span>
      </div>

      <div v-if="parseResult" class="parse-info">
        <h3>Parse Info</h3>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">State</div>
            <div class="info-value" :class="isComplete ? 'complete' : 'incomplete'">
              {{ isComplete ? 'Complete' : 'Incomplete' }}
            </div>
          </div>
          <div class="info-item">
            <div class="info-label">Tokens</div>
            <div class="info-value">{{ parseResult.tokens.length - 1 }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">References</div>
            <div class="info-value">{{ references.length }}</div>
          </div>
        </div>

        <div v-if="references.length > 0" class="references-list">
          <div class="info-label">References</div>
          <div class="references-display">
            [<template v-for="(ref, index) in references" :key="ref.name"
              ><span :class="ref.isPartial ? 'ref-partial' : 'ref-complete'">{{
                ref.name
              }}</span
              ><span v-if="ref.isPartial" class="ref-incomplete-marker"
                >(incomplete)</span
              ><span v-if="index < references.length - 1">, </span></template
            >]
          </div>
        </div>

        <div v-if="colors.length > 0" class="colors-list">
          <div class="info-label">Colors</div>
          <div class="colors-display">
            <div
              v-for="(color, index) in colors"
              :key="index"
              class="color-item"
              :class="{ partial: color.isPartial }"
            >
              <div
                class="color-swatch"
                :style="{ backgroundColor: color.cssColor }"
              ></div>
              <div class="color-info">
                <span class="color-value">{{ color.value }}</span>
                <span v-if="color.isPartial" class="color-partial-marker">(incomplete)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="examples-section">
      <h3>Try these examples</h3>
      <div class="example-buttons">
        <button
          v-for="example in examples"
          :key="example"
          class="example-btn"
          @click="setExample(example)"
        >
          {{ example }}
        </button>
      </div>
    </div>
  </div>
</template>
