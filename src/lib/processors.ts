// Token processing utilities
// Use this if you just need token processing without the raw interpreter

export {
  type AdapterOptions,
  flattenObject,
  hasNestedStructure,
  JsonTokensAdapter,
  recordToMap,
  type ThemeAdapterOptions,
  ThemeTokensAdapter,
  type TokenAdapter,
} from "@src/processor/adapters";
export { DependencyError } from "@src/processor/errors";
export { processTokens } from "@src/processor/process";
export type { ProcessorOutput, ProcessorResult } from "@src/processor/TokenProcessor";
export { TokenProcessor } from "@src/processor/TokenProcessor";
