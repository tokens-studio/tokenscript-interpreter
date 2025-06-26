// Core interpreter exports

// AST and symbol exports
export * from "../interpreter/ast";
export { ColorManager } from "../interpreter/colorManager";
export * from "../interpreter/errors";
export { Interpreter } from "../interpreter/interpreter";
export { Lexer } from "../interpreter/lexer";
export * from "../interpreter/operations";
export { Parser } from "../interpreter/parser";
export * from "../interpreter/symbols";
export * from "../interpreter/symbolTable";
// Export tokenset processor types
export type { TokenSetResolverOptions } from "../tokenset-processor";
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
} from "../tokenset-processor";

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
} from "../types";
// Type definitions
export * from "../types";
