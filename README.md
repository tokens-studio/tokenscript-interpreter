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

## Run Locally

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

## Usage

1. **Write TokenScript code** in the main editor
2. **Provide token references** in JSON format (optional)
3. **Click "Interpret"** to execute your code
4. **View results** including tokens, AST, and output

### Example Token References
```json
{
  "colors.primary": "#3B82F6",
  "spacing.base": 16,
  "typography.scale": 1.25
}
```

## Language Syntax

TokenScript supports:
- **Variables:** `variable name: Type = value;`
- **References:** `{token.name}` for external tokens
- **Functions:** `min(a, b, c)`, `max(a, b)`, `sqrt(x)`
- **Control flow:** `if(condition) [...] else [...]`
- **Loops:** `while(condition) [...]`
- **Types:** `Number`, `String`, `Color`, `List`, `Boolean`, `NumberWithUnit`

## Project Structure

- `/interpreter/` - Core TokenScript interpreter implementation
- `/components/` - React UI components
- `/tests/` - Test suite
- `/types.ts` - TypeScript type definitions

## Contributing

This project is based on the original Python TokenScript interpreter. Contributions are welcome! Please ensure all tests pass before submitting a PR.

## License

This project is part of the TokenScript ecosystem for design token management.
