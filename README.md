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

Import and use the interpreter in your JavaScript/TypeScript projects:

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
import { interpretTokensets, processThemes } from 'tokenscript-interpreter';

// Process a tokenset from a ZIP file
const result = await interpretTokensets('path/to/tokens.zip', 'output.json');
console.log('Processed tokens:', result);
```

### 2. Command Line Interface (CLI)

Use the CLI for processing design token files and interactive development:

```bash
# Interactive mode
tokenscript interactive

# Process token files
tokenscript parse_tokenset --tokenset tokens.zip --output resolved.json

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

##### 3. Permutate Tokenset
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

### Utility Functions

#### `interpretTokensets(tokensetPath: string, outputPath: string): Promise<any>`

Process and resolve design token files from ZIP archives.

```typescript
import { interpretTokensets } from 'tokenscript-interpreter';

const result = await interpretTokensets('./tokens.zip', './output.json');
```

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
- **Better Error Handling**: More descriptive error messages and stack traces
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Modern Tooling**: Uses modern Node.js ecosystem and tools
- **Cross-Platform**: Better compatibility across different operating systems
- **Web + CLI**: Single codebase supports both web interface and CLI

## Project Structure

- `/interpreter/` - Core TokenScript interpreter implementation
- `/lib/` - Library entry point and exports
- `/tests/` - Test suite
- `/types.ts` - TypeScript type definitions
- `/cli.ts` - Command-line interface entry point
- `/tokenset-processor.ts` - Tokenset processing utilities

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

## CLI Implementation Status

✅ **Complete** - The TypeScript CLI now has full feature parity with the Python version:

- **Interactive Mode**: REPL for testing expressions and setting variables
- **Tokenset Parsing**: Process ZIP files and resolve token dependencies
- **Theme Processing**: Handle both named and UUID-based token sets
- **Permutation Generation**: Create theme combinations (when multiple theme groups exist)
- **Error Handling**: Graceful handling of parsing errors with detailed warnings
- **Type Safety**: Full TypeScript support with comprehensive type definitions

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
