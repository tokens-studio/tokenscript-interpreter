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
export type { TokenSetResolverOptions } from "../tokenset-processor";
// Tokenset processing utilities
export {
  buildThemeTree,
  interpretTokens, // Main API for JSON blob input
  interpretTokensets,
  permutateTokensets,
  processSingleTokenSet, // Backward compatibility
  processThemes,
  processTokensFromJson, // Backward compatibility
} from "../tokenset-processor";

// Type definitions
export * from "../types";
export type { PerformanceData, PerformanceSummary } from "../utils/performance-tracker";
// Performance tracking utilities
export { PerformanceTracker, trackPerformance } from "../utils/performance-tracker";
