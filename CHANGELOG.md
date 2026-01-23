# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.21.0] - 2026-01-23

### Added

- **Advanced math functions**: Trigonometric (`sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`), hyperbolic (`sinh`, `cosh`, `tanh`, `asinh`, `acosh`, `atanh`), logarithmic (`log`, `ln`, `log10`, `log2`, `log1p`), and additional utilities (`pow`, `mod`, `remainder`, `cbrt`, `sign`, `trunc`, `exp`, `expm1`, `hypot`, `average`, `pi`)
- **Unit preservation across all math functions**: Operations like `pow(2px, 3)` now return `8px`, maintaining units as metadata throughout calculations

### Changed

- **Refactored math functions**: Extracted to composable pure functions with shared helpers (`over`, `overTwo`, `overMany`) for consistent behavior
- **`min`/`max` now require at least 1 argument**: Previously accepted 0 arguments returning `Infinity`/`-Infinity`

## [0.20.0] - 2026-01-16

### Added

- **NumberWithUnit support for math functions**: `round()`, `floor()`, `ceil()`, `abs()`, and `round_to()` now accept values with units and preserve them in the result. Example: `round(1.5px)` returns `2px`.

## [0.19.0] - 2026-01-16

### Changed

- **Standard rounding for `round()` and `round_to()` functions**: Changed from banker's rounding (round half to even) to standard rounding (round half up). `round(2.5)` now returns `3` instead of `2`, matching user expectations.

## [0.18.1] - 2026-01-16

### Added

- **Agent guidelines documentation**: Added AGENTS.md with project overview, structure, development commands, and common tasks for AI coding assistants.
- **REPL reference injection**: Pass initial variable references to the REPL via `--reference="key:value"` flag. Supports strings, numbers, and JSON arrays. Multiple references can be passed.

### Changed

- **TypeScript module resolution**: Updated to `bundler` mode for improved compatibility with modern build tools. Added explicit `baseUrl` for cleaner import resolution.

## [0.18.0] - 2025-12-30

### Fixed

- **Bundle splitting for multiple entry points**: Enabled code splitting in build configuration to prevent class duplication across entry points (`/processor`, `/interpreter`, etc.). Previously, importing from multiple entry points (e.g., `Config` from main and `buildTokens` from `/processor`) created separate class instances, breaking `instanceof` checks and causing initialization issues. Now all entry points share common code via chunks, ensuring class identity is preserved.

## [0.17.1] - 2025-12-29

### Removed

- **Deprecated `rgba()` function**: Removed hardcoded `rgba()` function that manually constructed RGBA strings. Use color literals with alpha property instead (e.g., `rgb(255, 0, 0, 0.5)` or access via `color.alpha`).

## [0.17.0] - 2025-12-29

### Added

- **Persistent color alpha channel**: Added `alpha` property to `ColorSymbol` (stored outside `value` channels, defaults to `null`). Alpha is now preserved across all color format conversions (RGB → HSL → Hex, etc.). All color types (RGB, HSL, Hex) now support alpha via `.alpha` property. CSS color formatting includes alpha as fourth parameter when set and < 1 (e.g., `rgb(255, 0, 0, 0.5)`).

### Breaking Changes

- **Color alpha property**: Replace `rgbaColor.value.a` with `rgbaColor.alpha`
- **Color alpha access**: Use `color.alpha` property on any color type instead of RGBA-specific handling  
- **ColorSymbol constructor**: Constructor signature changed from `(value, subType?, config?, alpha?)` to `(value, subType?, alpha?, config?)`. Update any direct `ColorSymbol` constructor calls to use new parameter order.

## [0.16.1] - 2025-12-29

### Added

- **Script mode for REPL**: Two execution modes for interactive development
  - **Inline mode** (default): Executes each line immediately, like traditional REPLs
  - **Script mode** (`--mode script`): Accumulates lines into a multi-statement script for complex workflows
  - Smart output handling: Only prints assigned/reassigned values and expression results
  - New commands: `exit()` to quit, `clear()` to reset script buffer
  
- **Interpreter**
  - Public `getSymbol()` method on Interpreter for accessing symbol table values

## [0.16.0] - 2025-12-17

### Changed

- **BREAKING: Cleaned up processor output interface**: Removed internal properties from public API
  - Removed `unresolved` property from `ProcessorResult` - internal tracking no longer exposed
  - Removed `subFieldPaths` property from `ProcessorResult` - internal tracking no longer exposed
  - Added `getSubFieldPaths()` method on `PrefixResolver` for internal use
  - Simplified `ProcessorOutput` by removing redundant filtering logic in builder
  - Users should rely on `tokens` Map for resolved values and `issues` Map for problems

- **BREAKING: Unified error tracking in `issues` Map**: Removed separate `errors` Map from processor output
  - `ProcessorOutput` no longer includes `errors` property - all errors now tracked in `issues` Map
  - Added `getTokenError()` helper to extract Error objects from issues
  - Added `tokenHasError()` helper to check if token has error vs lint issue
  - Errors in issues can be identified by presence of `code` property (vs lint issues)
  - Simplifies error handling with single source of truth for all token problems
  - Migration: Replace `result.errors.get(token)` with `getTokenError(result.issues, token)`
  - Migration: Replace `result.errors.has(token)` with `tokenHasError(result.issues?.get(token))`

## [0.15.1] - 2025-12-16

### Fixed

- **Phantom Token Resolution**: Resolved type-safety issue in missing dependency tracking
  - Removed unsafe type casts (`error as unknown as InterpreterResult`) in `referenceCache`
  - Added dedicated `missingDependencies` set to track references to non-existent tokens
  - Ensured `referenceCache` only contains valid `InterpreterResult` values (`ISymbolType | string | null`)
  - Fixed circular dependency detection to correctly report `CIRCULAR_DEPENDENCY` instead of `TOKEN_NOT_FOUND`
  - Prevents phantom tokens (missing dependencies) from appearing in resolved output

## [0.15.0] - 2025-12-16

### Added

- **CSS and Penpot Preset Validators**: Pre-built validation rulesets for token types
  - `css.createLintRunner()`: Standards-compliant CSS validators (opacity, fontWeight, borderRadius, boxShadow, lineHeight, letterSpacing, textTransform, textDecoration)
  - `penpot.createLintRunner()`: Penpot-specific validators extending CSS rules (typography, shadow, strokeWidth)
  - Composable primitives: `number()`, `string()`, `boolean()`, `color()`, `numberWithUnit()`
  - Combinators: `or()`, `all()`, `oneOrList()`, `list()`, `struct()`, `arrayOf()`

- **LintRunner Extension API**: Composable rule system with `.extend()` method
  - Override specific validators while preserving others
  - Combine validators using `all()` combinator
  - Immutable API returns new instances

- **Structured Token Field-Level Linting**: Validation with field-level granularity
  - `path` property on `LintIssue` identifies specific fields (e.g., `["fontSize"]` or `[0, "blur"]`)
  - Supports Map-based (typography) and array-based (box-shadow) tokens
  - Cross-field validation (e.g., lineHeight requires fontSize)

- **TokenSymbol Validator Support**: Validators can use `.get()`, `.keys()`, `.values()`, `.length()` methods

- **Helper Functions**: `getAffectedTokens()`, `getBrokenReferences()`, `getModifiedDependants()`, `getRenamedReferences()`

### Changed

- **BREAKING: LintResult Type**: Changed from object to `Map<RefPath, LintIssue[]>`
  - Before: `result.lint.errors`, `result.lint.warnings`, `result.lint.hasErrors`
  - After: `result.issues` (Map), filter by `issue.severity`

- **BREAKING: LintIssue Structure**:
  - Removed `ruleId` property (use `code` instead)
  - Changed `tokenName` type from `string` to `RefPath`
  - Added optional `path` property: `(string | number)[]`

- **BREAKING: CreateIssueFn Signature**: Now accepts full issue object instead of individual parameters

- **BREAKING: Removed `aggregateResults()`**: Work directly with `Map<RefPath, LintIssue[]>`

- **ProcessorOutput**: Renamed `lintIssues` to `issues` (now includes lint issues and language errors)

- **Error Handling**: `DependencyError` class replaced with `createDependencyError()` helper returning `ProcessorError`

- **CRUD Result Types**: Unified to `TokenOperationResult` with `tokens`, `resolved`, `issues`, `dependants` properties

- **Circular dependency handling**: Circular dependencies no longer throw errors but are handled gracefully


## [0.14.0] - 2025-12-12

### Changed

- **BREAKING: Builder output refactoring**: Simplified builder architecture and separated string vs symbol outputs
  - Any output is now defined by the `builder` property
  - Migration: Replace `{ output: "string" }` with `{ builder: new StringMapBuilder() }` for string Map output
  - Migration: Replace `{ output: "symbols" }` by removing the option (symbols are now the default)
  
- **Enhanced CRUD operations with linter support**: All TokenResolver CRUD methods now return lint results
  - `createToken()`, `updateToken()`, and `deleteToken()` now return `lintIssues` array in their results
  - Linter is preserved across CRUD operations when passed to `buildTokens()` or `processTokens()`
  - Enables real-time validation feedback during token editing workflows

### Added

- **`buildTokens()` export**: Core token processing function now available in public API
  - Skips normalization overhead when you already have `Map<string, TokenData>`
  - Lower-level API for performance-critical applications

- **Error class exports**: All error classes now exported from main library entry point
  - New `errorClasses` export includes: `LanguageError`, `LexerError`, `ParserError`, `InterpreterError`, `ProcessorError`, `DependencyError`
  - Enables consumers to handle and throw interpreter errors properly
  - Useful for custom validators and error handling in applications

- **`isList`, `isDictionary` type guard helpers**: Added type checking utilities for List and Dictionary symbols

## [0.13.3] - 2025-12-11

- Exported `linter`

## [0.13.2] - 2025-12-11

### Added

- Exported `linter`

## [0.13.1] - 2025-12-10

### Added

- Exported `renameReferences` utility function from library

## [0.13.0] - 2025-12-10

### Added

- **Symbol `toJs()` method**: All symbol types now have a `toJs()` method for converting to plain JavaScript values
  - Supports `ToJsOptions` with `recursive` (default: true) and `stringify` (default: false) options
  - **NumberWithUnitSymbol**: Returns `{ value: number | null, unit: string }` by default, or string when `stringify: true`
  - **ColorSymbol**: Returns structured object with `type` field and component values by default
    - Hex colors: `{ type: "hex", value: "#ff0000" }`
    - Dynamic colors: `{ type: "rgb", r: 255, g: 0, b: 0, ... }`
    - String representation when `stringify: true`
  - **ListSymbol, DictionarySymbol, TokenSymbol**: Recursively convert nested values with `recursive` option
  - Value types extracted and reused: `NumberValue`, `StringValue`, `BooleanValue`, `NumberWithUnitValue`, `ColorValue`
  - Comprehensive test coverage across all symbol types

### Changed

- **Removed `symbolTypeToJsValue()` function**: Developers should call `symbol.toJs()` directly instead
- **Updated `serializeInterpreterResult()`**: Now accepts `ToJsOptions` parameter for customization
- **Builder serialization**: Uses `stringify: true` option to maintain backward-compatible string output for `NumberWithUnitSymbol` and `ColorSymbol`

### Added

- **TokenResolver CRUD operations**: Complete token lifecycle management with dependency tracking
  - `createToken()`: Add new tokens with automatic dependency graph updates
  - `updateToken()`: Modify existing tokens with options for renaming and reference updates
    - `updateReferences` option: Automatically updates all dependent tokens when renaming
    - Returns `renamedReferences` set tracking which tokens had references updated
    - Returns `brokenReferences` set when renaming without `updateReferences`
  - `deleteToken()`: Remove tokens with broken reference detection
    - Returns `brokenReferences` set identifying tokens with missing dependencies
  - All operations return affected tokens and dependency subgraphs for UI updates
  - Full integration test coverage for complex CRUD workflows

- **AST utilities for reference management**
  - `walkAST()`: Traverse AST nodes with visitor pattern
  - `filterAST()`: Collect matching nodes into flat array
  - `collectReferenceNodes()`: Extract all reference nodes, optionally filtered by name
  - `renameReferences()`: Safely rename token references in expressions using AST
  - Token positions (`pos`, `endPos`) now tracked on all tokens for precise text manipulation

- **Enhanced token position tracking**
  - Lexer now records start and end positions for all tokens
  - Enables precise source code manipulation for renames and updates
  - Reference tokens include exact character ranges in original string

### Changed

- **BREAKING: Removed `@tokenscript/stencil-components` package**
  - Stencil web components moved out of monorepo to reduce dependencies
  - Removed from CI/CD pipeline and build scripts
  - Examples no longer depend on components package
  - Runtime UI example now uses native form implementation

- **Enhanced error codes**
  - Added `ProcessorErrorCode.TOKEN_ALREADY_EXISTS` for duplicate token detection
  - Improved error messages with structured data for better debugging

### Fixed

- **Build configuration preserves class names in production bundles**
  - Added `keepNames: true` to tsup build configs to prevent Symbol class name mangling
  - Ensures runtime type checking and debugging remain accurate in minified builds

- **Test suite cleanup**
  - Removed debug console.log statements from reference method tests

### Removed

- **Stencil Components package** (`packages/stencil-components/`)
  - `<token-form>` web component and related infrastructure
  - Stencil build configuration and dependencies
  - CI/CD integration for component builds and tests
  - Example integrations using Stencil components

## [0.12.0] - 2025-12-04

### Fixed

- **Structured tokens now use proper TokenScript-compatible symbol types**
  - Array elements that are objects are now wrapped in `DictionarySymbol` instead of plain objects
  - Nested objects within tokens are now wrapped in `DictionarySymbol` for proper type safety
  - Nested arrays within tokens are now wrapped in `ListSymbol` for proper type safety
  - This ensures TokenScript can properly understand and manipulate structured token data
  - **BREAKING**: Array elements must now be accessed via `.get()` method instead of direct property access
    - Before: `tokenArray[0].blur` 
    - After: `tokenArray[0].get("blur")`
  - Added comprehensive test suite in `structured-tokens-type-wrapping.test.ts`

## [0.11.2] - 2025-12-04

### Fixed

- **Structured tokens with nested arrays**: Fixed resolution of string fields and references in objects nested within arrays
  - Previously, fields in array elements like `[{ blur: "12px", spread: "{spread}" }]` were not being resolved
  - String fields with references inside array objects now properly resolve to their referenced values
  - Primitive values (numbers, booleans) in array objects are now correctly typed instead of being stringified
  - `extractStringFields` now recursively extracts from nested structures while respecting object parser boundaries
  - `buildValueFromResolvedFields` checks object parsers before recursing, ensuring structures like `{ value: 8, unit: "px" }` are handled atomically
  - Example: Shadow tokens with array values now properly resolve all field references and maintain correct types

### Changed

- **BREAKING: `defaultObjectParsers` is now empty by default**
  - Previously included `numberWithUnitParser` automatically
  - Applications must now explicitly pass object parsers via the `objectParsers` option in `processTokens()`
  - Makes parser behavior explicit and prevents unexpected transformations
  - Migration: Add `objectParsers: [numberWithUnitParser]` to process options if you need `{ value, unit }` parsing
  - Example: `processTokens(tokens, { objectParsers: [numberWithUnitParser] })`

### [0.11.1] - 2025-12-04

- **TokenResolver callbacks for structured tokens**: Enhanced error handling for field-level validation
  - `onResolve` callbacks: Only invoked for parent tokens, not sub-fields (no spam from internal resolution)
  - `onError` callbacks: Now invoked for both parent tokens AND sub-fields with metadata
  - Sub-field errors include metadata: `{ isSubField: true, parentToken: string, fieldPath: string }`
  - Enables collecting field-level errors for form validation (e.g., show error on specific input field)
  - Backwards compatible: metadata parameter is optional, existing code continues to work

## [0.11.0] - 2025-11-27

### Added

#### CLI

- **`eval` command**: Evaluate TokenScript expressions and output JSON results
  - Accepts expressions as arguments or via `--stdin` for piped input
  - `--refs` option to pass variable references as JSON object
  - `--schema` option to fetch and register JSON schemas
  - Returns structured JSON with `success`, `result`, `resultString`, `type`, and `executionTime`

#### Library

- **TokenResolver.updateToken()**: Incremental token update API for efficient real-time resolution
  - Updates single token and recomputes only affected dependents using cached values
  - Returns resolved value and dependency subgraph for affected tokens
  - `getTokenDependencyGraph()` method for finding all tokens transitively affected by a change

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
