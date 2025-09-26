// Core interpreter exports ----------------------------------------------------

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

// Tokenset processing utilities -----------------------------------------------

export {
  buildThemeTree,
  interpretTokens, // Main API for JSON blob input
  interpretTokensets,
  permutateTokensets,
  processSingleTokenSet, // Backward compatibility
  processThemes,
  processTokensFromJson, // Backward compatibility
} from "@src/tokenset-processor";

// Type definitions ------------------------------------------------------------

export * from "@src/types";

// Performance tracking utilities ----------------------------------------------

export type {
  PerformanceData,
  PerformanceSummary,
} from "@src/utils/performance-tracker";
export {
  PerformanceTracker,
  trackPerformance,
} from "@src/utils/performance-tracker";

// Schema fetching utilities ---------------------------------------------------

export type {
  SchemaFetcherOptions,
  TokenScriptSchemaContent,
  TokenScriptSchemaResponse,
} from "@src/utils/schema-fetcher";
export { fetchTokenScriptSchema } from "@src/utils/schema-fetcher";
