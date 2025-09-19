// Core interpreter exports

// AST and symbol exports
export * from "@interpreter/ast";
export { ColorManager, Config } from "@interpreter/config";
export * from "@interpreter/errors";
export { Interpreter } from "@interpreter/interpreter";
export { Lexer } from "@interpreter/lexer";
export * from "@interpreter/operations";
export { Parser } from "@interpreter/parser";
export * from "@interpreter/symbols";
export * from "@interpreter/symbolTable";
export type { TokenSetResolverOptions, TokenProcessingResult } from "@src/tokenset-processor";
// Tokenset processing utilities
export {
  buildThemeTree,
  createCustomTransform, // Transform system
  createCustomTransformForObjects, // Transform system for token objects
  createFigmaColorTransform, // Built-in Figma transform
  createFigmaColorTransformForObjects, // Built-in Figma transform for token objects
  interpretTokens, // Main API for JSON blob input
  interpretTokensAsObjects, // Token objects API
  interpretTokensWithMetadata, // Enhanced API that preserves metadata
  interpretTokensWithTransforms, // Enhanced API with transform support
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
