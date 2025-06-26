// Core interpreter exports

// AST and symbol exports
export * from "../interpreter/ast.js";
export { ColorManager } from "../interpreter/colorManager.js";
export * from "../interpreter/errors.js";
export { Interpreter } from "../interpreter/interpreter.js";
export { Lexer } from "../interpreter/lexer.js";
export * from "../interpreter/operations.js";
export { Parser } from "../interpreter/parser.js";
export * from "../interpreter/symbols.js";
export * from "../interpreter/symbolTable.js";
// Export tokenset processor types
export type { TokenSetResolverOptions } from "../tokenset-processor.js";
// Tokenset processing utilities
export {
  buildThemeTree,
  interpretTokens, // Main API for JSON blob input
  interpretTokensets,
  interpretTokensWithMetadata, // API for DTCG format with $value structure
  permutateTokensets,
  processSingleTokenSet, // Backward compatibility
  processThemes,
  processTokensFromJson, // Backward compatibility
} from "../tokenset-processor.js";

// Re-export common types for convenience
export type {
  ASTNode,
  InterpreterValue,
  ISymbolType,
  LanguageOptions,
  Operations,
  ReferenceRecord,
  SupportedFormats,
  Token,
  TokenType,
} from "../types.js";
// Type definitions
export * from "../types.js";
