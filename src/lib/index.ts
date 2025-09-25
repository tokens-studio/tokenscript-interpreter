// Core interpreter exports

// AST and symbol exports
export * from "@interpreter/ast";
export * from "@interpreter/config";
export * from "@interpreter/errors";
export { Interpreter } from "@interpreter/interpreter";
export { Lexer } from "@interpreter/lexer";
export * from "@interpreter/operations";
export { Parser } from "@interpreter/parser";
export * from "@interpreter/symbols";
export * from "@interpreter/symbolTable";
export type { TokenSetResolverOptions } from "@src/tokenset-processor";
// Tokenset processing utilities
export {
  buildThemeTree,
  interpretTokens, // Main API for JSON blob input
  interpretTokensets,
  permutateTokensets,
  processSingleTokenSet, // Backward compatibility
  processThemes,
  processTokensFromJson, // Backward compatibility
} from "@src/tokenset-processor";

// Type definitions
export * from "@src/types";
export type {
  PerformanceData,
  PerformanceSummary,
} from "@src/utils/performance-tracker";
// Performance tracking utilities
export {
  PerformanceTracker,
  trackPerformance,
} from "@src/utils/performance-tracker";
