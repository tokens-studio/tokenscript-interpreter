<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  parseTolerantly,
  collectAllReferences,
  ParseState,
  type TolerantParseResult,
  type ReferenceInfo,
} from '@tokens-studio/tokenscript-interpreter/interpreter'
import { TokenscriptEditor } from './editor'

const editorRef = ref<HTMLDivElement>()
const editor = ref<TokenscriptEditor>()
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

onMounted(() => {
  if (editorRef.value) {
    editor.value = new TokenscriptEditor({
      element: editorRef.value,
      initialValue: input.value,
      placeholder: 'Try typing: {color.primary} or #FF5733',
      renderColorSwatch: true,
      onChange: (value, _result) => {
        input.value = value
      }
    })
  }
})

onUnmounted(() => {
  editor.value?.destroy()
})

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
  editor.value?.setValue(example)
}
</script>

<template>
  <div class="container">
    <h1>Tolerant Parser Demo</h1>
    <p class="subtitle">
      Type tokenscript expressions with rich inline highlighting and color swatches
    </p>

    <div class="input-section">
      <label for="expression">Expression</label>
      <div
        ref="editorRef"
        class="editor-field"
      ></div>
    </div>

    <div v-if="parseResult" class="output-section">
      <h2>Parse Info</h2>
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

      <div class="raw-value">
        <div class="info-label">Raw Value</div>
        <code class="raw-value-display">{{ input || '(empty)' }}</code>
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
