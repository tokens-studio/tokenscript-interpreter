# Agents

Guidelines for AI coding agents working with this codebase.

## Project Overview

**Tokenscript** is a domain-specific language (DSL) interpreter for design tokens, written in TypeScript. It enables custom functions and logic to be shipped directly with design token data.

## Project Structure

```
src/
├── cli.ts              # CLI entry point
├── cli-handlers.ts     # CLI command handlers
├── interpreter/        # Core interpreter logic
├── lib/                # Library exports
├── processor/          # Token processing pipeline
├── syntax-highlighter/ # Syntax highlighting utilities
├── repl.ts             # REPL implementation
├── types.ts            # Shared type definitions
└── utils/              # Utility functions

tests/                  # Test files mirroring src/ structure
examples/               # Example applications (web-repl, runtime-ui, etc.)
data/                   # Assets, examples, and specifications
scripts/                # Build and release scripts
```

## Development Commands

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build the project
npm run build

# Lint code
npm run lint

# Format code
npm run format
```

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Build Tool**: tsup
- **Testing**: Vitest
- **Linting/Formatting**: Biome

## Code Style

- Follow existing patterns in the codebase
- Use TypeScript strict mode
- Prefer functional programming patterns where appropriate
- Keep functions small and focused

## Error Handling

Never throw raw string errors. Always use the structured error system:

1. Add an error code to the appropriate enum in `src/interpreter/errors/codes/` (e.g. `LexerErrorCode`, `ParserErrorCode`)
2. Add the typed error data interface in the same file
3. Add the human-readable message in `src/interpreter/errors/messages/en.ts`
4. Throw using the domain-specific error class (e.g. `LexerError`, `ParserError`, `InterpreterError`)

## Testing Guidelines

- Tests are located in `tests/` directory, mirroring `src/` structure
- Use Vitest for all tests
- Run `npm test` before submitting changes
- Ensure new features have corresponding tests

## Key Concepts

- **Tokens**: Design token data with `$value` and `$type` properties
- **Schemas**: Custom functions that define token transformations
- **Constants**: Named values (e.g., CSS color names) injected as bare identifiers during token evaluation
- **Interpreter**: Core engine that evaluates token expressions
- **References**: Token values can reference other tokens using `{token-name}` syntax

## Language Documentation

Key language features and edge cases are documented in `docs/tokenscript/`:

- [Implicit Lists and Strings](docs/tokenscript/implicit-lists-and-strings.md) - How unquoted values and whitespace-separated expressions work
- [Template Strings](docs/tokenscript/template-strings.md) - Backtick syntax with `{ref}` and `${expr}` interpolation
- [Math Functions](docs/tokenscript/math.md) - Mathematical operations and functions
- [Format/Unit Parsing Edge Cases](docs/tokenscript/edge-cases/format-unit-parsing.md) - How unit suffixes (px, s, ms) interact with implicit lists
- [Inline Mode](docs/tokenscript/inline-mode.md) - The expression-only subset used for token `$value` fields
- [Tolerant Parser](docs/tolerant-parser.md) - Fault-tolerant parsing for editors, autocomplete, and live preview

Processor:

- [Token Resolver CRUD](docs/token-resolver-crud.md) - Incremental token operations (create, update, delete, resolveValue)

Schema features:

- [Constants](docs/constants.md) - Named constants injected as bare identifiers during token evaluation

## Common Tasks

### Adding a new interpreter feature

1. Implement the feature in `src/interpreter/`
2. Add corresponding tests in `tests/interpreter/`
3. Update types in `src/types.ts` if needed
4. Run tests to ensure nothing breaks

### Adding a new CLI command

1. Add handler in `src/cli-handlers.ts`
2. Register command in `src/cli.ts`
3. Add tests in `tests/cli.test.ts`

### Working with the processor

The processor pipeline is in `src/processor/`. It handles:
- Token parsing
- Reference resolution
- Schema application
- Output generation

### Adding a new format unit

To add a new unit keyword (like `s` for seconds):

1. Add to `SupportedFormats` enum in `src/types.ts`
2. The lexer handles adjacency checking automatically
3. See [Format/Unit Parsing Edge Cases](docs/tokenscript/edge-cases/format-unit-parsing.md) for details
