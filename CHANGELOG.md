# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **In-Memory Token Processing**: New `interpretTokens()` function for processing tokens without file system operations
  - Accepts Map (preferred, skips flattening), flat records, or nested JSON tokens
  - Returns full ProcessorOutput with symbols preserved for downstream use
  - Integrated into unified processor module for consistent token handling
- **Browser-Compatible Processor**: Split processor into browser and Node.js variants
  - `interpretTokens()` available in main processor export (browser-safe)
  - File-based processing via separate `processor-node` export (Node.js only)
  - Web REPL now works without Node.js dependencies
- **Config Propagation**: Enhanced token processing to pass config through full pipeline
  - `TokenProcessor.processTokens()` now accepts optional `Config` parameter
  - `TokenProcessor.build()` accepts optional `Config` parameter
  - `interpretTokens()` passes config to token processor for symbol creation

### Changed
- **Processor Architecture**: Consolidated token processing into modular, unified interface
  - Split `process.ts` into three focused modules: `process.ts` (core), `processFiles.ts` (Node-only), `interpret.ts` (browser)
  - Both file-based (`processTokens`, `processTokensFromFiles`) and in-memory (`interpretTokens`) use same `flattenToTokens()` pattern
  - Separated symbol handling: `buildTokensWithSymbols()` preserves symbols, `buildTokens()` stringifies for JSON
- **API Design**: Breaking changes for beta library stability
  - Removed legacy `src/tokenset-processor.ts` entirely
  - `interpretTokens()` returns `ProcessorOutput` (includes graph, errors, unresolved) instead of plain record
  - Symbols are preserved as-is; users call `.toString()` for JSON conversion
  - Config parameter now threaded through entire processor stack
- **Package Exports**: Added new `./processor-node` export for Node.js file-based processing
  - Main processor export (`./processor`) is browser-compatible
  - File I/O operations isolated in `processor-node` entry point

### Removed
- **Legacy Architecture**: Deleted `src/tokenset-processor.ts` (469 lines)
  - Removed `TokenSetResolver` class (replaced by `TokenProcessor`)
  - Removed theme processing functions (`processThemes`, `buildThemeTree`, `permutateTokensets`, `interpretTokensets`)
  - Removed all old wrapper functions and compatibility layers
  - Removed 424 lines of duplicate/legacy code

### Fixed
- Web REPL no longer loads Node.js modules, resolving util.inherits errors in browser environment
- Token processing now properly preserves and applies custom Config (colorManager, functionsManager, etc.)
- Web REPL JSON output now correctly converts Symbol objects to stringified values

### Tests
- **Updated all processor tests** to use new split architecture
- **Refactored test helpers** to import from correct modules
- **Simplified assertions** in token tests for Map-based return types
- **Removed tests** for deprecated TokenSetResolver class
- All 1000 tests passing with new architecture

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
