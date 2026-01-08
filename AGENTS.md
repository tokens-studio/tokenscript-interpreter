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

## Testing Guidelines

- Tests are located in `tests/` directory, mirroring `src/` structure
- Use Vitest for all tests
- Run `npm test` before submitting changes
- Ensure new features have corresponding tests

## Key Concepts

- **Tokens**: Design token data with `$value` and `$type` properties
- **Schemas**: Custom functions that define token transformations
- **Interpreter**: Core engine that evaluates token expressions
- **References**: Token values can reference other tokens using `{token-name}` syntax

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
