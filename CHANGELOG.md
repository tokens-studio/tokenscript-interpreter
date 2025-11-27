# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## UNRELEASED

### Added

#### Library

- **TokenResolver.updateToken()**: Incremental token update API for efficient real-time resolution
  - Updates single token and recomputes only affected dependents using cached values
  - Returns resolved value and dependency subgraph for affected tokens
  - `getTokenDependencyGraph()` method for finding all tokens transitively affected by a change

#### Components Library

- **@tokenscript/stencil-components**: New package with web components for TokenScript
  - `<token-form>`: Form component for creating/editing design tokens
  - Real-time token resolution with preview of resolved values
  - Shadow DOM with CSS custom properties and `::part()` selectors for styling
  - Event-based API (`formSubmit`, `formCancel`) and prop-based handlers
  - TypeScript types for form data and events

#### Examples

- **runtime-ui**: Integrated Stencil components into token dialog
  - Replaced custom React form with `<token-form>` web component
  - Demonstrates real-time token resolution with dependencies
  - Custom styling via CSS parts matching design system

## [0.10.0] - 2025-11-24

### Added

- **Token Linting System**: Extensible validation framework for token values
  - `LintRunner` orchestrates linting rules and aggregates results
  - `TypeBasedRule` allows registering validators by token type
  - [Linting Documentation](src/processor/linter/README.md)
  - Returns `lint` property in process results with errors, warnings, and issue details
  - Zero overhead when linter is not provided
  - Validators can access AST, config, and resolved tokens for context-aware validation
  - Comprehensive test coverage for core linting functionality and processor integration

### Changed

- **Error System Refactoring**: Migrated all errors to use typed error codes
  - Added error code enums for all error types (`LexerErrorCode`, `ParserErrorCode`, `InterpreterErrorCode`, `ProcessorErrorCode`, etc.)
  - [Error System Documentation](src/interpreter/errors/README.md)
  - Error messages are now template-based and translation-ready
  - All errors include structured `data` property for type-safe error context
  - Added `serializeError` utility for wrapping caught errors
  - Added type guard functions: `isLanguageError`, `isLexerError`, `isParserError`, `isInterpreterError`, `isProcessorError`
  - Tests now assert on error codes instead of message strings

### Added 

- Structured tokens resolving and handling (one nesting level)
- [ObjectParsers](src/processor/parsers/README.md) for converting structured data to `TokenSymbol`
- `TokenSymbol` for handling structured data
  - Objects via `Dictionary` interface
  - Arrays via `List` interface
- `TokenData` type for encapsulating `{"$type": string, "$value": unknown}` during processing
- `processor-node` export for Node.js-specific file operations
- Direct method calls on token references (e.g., `{token}.get("key")`)

### Fixed

- Builder always returns tokens map in `.tokens` regardless of output format

### Changed

- ListSymbol now uses `.value` instead of `.entries` for data storage
- Symbol methods no longer have `impl` suffix

### Removed

- `serializeInterpreterResult` and `stringifyInterpreterResult` from public exports
- `collectJsonFiles`, `normalizeJsonFiles`, `processTokensFromFiles` from main processor export (moved to `processor-node`)

## [0.8.0] - 2025-11-11

### Added
- **TokenResolver Architecture**: Complete rewrite of token resolution system
  - [TokenResolver Documentation](src/processor/resolver/README.md)
- **Browser-Compatible Processor**: Split processor into browser and Node.js variants
  - `interpretTokens()` available in main processor export (browser-safe)
  - File-based processing via separate `processor-node` export (Node.js only)
  - Web REPL now works without Node.js dependencies

- **Token Builder Architecture**: Incremental structure building during token resolution
  - [Builder Documentation](src/processor/builders/README.md)
  - `NestedObjectBuilder` for hierarchical JavaScript objects
  - `FlatObjectBuilder` for flat key-value objects
  - `MapBuilder` for Map structures (default)
  - Custom builder interface for target-specific formats (CSS, etc.)

### Changed
- **Token Value Types**: Tokens can now return complex structures
  - Tokens can return dictionaries (trees) and lists, not just values.
    Functions can now create color ramps as virtual tokens, which can be referenced by other tokens
- **Package Exports**: Added new `./processor-node` export for Node.js file-based processing
  - Main processor export (`./processor`) is browser-compatible
  - File I/O operations isolated in `processor-node` entry point

### Removed
- **Legacy TokenProcessor**: Replaced `TokenProcessor` with `TokenResolver`
  - Removed simple topological sort approach
  - Removed limited prefix support
- **Legacy Architecture**: Deleted `src/tokenset-processor.ts` (469 lines)
  - Removed `TokenSetResolver` class (replaced by `TokenProcessor`)
  - Removed theme processing functions (`processThemes`, `buildThemeTree`, `permutateTokensets`, `interpretTokensets`)
  - Removed all old wrapper functions and compatibility layers
  - Removed 424 lines of duplicate/legacy code

## [0.7.0] - 2025-11-07

### Added
- **Token Processing Architecture**: New token processor with dependency resolution and theme support
- **CLI Enhancements**:
  - New `inspect` command for examining tokens
  - Improved REPL functionality with dedicated module
  - Better error handling and reporting
- **Integration Tests**: Comprehensive test coverage for CLI commands and token processing workflows
- **Type System Improvements**:
  - Enhanced type guards and utilities
  - PascalCase naming convention for types
  - `isSingleEntryObject` type utility
- **Package Exports**: New `./processor` export for token processing functionality
- **Standard Compliance**: Updated compliance testing workflow and scripts

### Changed
- **CLI Architecture**: Refactored CLI from monolithic structure to modular design
- **Build Configuration**: Updated tsup configs for better module handling
- **Symbol System**: Enhanced symbol handling with type guards
- **Parser**: Minor improvements to type handling

### Removed
- Deprecated `TokenZenGarden.zip` example (old format)
- Legacy processor architecture
- Unused utility functions

### Fixed
- Theme handling for single-file JSON tokens
- Various build and type issues
- Performance improvements for token extraction

[0.7.0]: https://github.com/tokens-studio/tokenscript-interpreter/compare/v0.6.0...v0.7.0
