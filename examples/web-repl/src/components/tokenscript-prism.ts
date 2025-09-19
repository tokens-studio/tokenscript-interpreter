import Prism from "prismjs";

// Define TokenScript language grammar
Prism.languages.tokenscript = {
  // Comments
  comment: {
    pattern: /\/\/.*|\/\*[\s\S]*?\*\//,
    greedy: true,
  },

  // Strings
  string: {
    pattern: /(["'`])(?:(?!\1)[^\\\r\n]|\\(?:\r\n|[\s\S]))*\1/,
    greedy: true,
  },

  // Color values (hex, rgb, hsl, etc.)
  color: {
    pattern: /#(?:[0-9a-fA-F]{3}){1,2}\b|(?:rgb|hsl)a?\([^)]+\)|(?:lch|lab|oklab|oklch)\([^)]+\)/,
    alias: "string",
  },

  // Numbers with optional units
  number:
    /\b(?:0x[\da-f]+|\d*\.?\d+(?:e[+-]?\d+)?(?:px|em|rem|%|deg|rad|turn|s|ms|hz|khz|pt|pc|in|cm|mm|vw|vh|vmin|vmax)?\b)/i,

  // Variable declarations with special handling
  "variable-declaration": {
    pattern: /\b(variable)\s+([a-zA-Z_$][\w$]*)\s*(:)\s*([a-zA-Z_$][\w$.]*)/,
    inside: {
      "variable-keyword": /\bvariable\b/,
      "variable-name": /[a-zA-Z_$][\w$]*(?=\s*:)/,
      punctuation: /:/,
      "type-annotation": /[a-zA-Z_$][\w$.]*$/,
    },
  },

  // TokenScript keywords
  keyword:
    /\b(?:if|else|for|while|function|return|let|const|var|true|false|null|undefined|import|export|from|as|type|interface|enum|class|extends|implements|public|private|protected|static|readonly|async|await|try|catch|finally|throw|new|this|super|typeof|instanceof)\b/,

  // Built-in functions/methods (based on your interpreter)
  builtin:
    /\b(?:toString|toNumber|toColor|length|substr|substring|indexOf|lastIndexOf|replace|replaceAll|split|join|push|pop|shift|unshift|slice|splice|concat|reverse|sort|filter|map|forEach|reduce|find|findIndex|includes|startsWith|endsWith|trim|trimStart|trimEnd|toLowerCase|toUpperCase|charAt|charCodeAt|abs|ceil|floor|round|min|max|pow|sqrt|random|sin|cos|tan|log|exp|PI|E|parseFloat|parseInt|isNaN|isFinite)\b/,

  // Operators
  operator:
    /[+\-*/=<>!&|^~%]+|&&|\|\||==|!=|===|!==|<=|>=|\+\+|--|<<|>>|>>>|\*\*|\/\/|\?\?|\.\.\.|\?\.|\?\?=/,

  // Punctuation
  punctuation: /[{}[\]();,.?:]/,

  // Function calls (identifier followed by parentheses)
  function: /\b[a-zA-Z_$][\w$]*(?=\s*\()/,

  // Property access (dot notation)
  property: /(?:\.)[a-zA-Z_$][\w$]*/,

  // Variables/identifiers
  variable: /\b[a-zA-Z_$][\w$]*\b/,
};

// Enhanced JSON language grammar with token-specific highlighting
Prism.languages.json = {
  // Token types (Design Token Community Group standard)
  "token-type": {
    pattern:
      /("?\$type"?\s*:\s*)("(?:color|dimension|fontFamily|fontWeight|duration|cubicBezier|number|string|boolean|border|borderRadius|shadow|gradient|typography|transition|strokeStyle|textDecoration)")/,
    inside: {
      property: /"\$type"/,
      punctuation: /[:"]/,
      string:
        /"(?:color|dimension|fontFamily|fontWeight|duration|cubicBezier|number|string|boolean|border|borderRadius|shadow|gradient|typography|transition|strokeStyle|textDecoration)"/,
    },
  },

  // Token values with type-specific highlighting
  "token-value": {
    pattern: /("?\$value"?\s*:\s*)("(?:[^"\\]|\\[\s\S])*"|[^,}\]]+)/,
    inside: {
      property: /"\$value"/,
      punctuation: /[:"]/,
      "color-value": {
        pattern:
          /"(?:#(?:[0-9a-fA-F]{3}){1,2}|(?:rgb|hsl)a?\([^)]+\)|(?:lch|lab|oklab|oklch)\([^)]+\))"/,
        alias: "string",
      },
      "dimension-value": {
        pattern: /"[0-9]*\.?[0-9]+(?:px|em|rem|%|pt|pc|in|cm|mm|vw|vh|vmin|vmax)"/,
        alias: "number",
      },
      "reference-value": {
        pattern: /"\{[^}]+\}"/,
        alias: "variable",
      },
      string: /"(?:[^"\\]|\\[\s\S])*"/,
      number: /\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/,
    },
  },

  // Token references (e.g., {color.primary})
  "token-reference": {
    pattern: /"\{[^}]+\}"/,
    alias: "variable",
  },

  // Color values (hex, rgb, hsl, etc.)
  color: {
    pattern:
      /"(?:#(?:[0-9a-fA-F]{3}){1,2}|(?:rgb|hsl)a?\([^)]+\)|(?:lch|lab|oklab|oklch)\([^)]+\))"/,
    alias: "string",
  },

  // Dimension values (numbers with units)
  dimension: {
    pattern: /"[0-9]*\.?[0-9]+(?:px|em|rem|%|pt|pc|in|cm|mm|vw|vh|vmin|vmax)"/,
    alias: "number",
  },

  // Property names
  property: {
    pattern: /"(?:\\.|[^\\"])*"(?=\s*:)/,
    greedy: true,
  },

  // Strings
  string: {
    pattern: /"(?:\\.|[^\\"])*"(?!\s*:)/,
    greedy: true,
  },

  // Numbers
  number: /\b-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/,

  // Punctuation
  punctuation: /[{}[\](),.:]/,

  // Operators
  operator: /:/,

  // Boolean values
  boolean: /\b(?:true|false)\b/,

  // Null
  null: {
    pattern: /\bnull\b/,
    alias: "keyword",
  },
};

// Add alias for convenience
Prism.languages.ts = Prism.languages.tokenscript;

export { Prism };
export default Prism.languages.tokenscript;
