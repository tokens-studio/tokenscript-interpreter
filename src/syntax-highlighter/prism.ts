/**
 * Prism.js syntax highlighting for TokenScript
 * Uses shared patterns from spec.ts
 */

import { BUILTIN_FUNCTIONS, createKeywordPattern, KEYWORDS, PATTERNS, TYPES } from "./spec.js";

export function tokenscriptLanguage(Prism: any) {
  Prism.languages.tokenscript = {
    comment: {
      pattern: PATTERNS.comment,
      greedy: true,
    },
    string: {
      pattern: PATTERNS.string,
      greedy: true,
    },
    reference: {
      pattern: PATTERNS.reference,
      greedy: true,
      alias: "variable",
    },
    "hex-color": {
      pattern: PATTERNS.hexColor,
      alias: "number",
    },
    "number-with-unit": {
      pattern: PATTERNS.numberWithUnit,
      alias: "number",
    },
    number: {
      pattern: PATTERNS.number,
    },
    keyword: {
      pattern: createKeywordPattern(KEYWORDS),
    },
    type: {
      pattern: createKeywordPattern(TYPES),
      alias: "class-name",
    },
    "color-type": {
      pattern: PATTERNS.colorType,
      alias: "class-name",
    },
    function: {
      pattern: createKeywordPattern([...BUILTIN_FUNCTIONS, "(?=\\()"]),
    },
    method: {
      pattern: PATTERNS.method,
      inside: {
        punctuation: /\./,
      },
    },
    property: {
      pattern: PATTERNS.property,
      inside: {
        punctuation: /\./,
      },
    },
    operator: PATTERNS.operator,
    punctuation: PATTERNS.punctuation,
  };

  // Add tokenscript as an alias for ts
  Prism.languages.ts = Prism.languages.tokenscript;

  return Prism.languages.tokenscript;
}

export default tokenscriptLanguage;
