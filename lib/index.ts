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
export type { TokenSetResolverOptions, TokenProcessingResult } from "../tokenset-processor";
// Tokenset processing utilities
export {
  buildThemeTree,
  createCustomTransform, // Transform system
  createCustomTransformForObjects, // Transform system for token objects
  createFigmaColorTransform, // Built-in Figma transform
  createFigmaColorTransformForObjects, // Built-in Figma transform for token objects
  interpretTokens, // Main API for JSON blob input
  interpretTokensAsObjects, // Token objects API (Approach 3)
  interpretTokensWithMetadata, // Enhanced API that preserves metadata
  interpretTokensWithTransforms, // Enhanced API with transform support
  interpretTokensets,
  permutateTokensets,
  processSingleTokenSet, // Backward compatibility
  processThemes,
  processTokensFromJson, // Backward compatibility
} from "../tokenset-processor";

// Type definitions
export * from "../types";
export type {
  PerformanceData,
  PerformanceSummary,
} from "../utils/performance-tracker";
// Performance tracking utilities
export {
  PerformanceTracker,
  trackPerformance,
} from "../utils/performance-tracker";
