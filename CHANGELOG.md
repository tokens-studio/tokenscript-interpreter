# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## UNRELEASED - 2025-11-19

### Added 

- Adds [ObjectParsers](src/processor/parsers/README.md) to turn structured data into `TokenSymbol`
- Adds `TokenSymbol` to handle structured data in tokenscript
  - Handles Objects with `Dictionary` interface
  - Handles Arrays with `List` interface

### Fixes

- Builder now always returns tokens map in `.tokens` regardless of build output format in `.build`

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
