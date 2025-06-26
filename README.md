# TokenScript Interpreter

A TypeScript interpreter for TokenScript, a domain-specific language for design token manipulation and computation.

## What is TokenScript?

TokenScript is an expression language for design systems that allows you to:

- Perform calculations with design tokens (colors, spacing, typography)
- Handle different units (px, rem, em, %) with automatic conversion
- Manipulate colors and create dynamic relationships between tokens
- Reference external design tokens using `{token.name}` syntax

## Requirements

- Node.js >=16.0.0

## Installation

```bash
npm install @tokens-studio/tokenscript-interpreter
```

## Usage

### Basic Library Usage

```typescript
import { Interpreter, Lexer, Parser } from '@tokens-studio/tokenscript-interpreter';

const code = '16 * 1.5px';
const lexer = new Lexer(code);
const parser = new Parser(lexer);
const interpreter = new Interpreter(parser);

const result = interpreter.interpret();
console.log(result); // "24px"
```

### With Token References

```typescript
import { Interpreter, Lexer, Parser } from '@tokens-studio/tokenscript-interpreter';

const code = '{base.spacing} * 2px';
const references = { 'base.spacing': 16 };

const lexer = new Lexer(code);
const parser = new Parser(lexer);
const interpreter = new Interpreter(parser, references);

const result = interpreter.interpret();
console.log(result); // "32px"
```

### Processing Token Sets

```typescript
import { interpretTokens } from '@tokens-studio/tokenscript-interpreter';

// Process any token format (DTCG, flat objects, etc.)
const tokens = {
  "spacing.small": "8px",
  "spacing.medium": "{spacing.small} * 2",
  "color.primary": "#0066cc",
  "color.secondary": "{color.primary}"
};

const resolved = interpretTokens(tokens);
console.log(resolved);
// {
//   "spacing.small": "8px",
//   "spacing.medium": "16px",
//   "color.primary": "#0066cc",
//   "color.secondary": "#0066cc"
// }
```

## CLI Usage

```bash
# Interactive mode
npx @tokens-studio/tokenscript-interpreter interactive

# Process token files
npx @tokens-studio/tokenscript-interpreter parse_tokenset --tokenset tokens.zip --output resolved.json
npx @tokens-studio/tokenscript-interpreter parse_json --json tokens.json --output resolved.json

# Generate theme permutations
npx @tokens-studio/tokenscript-interpreter permutate_tokenset --tokenset tokens.zip --permutate-on theme1 theme2 --permutate-to target --output permutations.json
```

### DTCG Format Support

```typescript
import { interpretTokensWithMetadata } from '@tokens-studio/tokenscript-interpreter';

// Process DTCG format with metadata preservation
const dtcgTokens = {
  "spacing": {
    "small": {
      "$type": "dimension",
      "$value": "8px",
      "$description": "Small spacing value"
    },
    "medium": {
      "$type": "dimension",
      "$value": "{spacing.small} * 2"
    }
  }
};

const resolved = interpretTokensWithMetadata(dtcgTokens);
// Preserves DTCG structure with resolved $value properties
```

## Language Syntax

### Basic Operations
```tokenscript
16 * 1.5px                    // 24px
{base.spacing} + 8px          // Reference external tokens
min(10px, 20px, 5px)         // 5px
```

### Variables and Control Flow
```tokenscript
variable base: Number = 16;
variable spacing: NumberWithUnit = base * 1.5px;

if(spacing > 20px) [
    spacing = 20px;
];

return spacing;
```

### Color Manipulation
```tokenscript
variable primary: Color = #3B82F6;
return primary;  // #3B82F6
```

## API Reference

### Core Classes

- `Interpreter(parserOrAst, references?, symbolTable?, languageOptions?, colorManager?)` - Main interpreter
- `Lexer(text)` - Tokenizes source code
- `Parser(lexer)` - Parses tokens into AST
- `TokenSetResolver(tokens, globalTokens?)` - Resolves token dependencies

### Utility Functions

- `interpretTokens(tokenInput)` - Process any token format (flat or DTCG)
- `interpretTokensWithMetadata(dtcgJson)` - Process DTCG format preserving metadata structure
- `processThemes(themes, options?)` - Process multiple themes with performance tracking
- `permutateTokensets(...)` - Generate theme permutations
- `buildThemeTree(...)` - Build theme hierarchy from tokensets

### Types

- `Number`, `String`, `Color`, `List`, `Boolean`, `NumberWithUnit`
- References: `{token.name}` syntax
- Math Functions: `min()`, `max()`, `sqrt()`, `pow()`, `round()`, `floor()`, `ceil()`, `roundTo()`, `abs()`
- Trigonometric: `sin()`, `cos()`, `tan()`, `pi()`
- Parsing: `parse_int(value, base)`

### Performance Tracking

```typescript
import { PerformanceTracker, processThemes } from '@tokens-studio/tokenscript-interpreter';

// Enable performance tracking
const result = await processThemes(themes, { enablePerformanceTracking: true });

// Manual performance tracking
const tracker = new PerformanceTracker();
tracker.startTracking();
// ... your operations
tracker.displaySummary();
```

## Development

```bash
git clone https://github.com/tokens-studio/tokenscript-interpreter.git
cd tokenscript-interpreter
npm install
npm run build
npm test
npm run cli:interactive
```

## License

Mozilla Public License 2.0
