# TokenScript Interpreter - Copilot Instructions

## Project Overview

This is a TypeScript interpreter for **TokenScript**, a domain-specific language (DSL) for design token manipulation and computation. The interpreter supports mathematical operations, color manipulation, unit conversions, and token references using `{token.name}` syntax.

## Architecture & Key Components

### Core Interpreter (`/interpreter/`)
- **`lexer.ts`** - Tokenizes TokenScript source code into tokens
- **`parser.ts`** - Parses tokens into Abstract Syntax Tree (AST)
- **`ast.ts`** - AST node definitions (BinOpNode, NumNode, StringNode, etc.)
- **`interpreter.ts`** - Main interpreter that evaluates AST nodes
- **`symbols.ts`** - Symbol system for different data types (Number, String, Color, etc.)
- **`symbolTable.ts`** - Symbol table for variable management
- **`colorManager.ts`** - Color manipulation and conversion utilities
- **`operations.ts`** - Mathematical and logical operations
- **`errors.ts`** - Custom error types and handling

### Library API (`/lib/index.ts`)
**Main exports for consumers:**
- `Interpreter`, `Lexer`, `Parser` - Core interpreter classes
- `interpretTokens()` - Process any token format (flat or DTCG) and return flat tokens
- `processThemes()`, `permutateTokensets()` - High-level token processing
- `PerformanceTracker` - Performance monitoring utilities

### Token Processing (`tokenset-processor.ts`)
High-level API that handles:
- DTCG (Design Token Community Group) format conversion
- Token reference resolution (`{token.name}` syntax)
- Theme permutations and token set merging
- Performance tracking for large token sets

### CLI Tool (`cli.ts`)
Command-line interface with commands:
- `interactive` - REPL mode for testing TokenScript expressions
- `parse_tokenset` - Process ZIP files containing token sets
- `permutate_tokenset` - Generate theme permutations
- `parse_json` - Process JSON token files
- `evaluate_standard_compliance` - Run compliance tests

## Testing Strategy

### Test Structure (`/tests/`)
- **`/tests/interpreter/`** - Unit tests for all interpreter components
- **`/tests/performance/`** - Performance benchmarking tests
- **`cli.test.ts`** - CLI functionality tests

### Key Test Files
- `interpreter.test.ts` - Main interpreter functionality
- `lexer.test.ts`, `parser.test.ts` - Language parsing tests
- `color-*.test.ts` - Color manipulation and conversion tests
- `math-functions.test.ts` - Mathematical operations
- `variables.test.ts`, `control-structures.test.ts` - Language features

### Compliance Testing (`compliance-suite.ts`)
- Automated standards compliance verification
- JSON-based test cases with expected outputs
- Run with: `npm run compliance_test`

## Development Workflow

### Build & Test Commands
```bash
npm run build          # Build library
npm run test           # Run all tests
npm run test:watch     # Watch mode testing
npm run test:coverage  # Coverage reporting
npm run lint           # Biome linting
npm run format         # Code formatting
npm run check:all      # Lint + test
```

### CLI Development
```bash
npm run cli:interactive    # Start interactive mode
npm run cli:parse         # Test tokenset parsing
npm run compliance_test   # Run compliance tests
```

## TokenScript Language Features

### Supported Types
- `Number` - Numeric values
- `NumberWithUnit` - Numbers with units (px, rem, em, %)
- `String` - Text values
- `Color` - Color values with manipulation functions
- `List` - Arrays of values
- `Boolean` - True/false values

### Expression Examples
```tokenscript
16 * 1.5px                    // 24px
{base.spacing} + 8px          // Token references
min(10px, 20px, 5px)         // Math functions
variable spacing: NumberWithUnit = 16px;  // Variables
if(spacing > 20px) [ spacing = 20px; ];   // Control flow
```

### Token Reference System
- Use `{token.name}` syntax to reference external tokens
- Automatic dependency resolution and circular reference detection
- Support for nested token structures

## Working with This Codebase

### Making Changes to the Interpreter
1. **Language features**: Start with `lexer.ts` (tokens) → `parser.ts` (grammar) → `interpreter.ts` (evaluation)
2. **Operations**: Add to `operations.ts` and corresponding AST nodes in `ast.ts`
3. **Types**: Add new symbol types in `symbols.ts`
4. **Always add tests** in `/tests/interpreter/` for new features

### Adding New Token Processing Features
1. Modify `tokenset-processor.ts` for high-level token operations
2. Update `/lib/index.ts` exports if adding public APIs
3. Add CLI commands in `cli.ts` if needed
4. Update type definitions in `types.ts`

### Performance Considerations
- Use `PerformanceTracker` for monitoring large operations
- Token processing supports lazy evaluation for large token sets
- Check `/tests/performance/` for performance regression tests

### Common Debugging Patterns
- Use `npm run cli:interactive` to test expressions interactively
- Run specific test files: `npm run test -- <test-file-pattern>`
- Check compliance: `npm run compliance_test:failed` for failed tests only
- Enable performance tracking in processing functions

### Code Style
- Uses **Biome** for linting and formatting (not ESLint/Prettier)
- TypeScript strict mode enabled
- ES modules throughout (`"type": "module"` in package.json)
- Minimal dependencies philosophy

### File Patterns to Understand
- `/interpreter/*.ts` - Core language implementation
- `/tests/interpreter/*.test.ts` - Test each interpreter component
- `tokenset-processor.ts` - High-level token processing APIs
- `cli.ts` - Command-line interface and examples
- `/lib/index.ts` - Public API surface

### Quick Start for Contributors
1. `npm install` - Install dependencies
2. `npm run test` - Ensure tests pass
3. `npm run cli:interactive` - Try the interactive mode
4. Look at `/examples/` for sample token files
5. Run `npm run compliance_test` to see standards compliance

### Integration Points
- **Input**: Accepts DTCG format, flat JSON, or ZIP token sets
- **Output**: Always returns flat token format for consistency
- **CLI**: Provides both interactive and batch processing modes
- **Performance**: Built-in tracking for large-scale token processing

This interpreter is designed to be both a standalone CLI tool and a library for integration into design system workflows.