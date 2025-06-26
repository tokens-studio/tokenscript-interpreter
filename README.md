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
- 🧮 **Mathematical functions** - Built-in functions like `min()`, `max()`, `sqrt()`, etc.
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

## Installation & Usage

TokenScript Interpreter provides both a **web interface** and a **command-line interface (CLI)** for different use cases.

### Web Interface

**Prerequisites:** Node.js (v16 or higher)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser** and navigate to `http://localhost:5173`

#### Web Usage
1. **Write TokenScript code** in the main editor
2. **Provide token references** in JSON format (optional)
3. **Click "Interpret"** to execute your code
4. **View results** including tokens, AST, and output

### Command Line Interface (CLI)

The CLI provides powerful tools for processing design token files and interactive development.

#### Installation for CLI
```bash
npm install -g tokenscript-interpreter
# Or run locally with npm scripts (see below)
```

#### CLI Commands

##### 1. Interactive Mode
Start an interactive REPL for experimenting with TokenScript expressions:

```bash
npm run cli:interactive
# Or: npm run cli -- interactive
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

## Language Syntax

TokenScript supports a rich set of features for design token manipulation:

### Basic Syntax
- **Variables:** `variable name: Type = value;`
- **References:** `{token.name}` for external tokens
- **Functions:** `min(a, b, c)`, `max(a, b)`, `sqrt(x)`
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
- `/components/` - React UI components for web interface
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
1. Clone the repository
2. Install dependencies: `npm install`
3. Run tests: `npm test`
4. Test CLI: `npm run cli:interactive`
5. Start web dev server: `npm run dev`

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
- CSS functions like `rgba()`, `linear-gradient()`, `roundTo()`

These limitations match the current interpreter capabilities and can be addressed in future updates.

## License

This project is part of the TokenScript ecosystem for design token management.
