// Core interpreter exports
export { Interpreter } from "../interpreter/interpreter";
export { Lexer } from "../interpreter/lexer";
export { Parser } from "../interpreter/parser";
export { ColorManager } from "../interpreter/colorManager";

// AST and symbol exports
export * from "../interpreter/ast";
export * from "../interpreter/symbols";
export * from "../interpreter/symbolTable";
export * from "../interpreter/errors";
export * from "../interpreter/operations";

// Tokenset processing utilities
export {
  buildThemeTree,
  interpretTokensets,
  permutateTokensets,
  processThemes,
} from "../tokenset-processor";

// Type definitions
export * from "../types";

// Re-export common types for convenience
export type {
  ReferenceRecord,
  ISymbolType,
  LanguageOptions,
  ASTNode,
  Token,
  TokenType,
  Operations,
  SupportedFormats,
  InterpreterValue,
} from "../types";

// Export tokenset processor types
export type { TokenSetResolverOptions } from "../tokenset-processor";
