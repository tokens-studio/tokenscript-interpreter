# TokenScript Interpreter

A web-based interpreter for TokenScript, a domain-specific language designed for design token manipulation and computation. This TypeScript implementation provides an interactive environment for executing TokenScript code, based on the original Python reference implementation.

## What is TokenScript?

TokenScript is a powerful expression language specifically designed for design systems and token manipulation. It allows you to:

- **Perform calculations** with design tokens (colors, spacing, typography)
- **Handle different units** (px, rem, em, %, etc.) with automatic conversion
- **Manipulate colors** with built-in color operations and conversions
- **Create dynamic relationships** between design tokens using variables and expressions
- **Build complex logic** with control structures (if/else, while loops)

## Key Features

- 🎨 **Color manipulation** - Work with hex colors, RGB, and other color formats
- 📐 **Unit-aware calculations** - Perform math operations with CSS units
- 🔗 **Token references** - Reference external design tokens using `{token.name}` syntax
- 🧮 **Mathematical functions** - Built-in functions like `min()`, `max()`, `sqrt()`, `roundTo()`, etc.
- 🔄 **Control structures** - Variables, conditionals, and loops for complex logic
- 🎯 **Type system** - Strong typing with support for Numbers, Strings, Colors, Lists, and more

## Simple Examples

### 1. Basic Token Calculations
Calculate responsive spacing based on a base unit:

```tokenscript
// Input tokens: { "base.spacing": 16 }
{base.spacing} * 1.5px
```
**Result:** `24px`

This example shows how to reference design tokens and perform calculations with units. Perfect for creating consistent spacing scales.

### 2. Color Manipulation
Create color variations from a base color:

```tokenscript
variable base_color: Color = #3B82F6;
variable darker_color: Color = #1E40AF;
return base_color;
```
**Result:** `#3B82F6`

TokenScript supports color operations and can work with different color formats, making it easy to generate color palettes and variations.

### 3. Conditional Logic with Design Tokens
Create responsive values based on conditions:

```tokenscript
// Input tokens: { "screen.size": "mobile" }
variable size: String = {screen.size};
variable padding: NumberWithUnit = 16px;

if(size == "mobile") [
    padding = 12px;
] else [
    padding = 24px;
];

return padding;
```
**Result:** `12px` (when screen.size is "mobile")

This demonstrates how TokenScript can make design decisions based on context, enabling truly responsive design systems.

## Installation

### NPM Package Installation

Install TokenScript Interpreter as a dependency in your project:

```bash
npm install tokenscript-interpreter
```

Or install globally to use the CLI:

```bash
npm install -g tokenscript-interpreter
```

**Prerequisites:** Node.js (v16 or higher)

## Usage

TokenScript Interpreter can be used in multiple ways:

### 1. As a Library (Programmatic Usage)

Import and use the interpreter in your JavaScript/TypeScript projects. The library core is **side-effect-free** - it returns structured data instead of logging to console, making it perfect for build tools and integrations:

```typescript
import { Interpreter, Lexer, Parser } from 'tokenscript-interpreter';

// Basic usage
const code = '16 * 1.5px';
const lexer = new Lexer(code);
const parser = new Parser(lexer);
const interpreter = new Interpreter(parser);

const result = interpreter.interpret();
console.log(result); // "24px"
```

#### With Token References

```typescript
import { Interpreter, Lexer, Parser } from 'tokenscript-interpreter';

const code = '{base.spacing} * 2px';
const references = {
  'base.spacing': 16
};

const lexer = new Lexer(code);
const parser = new Parser(lexer);
const interpreter = new Interpreter(parser, references);

const result = interpreter.interpret();
console.log(result); // "32px"
```

#### Processing Token Sets

```typescript
import { interpretTokensets, processThemes, interpretTokens } from 'tokenscript-interpreter';

// Process a tokenset from a ZIP file (file system based)
const result = await interpretTokensets('path/to/tokens.zip', 'output.json');
console.log('Processed tokens:', result);

// Process DTCG JSON blob directly (pure in-memory, no file system)
const dtcgJson = {
  "color": {
    "primary": {
      "$type": "color",
      "$value": "#0066cc"
    },
    "secondary": {
      "$type": "color",
      "$value": "{color.primary}"
    }
  }
};
const result = interpretTokens(dtcgJson); // Synchronous, returns resolved tokens
console.log('Processed tokens:', result);

// Process a flat token set directly (pure in-memory)
const tokens = {
  "spacing.small": "8px",
  "spacing.medium": "{spacing.small} * 2",
  "spacing.large": "{spacing.medium} * 1.5"
};
const resolved = interpretTokens(tokens); // Works with any token structure
console.log('Resolved tokens:', resolved);
```

#### JSON Blob Integration

For users who want to integrate the interpreter in their workflow without using ZIP files or the file system, you can pass JSON blobs directly:

```typescript
import { interpretTokens } from 'tokenscript-interpreter';

// Process a complete DTCG JSON with themes
const dtcgData = {
  "color": {
    "primary": { "$type": "color", "$value": "#0066cc" },
    "secondary": { "$type": "color", "$value": "{color.primary}" }
  },
  "$themes": [
    {
      "name": "light",
      "selectedTokenSets": [{"id": "color", "status": "enabled"}]
    }
  ]
};

const result = interpretTokens(dtcgData); // Synchronous, pure in-memory
// Returns: { "light": { "primary": "#0066cc", "secondary": "#0066cc" } }

// Or process a flat token set directly
const flatTokens = {
  "spacing.small": "8px",
  "spacing.medium": "{spacing.small} * 2",
  "color.primary": "#0066cc",
  "color.secondary": "{color.primary}"
};

const resolved = interpretTokens(flatTokens); // Same function handles both formats
// Returns: { "spacing.small": "8px", "spacing.medium": "16px", "color.primary": "#0066cc", "color.secondary": "#0066cc" }
```

**Key Benefits:**
- ✅ **No file system operations** - Pure in-memory processing
- ✅ **Synchronous** - No async/await needed
- ✅ **Flexible input** - Handles both DTCG format with themes and flat token sets
- ✅ **Direct integration** - Perfect for build tools, APIs, and web applications
- ✅ **Automatic format detection** - Intelligently processes different token formats
- ✅ **String output** - Returns resolved values as strings, not internal Symbol objects
- ✅ **Structured error handling** - Core library returns warnings/errors as data, not console output

#### Advanced Usage with Error Handling

For more control over warnings and errors, use the `TokenSetResolver` class directly:

```typescript
import { TokenSetResolver } from 'tokenscript-interpreter';

const tokens = {
  'valid.token': '16px',
  'broken.reference': '{missing.token}',
  'circular.ref': '{circular.ref}'
};

const resolver = new TokenSetResolver(tokens);
const result = resolver.resolve();

// Access resolved tokens
console.log('Resolved:', result.resolvedTokens);

// Handle warnings programmatically
if (result.warnings.length > 0) {
  console.log('⚠️ Warnings found:');
  result.warnings.forEach(warning => console.log(`  - ${warning}`));
}

// Handle errors programmatically
if (result.errors.length > 0) {
  console.log('❌ Errors found:');
  result.errors.forEach(error => console.log(`  - ${error}`));
}
```

**Common Use Cases:**
```typescript
// Build tool integration
import { interpretTokens } from 'tokenscript-interpreter';

// In your build script
const designTokens = JSON.parse(fs.readFileSync('tokens.json', 'utf8'));
const resolvedTokens = interpretTokens(designTokens);
// Use resolvedTokens to generate CSS, SCSS, etc.

// API endpoint
app.post('/api/resolve-tokens', (req, res) => {
  try {
    const resolved = interpretTokens(req.body.tokens);
    res.json({ success: true, tokens: resolved });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// React/Vue component
const MyComponent = ({ tokenData }) => {
  const resolvedTokens = useMemo(() => interpretTokens(tokenData), [tokenData]);
  // Use resolvedTokens in your component
};
```

### 2. Command Line Interface (CLI)

Use the CLI for processing design token files and interactive development:

```bash
# Interactive mode
tokenscript interactive

# Process token files from ZIP
tokenscript parse_tokenset --tokenset tokens.zip --output resolved.json

# Process DTCG JSON blob directly
tokenscript parse_json --json tokens.json --output resolved.json

# Process with DTCG format output (preserves $value structure)
tokenscript parse_json --json tokens.json --output resolved.json --format dtcg

# Process single token set
tokenscript parse_tokens --tokens tokenset.json --output resolved.json

# Generate theme permutations
tokenscript permutate_tokenset --tokenset tokens.zip --permutate-on Brand Mode --permutate-to Components --output themes.json
```

### 3. Development and Testing

For development and testing, you can clone the repository:

```bash
# Clone the repository
git clone https://github.com/tokens-studio/tokenscript-interpreter.git
cd tokenscript-interpreter

# Install dependencies
npm install

# Run tests
npm test

# Test CLI functionality
npm run cli:interactive
```

## Package Structure

The npm package provides multiple entry points for different use cases:

### Main Library (`tokenscript-interpreter`)

```typescript
// Core interpreter functionality
import {
  Interpreter,
  Lexer,
  Parser,
  ColorManager
} from 'tokenscript-interpreter';

// AST and symbol types
import {
  BinOpNode,
  NumNode,
  StringSymbol,
  NumberSymbol
} from 'tokenscript-interpreter';

// Utility functions
import {
  interpretTokensets,
  permutateTokensets,
  processThemes
} from 'tokenscript-interpreter';

// Type definitions
import type {
  ReferenceRecord,
  ISymbolType,
  LanguageOptions
} from 'tokenscript-interpreter';
```

### CLI (`tokenscript-interpreter/cli`)

```typescript
// Access CLI functionality programmatically
import { /* CLI exports */ } from 'tokenscript-interpreter/cli';
```

### Package Exports

The package is configured with proper ES modules and TypeScript support:

```json
{
  "main": "./dist/lib/index.js",
  "types": "./dist/lib/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/lib/index.js",
      "types": "./dist/lib/index.d.ts"
    },
    "./cli": {
      "import": "./dist/cli.js",
      "types": "./dist/cli.d.ts"
    }
  }
}
```

#### CLI Commands

##### 1. Interactive Mode
Start an interactive REPL for experimenting with TokenScript expressions:

```bash
# If installed globally
tokenscript interactive

# If installed locally
npx tokenscript interactive

# Or using npm scripts (for development)
npm run cli:interactive
```

**Interactive Mode Features:**
- Execute TokenScript expressions in real-time
- Set variables with `set_variables` command
- Type `exit` or `quit` to exit

**Example Interactive Session:**
```
Enter expression: 16 * 1.5px
Result: 24px

Enter expression: set_variables
Setting variables (enter "done" to finish):
Enter variable (name=value) or "done": base.spacing=16
Set base.spacing = 16
Enter variable (name=value) or "done": done

Enter expression: {base.spacing} * 2px
Result: 32px
```

##### 2. Parse Tokenset
Process and resolve design token files from ZIP archives:

```bash
# If installed globally
tokenscript parse_tokenset --tokenset path/to/tokens.zip --output resolved-tokens.json

# If installed locally
npx tokenscript parse_tokenset --tokenset path/to/tokens.zip --output resolved-tokens.json

# Or using npm scripts (for development)
npm run cli:parse -- --tokenset path/to/tokens.zip --output resolved-tokens.json
```

**Options:**
- `--tokenset <path>`: Path to the tokenset ZIP file (required)
- `--output <path>`: Output file path (default: "output.json")

**Example:**
```bash
npm run cli:parse -- --tokenset ./design-tokens.zip --output ./output/resolved.json
```

This command will:
- Extract and parse all JSON files from the ZIP
- Resolve token dependencies and references
- Process themes and token sets
- Output fully resolved tokens to JSON

##### 3. Parse DTCG JSON
Process design tokens directly from a DTCG JSON blob without requiring ZIP files:

```bash
# If installed globally
tokenscript parse_json --json tokens.json --output resolved.json

# If installed locally
npx tokenscript parse_json --json tokens.json --output resolved.json

# Or using npm scripts (for development)
npm run cli:parse-json -- --json tokens.json --output resolved.json
```

**Options:**
- `--json <path>`: Path to the DTCG JSON file (required)
- `--output <path>`: Output file path (default: "output.json")

**Example:**
```bash
npm run cli:parse-json -- --json ./design-tokens.json --output ./output/resolved.json
```

This command will:
- Parse the DTCG JSON file directly
- Detect if it contains themes or is a flat token set
- Resolve token dependencies and references
- Output fully resolved tokens to JSON

**Output Format Options:**

Use the `--format` option to control the output structure:

- `--format flat` (default): Simple key-value pairs
  ```json
  {
    "spacing.small": "8px",
    "spacing.medium": "16px",
    "color.primary": "#0066cc"
  }
  ```

- `--format dtcg`: Preserves DTCG metadata structure
  ```json
  {
    "spacing.small": {
      "$type": "dimension",
      "$value": "8px"
    },
    "spacing.medium": {
      "$type": "dimension",
      "$value": "16px"
    },
    "color.primary": {
      "$type": "color",
      "$value": "#0066cc"
    }
  }
  ```

**DTCG JSON Format Examples:**

Complete DTCG file with themes:
```json
{
  "color": {
    "primary": {
      "$type": "color",
      "$value": "#0066cc"
    }
  },
  "$themes": [
    {
      "name": "light",
      "selectedTokenSets": [
        {"id": "color", "status": "enabled"}
      ]
    }
  ]
}
```

Flat token set:
```json
{
  "color.primary": "#0066cc",
  "color.secondary": "{color.primary}",
  "spacing.small": "8px",
  "spacing.medium": "{spacing.small} * 2"
}
```

##### 4. Parse Single Token Set
Process a single token set from JSON without themes:

```bash
# If installed globally
tokenscript parse_tokens --tokens tokenset.json --output resolved.json

# If installed locally
npx tokenscript parse_tokens --tokens tokenset.json --output resolved.json

# Or using npm scripts (for development)
npm run cli:parse-tokens -- --tokens tokenset.json --output resolved.json
```

**Options:**
- `--tokens <path>`: Path to the token set JSON file (required)
- `--output <path>`: Output file path (default: "output.json")

**Example:**
```bash
npm run cli:parse-tokens -- --tokens ./spacing-tokens.json --output ./output/spacing-resolved.json
```

This command will:
- Parse the token set JSON file
- Resolve token dependencies and references
- Output fully resolved tokens to JSON

##### 5. Permutate Tokenset
Generate theme permutations for design system variations:

```bash
# If installed globally
tokenscript permutate_tokenset --tokenset tokens.zip --permutate-on theme1 theme2 --permutate-to target --output permutations.json

# If installed locally
npx tokenscript permutate_tokenset --tokenset tokens.zip --permutate-on theme1 theme2 --permutate-to target --output permutations.json

# Or using npm scripts (for development)
npm run cli:permutate -- --tokenset tokens.zip --permutate-on theme1 theme2 --permutate-to target --output permutations.json
```

**Options:**
- `--tokenset <path>`: Path to the tokenset ZIP file (required)
- `--permutate-on <themes...>`: List of theme groups to permutate on (required)
- `--permutate-to <theme>`: Target theme group for permutation (required)
- `--output <path>`: Output file path (default: "permutations.json")

**Example:**
```bash
npm run cli:permutate -- --tokenset ./tokens.zip --permutate-on "Brand" "Mode" --permutate-to "Component" --output ./permutations.json
```

This generates all possible combinations of Brand and Mode themes applied to Component tokens.

#### CLI Help
Get help for any command:

```bash
npm run cli -- --help                    # General help
npm run cli -- interactive --help        # Interactive mode help
npm run cli -- parse_tokenset --help     # Parse command help
npm run cli -- permutate_tokenset --help # Permutate command help
```

### Example Token References
```json
{
  "colors.primary": "#3B82F6",
  "spacing.base": 16,
  "typography.scale": 1.25
}
```

## API Reference

### Core Classes

#### `Interpreter`

The main interpreter class for executing TokenScript code.

```typescript
class Interpreter {
  constructor(
    parserOrAst: Parser | ASTNode | null,
    references?: ReferenceRecord,
    symbolTable?: SymbolTable,
    languageOptions?: LanguageOptions,
    colorManager?: ColorManager
  )

  interpret(): ISymbolType | string | null
  setReferences(references: ReferenceRecord): void
}
```

**Example:**
```typescript
const interpreter = new Interpreter(parser, { 'base.size': 16 });
const result = interpreter.interpret();
```

#### `Lexer`

Tokenizes TokenScript source code.

```typescript
class Lexer {
  constructor(text: string)

  getNextToken(): Token
  isEOF(): boolean
}
```

#### `Parser`

Parses tokens into an Abstract Syntax Tree (AST).

```typescript
class Parser {
  constructor(lexer: Lexer)

  parse(): ASTNode | null
  getRequiredReferences(): string[]
}
```

#### `TokenSetResolver`

**Core library class for resolving token references and dependencies.** The TokenSetResolver follows a **Core vs. Adapters** architecture pattern, where the core engine is completely format-agnostic and works only with flat string tokens, while DTCG format handling is separated into dedicated adapter modules.

```typescript
interface TokenSetResolverResult {
  resolvedTokens: Record<string, any>;
  warnings: string[];
  errors: string[];
}

class TokenSetResolver {
  constructor(tokens: Record<string, string>, globalTokens?: Record<string, any>)

  resolve(): TokenSetResolverResult
}
```

**Architecture Benefits:**
- 🏗️ **Clean separation** - Core engine has zero knowledge of DTCG format
- ⚡ **High performance** - Optimized iterative dependency resolution (no recursion)
- 🔧 **Extensible** - New token formats only require new adapters, core unchanged
- 🧪 **Testable** - Core can be tested with simple flat objects

**Example:**
```typescript
import { TokenSetResolver } from 'tokenscript-interpreter';

// Note: TokenSetResolver now requires flat string tokens
const flatTokens = {
  'base.spacing': '8px',
  'component.padding': '{base.spacing} * 2',
  'invalid.token': '{nonexistent.reference}'
};

const resolver = new TokenSetResolver(flatTokens);
const result = resolver.resolve();

console.log('Resolved tokens:', result.resolvedTokens);
// { 'base.spacing': '8px', 'component.padding': '16px', 'invalid.token': '{nonexistent.reference}' }

console.log('Warnings:', result.warnings);
// ['Not all tokens could be resolved. Remaining tokens: invalid.token: {nonexistent.reference}']

console.log('Errors:', result.errors);
// []

// Handle warnings in your application
if (result.warnings.length > 0) {
  result.warnings.forEach(warning => console.warn(`⚠️ ${warning}`));
}
```

**Key Benefits:**
- ✅ **Pure function** - No side effects or console logging
- ✅ **Structured output** - Warnings and errors as arrays for programmatic access
- ✅ **Build tool friendly** - Consumers control when and how to display messages
- ✅ **Format-agnostic core** - Works with any token format via adapters
- ✅ **Performance optimized** - Iterative dependency resolution prevents stack overflow

### Utility Functions

#### `interpretTokensets(tokensetPath: string, outputPath: string): Promise<any>`

Process and resolve design token files from ZIP archives.

```typescript
import { interpretTokensets } from 'tokenscript-interpreter';

const result = await interpretTokensets('./tokens.zip', './output.json');
```

#### `interpretTokens(tokenInput: Record<string, any>): Record<string, any>`

**Main API for JSON blob integration** - Process and resolve design tokens directly from any supported format without file system operations. **Uses the new Core vs. Adapters architecture** for maximum performance and reliability.

**Architecture Flow:**
1. **🔄 ADAPT (Input)** - Automatically detects format and converts to flat tokens
2. **⚡ CORE** - High-performance resolution using optimized TokenSetResolver
3. **📤 OUTPUT** - Clean string values ready for consumption

**Parameters:**
- `tokenInput`: A JavaScript object containing design tokens in any supported format

**Returns:**
- `Record<string, any>`: Resolved tokens as key-value pairs with string values
- For inputs with themes: `{ themeName: { tokenName: resolvedValue } }`
- For inputs without themes: `{ tokenName: resolvedValue }`

**Throws:**
- `Error`: If input is not a valid object

```typescript
import { interpretTokens } from 'tokenscript-interpreter';

// Example 1: Flat token sets (most common use case)
const flatTokens = {
  "spacing.small": "8px",
  "spacing.medium": "{spacing.small} * 2",
  "spacing.large": "{spacing.medium} * 1.5",
  "color.primary": "#0066cc",
  "color.secondary": "{color.primary}"
};

const resolved = interpretTokens(flatTokens);
// Returns: {
//   "spacing.small": "8px",
//   "spacing.medium": "16px",
//   "spacing.large": "24px",
//   "color.primary": "#0066cc",
//   "color.secondary": "#0066cc"
// }

// Example 2: DTCG format without themes
const dtcgTokens = {
  "spacing": {
    "small": { "$type": "dimension", "$value": "8px" },
    "medium": { "$type": "dimension", "$value": "{spacing.small} * 2" }
  },
  "color": {
    "primary": { "$type": "color", "$value": "#0066cc" }
  }
};

const dtcgResolved = interpretTokens(dtcgTokens);
// Returns: {
//   "spacing.small": "8px",
//   "spacing.medium": "16px",
//   "color.primary": "#0066cc"
// }

// Example 3: DTCG format with themes
const dtcgWithThemes = {
  "color": {
    "primary": { "$type": "color", "$value": "#0066cc" }
  },
  "$themes": [
    {
      "name": "light",
      "selectedTokenSets": [{"id": "color", "status": "enabled"}]
    }
  ]
};

const themedResult = interpretTokens(dtcgWithThemes);
// Returns: {
//   "light": {
//     "primary": "#0066cc"
//   }
// }
```

#### DTCG Adapter Utilities

**New in the latest version** - Direct access to the adapter functions for advanced use cases:

```typescript
import {
  flattenTokens,
  collectTokenMetadata,
  rehydrateToDTCG,
  extractThemeTokens,
  hasNestedDTCGStructure,
  flatTokensToDTCG
} from 'tokenscript-interpreter/utils/dtcg-adapter';

// Convert DTCG to flat format
const dtcgTokens = {
  "color": { "red": { "$value": "#FF0000", "$type": "color" } }
};
const flatTokens = flattenTokens(dtcgTokens);
// Result: { "color.red": "#FF0000" }

// Collect metadata for re-hydration
const metadata = collectTokenMetadata(dtcgTokens);
// Result: { "color.red": { "$value": "#FF0000", "$type": "color" } }

// Re-hydrate resolved tokens back to DTCG
const resolvedFlat = { "color.red": "#FF0000" };
const dtcgOutput = rehydrateToDTCG(resolvedFlat, metadata);
// Result: { "color.red": { "$value": "#FF0000", "$type": "color" } }

// Detect format automatically
const isNested = hasNestedDTCGStructure(dtcgTokens); // true
const isFlat = hasNestedDTCGStructure({ "color.red": "#FF0000" }); // false
```

**Use Cases:**
- 🔧 **Custom integrations** - Build your own token processing pipeline
- 🎯 **Performance optimization** - Skip unnecessary conversions when you know the format
- 🧪 **Testing** - Test individual adapter functions in isolation
- 📊 **Analytics** - Analyze token structure before processing

#### `permutateTokensets(tokensetPath: string, permutateOn: string[], permutateTo: string, outputPath: string): Promise<any>`

Generate theme permutations for design system variations.

```typescript
import { permutateTokensets } from 'tokenscript-interpreter';

const result = await permutateTokensets(
  './tokens.zip',
  ['Brand', 'Mode'],
  'Components',
  './permutations.json'
);
```

### Type Definitions

#### `ReferenceRecord`

```typescript
type ReferenceRecord = Record<
  string,
  string | number | ISymbolType | Array<string | number | ISymbolType>
>;
```

#### `ISymbolType`

Base interface for all TokenScript values.

```typescript
interface ISymbolType {
  type: string;
  value: any;
  valid_value(value: any): boolean;
  toString(): string;
  equals(other: ISymbolType): boolean;
  toJSON?(): any;
}
```

#### `LanguageOptions`

```typescript
interface LanguageOptions {
  MAX_ITERATIONS: number;
}
```

## Language Syntax

TokenScript supports a rich set of features for design token manipulation:

### Basic Syntax
- **Variables:** `variable name: Type = value;`
- **References:** `{token.name}` for external tokens
- **Functions:** `min(a, b, c)`, `max(a, b)`, `sqrt(x)`, `roundTo(value, precision?)`
- **Control flow:** `if(condition) [...] else [...]`
- **Loops:** `while(condition) [...]`
- **Types:** `Number`, `String`, `Color`, `List`, `Boolean`, `NumberWithUnit`

### CLI-Specific Examples

#### Simple Calculations (Interactive Mode)
```tokenscript
16 * 1.5px                    # Result: 24px
{base.spacing} + 8px          # With reference: 24px (if base.spacing = 16)
min(10px, 20px, 5px)         # Result: 5px
```

#### Complex Scripts (File Processing)
```tokenscript
variable base: Number = 16;
variable scale: Number = 1.25;
variable spacing: NumberWithUnit = base * scale px;

if(spacing > 20px) [
    spacing = 20px;
];

return spacing;
```

#### Color Manipulation
```tokenscript
variable primary: Color = #3B82F6;
variable secondary: Color = #1E40AF;
return primary;  # Result: #3B82F6
```

#### List Operations
```tokenscript
variable sizes: List = 8, 16, 24, 32;
variable doubled: List = sizes.get(0) * 2, sizes.get(1) * 2;
return doubled;  # Result: 16, 32
```

## CLI vs Python Implementation

This TypeScript implementation provides the same CLI capabilities as the original Python version:

| Feature | Python Command | TypeScript Command | Description |
|---------|---------------|-------------------|-------------|
| Interactive Mode | `python3 main.py interactive` | `npm run cli:interactive` | REPL for testing expressions |
| Parse Tokenset | `python3 main.py parse_tokenset --tokenset file.zip` | `npm run cli:parse -- --tokenset file.zip` | Process and resolve token files |
| Permutate Tokenset | `python3 main.py permutate_tokenset --tokenset file.zip --permutate-on themes --permutate-to target` | `npm run cli:permutate -- --tokenset file.zip --permutate-on themes --permutate-to target` | Generate theme permutations |

### Key Improvements in TypeScript Version:
- **🏗️ Core vs. Adapters Architecture**: Clean separation between format-agnostic core and DTCG adapters
- **⚡ Performance Optimized**: Iterative dependency resolution, efficient caching, optimized string conversions
- **🔧 Better Error Handling**: More descriptive error messages and structured error objects
- **🛡️ Type Safety**: Full TypeScript support with comprehensive type definitions
- **🔄 Modern Tooling**: Uses modern Node.js ecosystem and tools
- **🌐 Cross-Platform**: Better compatibility across different operating systems
- **📱 Web + CLI**: Single codebase supports both web interface and CLI
- **🧪 Highly Testable**: Core engine can be tested independently of format concerns
- **🚀 Extensible**: New token formats require only new adapters, core unchanged

## Architecture

### Core vs. Adapters Pattern

TokenScript Interpreter follows a **Core vs. Adapters** architectural pattern that provides maximum clarity, performance, and extensibility:

#### **The Core (`TokenSetResolver`)**
- **Pure, high-performance engine** that works only with flat `key: value` string maps
- **Zero knowledge of DTCG format** - no `$` prefixes, no `$value` keys
- **Iterative dependency resolution** using queue-based topological sort (prevents stack overflow)
- **Optimized reference caching** for maximum performance
- **Single responsibility** - token resolution only

#### **The Adapters (`utils/dtcg-adapter.ts`)**
- **Input Adapter** - Converts DTCG format to flat format for the core
- **Output Adapter** - Re-hydrates flat resolved tokens back to DTCG structure
- **Theme Extraction** - Handles complex theme-based token selection
- **Format Detection** - Automatically detects DTCG vs flat token formats

#### **Benefits of This Architecture**

1. **🎯 Clarity & Simplicity** - Core has single, clear responsibility
2. **🧪 Testability** - Core tested with simple objects, adapters tested separately
3. **🚀 Extensibility** - New formats need only new adapters, core unchanged
4. **🔧 Maintainability** - DTCG spec changes only affect adapter module
5. **⚡ Performance** - Eliminates redundant conversions and recursive calls

#### **Example: How It Works**

```typescript
// 1. ADAPT: Input (DTCG → Flat)
const dtcgTokens = {
  "color": { "red": { "$value": "{color.base}", "$type": "color" } }
};
const flatTokens = flattenTokens(dtcgTokens);
// Result: { "color.red": "{color.base}" }

// 2. CORE: Resolve (Flat → Flat)
const resolver = new TokenSetResolver(flatTokens);
const result = resolver.resolve();
// Result: { "color.red": "#FF0000" }

// 3. ADAPT: Output (Flat → DTCG)
const finalDtcg = rehydrateToDTCG(result.resolvedTokens, originalMetadata);
// Result: { "color.red": { "$value": "#FF0000", "$type": "color" } }
```

## Project Structure

- `/interpreter/` - Core TokenScript interpreter implementation
- `/lib/` - Library entry point and exports
- `/utils/dtcg-adapter.ts` - **NEW**: DTCG format adapters (input/output conversion)
- `/tests/` - Test suite
- `/types.ts` - TypeScript type definitions
- `/cli.ts` - Command-line interface entry point
- `/tokenset-processor.ts` - **REFACTORED**: Core token processing with adapter orchestration

## Advanced CLI Usage

### Processing Large Token Sets
For large design systems, use the CLI for batch processing:

```bash
# Process multiple token files
for file in tokens/*.zip; do
  npm run cli:parse -- --tokenset "$file" --output "output/$(basename "$file" .zip).json"
done
```

### Automated Theme Generation
Generate all theme combinations for a design system:

```bash
# Generate all brand/mode combinations
npm run cli:permutate -- \
  --tokenset design-system.zip \
  --permutate-on "Brand" "Mode" "Density" \
  --permutate-to "Components" \
  --output all-themes.json
```

### Integration with Build Tools
Integrate TokenScript processing into your build pipeline:

```json
{
  "scripts": {
    "tokens:build": "npm run cli:parse -- --tokenset src/tokens.zip --output dist/tokens.json",
    "tokens:themes": "npm run cli:permutate -- --tokenset src/tokens.zip --permutate-on Brand Mode --permutate-to Components --output dist/themes.json"
  }
}
```

## Contributing

This project is based on the original Python TokenScript interpreter. Contributions are welcome! Please ensure all tests pass before submitting a PR.

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/tokens-studio/tokenscript-interpreter.git
   cd tokenscript-interpreter
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run tests**
   ```bash
   npm test
   npm run test:coverage  # With coverage report
   ```

4. **Development workflow**
   ```bash
   npm run dev           # Start web development server
   npm run cli:interactive  # Test CLI interactively
   npm run lint          # Check code quality
   npm run format        # Format code
   ```

5. **Build and test library**
   ```bash
   npm run build:lib     # Build library for distribution
   npm run build:web     # Build web interface
   ```

### Code Quality

This project uses several tools to maintain code quality:

- **Biome**: For linting and formatting
- **TypeScript**: For type safety
- **Vitest**: For testing with coverage
- **GitHub Actions**: For CI/CD

Before submitting a PR:
```bash
npm run lint          # Fix linting issues
npm run format        # Format code
npm test              # Ensure all tests pass
npm run build:lib     # Ensure library builds successfully
```

### Project Structure

```
├── interpreter/          # Core TokenScript interpreter
├── lib/                # Library entry point
├── tests/              # Test suite
├── cli.ts              # CLI entry point
├── tokenset-processor.ts # Token processing utilities
├── types.ts            # TypeScript definitions
└── dist/               # Built library (generated)
```

### Release Process

See [RELEASE.md](./RELEASE.md) for detailed release instructions.

For maintainers:
```bash
npm run release:patch   # Bug fixes
npm run release:minor   # New features
npm run release:major   # Breaking changes
```

## Implementation Status

✅ **Complete with Architectural Improvements** - The TypeScript implementation now exceeds the Python version with a superior architecture:

### **Core Features (Full Parity)**
- **Interactive Mode**: REPL for testing expressions and setting variables
- **Tokenset Parsing**: Process ZIP files and resolve token dependencies
- **Theme Processing**: Handle both named and UUID-based token sets
- **Permutation Generation**: Create theme combinations (when multiple theme groups exist)
- **Error Handling**: Graceful handling of parsing errors with detailed warnings
- **Type Safety**: Full TypeScript support with comprehensive type definitions

### **Architectural Improvements (Beyond Python Version)**
- **🏗️ Core vs. Adapters Pattern**: Clean separation of concerns for maximum maintainability
- **⚡ Performance Optimizations**:
  - Iterative dependency resolution (prevents stack overflow)
  - Efficient reference caching with incremental updates
  - String conversion moved to adapters (out of hot path)
- **🔧 Format Extensibility**: New token formats require only new adapters
- **🧪 Enhanced Testability**: Core engine completely isolated from format concerns
- **📊 Structured Error Handling**: Libraries return data instead of console logging

### Tested With Real Data
The CLI has been successfully tested with real-world design token files:
- ✅ Processed 1160+ tokens per theme from TokenZenGarden.zip
- ✅ Resolved complex token dependencies and references
- ✅ Handled both old and new theme format structures
- ✅ Generated comprehensive output files

### Known Limitations
Some advanced token types are not yet fully supported:
- URLs in token values (contain colons that conflict with lexer)
- 8-digit hex colors with alpha channels
- CSS functions like `rgba()`, `linear-gradient()`

These limitations match the current interpreter capabilities and can be addressed in future updates.

## License

This project is part of the TokenScript ecosystem for design token management.
