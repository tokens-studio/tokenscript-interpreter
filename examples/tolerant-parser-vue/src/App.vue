<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import {
  parseTolerantly,
  collectAllReferences,
  evaluateExpression,
  NumberWithUnitSymbol,
  ParseState,
  type TolerantParseResult,
  type ReferenceInfo,
  type EvalResult,
  type ReferenceRecord,
} from "@tokens-studio/tokenscript-interpreter/interpreter";
import { makeConfig } from "../schemas.js";
import { TokenscriptEditor } from "./editor";

const config = makeConfig();

const px = (n: number) => new NumberWithUnitSymbol(n, 'px');

const tokens: ReferenceRecord = {
  'colors.primary': '#6366F1',
  'colors.secondary': '#EC4899',
  'colors.accent': '#F59E0B',
  'colors.background': '#1A1A2E',
  'colors.text': '#E2E8F0',
  'spacing.sm': px(8),
  'spacing.md': px(16),
  'spacing.lg': px(32),
  'font.size.base': px(16),
  'font.size.lg': px(24),
  'border.radius': px(8),
  'opacity.muted': 0.6,
};

const editorRef = ref<HTMLDivElement>();
const editor = ref<TokenscriptEditor>();
const input = ref("");

const parseResult = computed<TolerantParseResult | null>(() => {
  if (!input.value) return null;
  return parseTolerantly(input.value);
});

const references = computed<ReferenceInfo[]>(() => {
  if (!parseResult.value?.ast) return [];
  return collectAllReferences(parseResult.value.ast);
});

const isComplete = computed(
  () => parseResult.value?.state === ParseState.COMPLETE,
);

const evalResult = computed<EvalResult | null>(() => {
  if (!input.value || !isComplete.value) return null;
  return evaluateExpression(input.value, { config, references: tokens });
});

const editorState = computed(() => {
  if (!evalResult.value) return '';
  return evalResult.value.success ? 'editor-success' : 'editor-error';
});

onMounted(() => {
  if (editorRef.value) {
    editor.value = new TokenscriptEditor({
      element: editorRef.value,
      initialValue: input.value,
      placeholder: "Try typing: {colors.primary} or #FF5733",
      renderColorSwatch: true,
      onChange: (value, _result) => {
        input.value = value;
      },
    });
  }
});

onUnmounted(() => {
  editor.value?.destroy();
});

const examples = [
  "{colors.primary}",
  "{colors.secondary}",
  "lighten({colors.primary}, 20)",
  "mix({colors.primary}, {colors.secondary}, 50)",
  "{spacing.md} * 2",
  "{font.size.base}",
  "#FF5733",
  "rgb(100, 150, 200)",
  "{colors.",
  "1 + red",
  "{missing}",
];

function setExample(example: string) {
  input.value = example;
  editor.value?.setValue(example);
}
</script>

<template>
  <div class="container">
    <h1>Tokenscript Input</h1>
    <p class="subtitle">
      Type tokenscript expressions with rich inline highlighting and color
      swatches
    </p>

    <div class="input-section">
      <label for="expression">Expression</label>
      <div ref="editorRef" class="editor-field" :class="editorState"></div>
    </div>

    <div v-if="parseResult" class="output-section">
      <h2>Parse Info</h2>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">State</div>
          <div
            class="info-value"
            :class="isComplete ? 'complete' : 'incomplete'"
          >
            {{ isComplete ? "Complete" : "Incomplete" }}
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
        <code class="raw-value-display">{{ input || "(empty)" }}</code>
      </div>

      <div v-if="evalResult" class="eval-section">
        <div v-if="!evalResult.success" class="eval-error">
          <div class="info-label">Evaluation Error</div>
          <code>{{ evalResult.error.originalMessage }}</code>
        </div>
        <div v-else class="eval-success">
          <div class="info-label">Result</div>
          <code>{{ evalResult.resultString }}</code>
          <span class="eval-type">{{ evalResult.type }}</span>
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
