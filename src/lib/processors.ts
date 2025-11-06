// Token processing utilities
// Use this if you just need token processing without the raw interpreter

export { DependencyError } from "@src/processor/errors";
export { processTokens } from "@src/processor/process";
export type { ProcessorOutput, ProcessorResult } from "@src/processor/TokenProcessor";
export { TokenProcessor } from "@src/processor/TokenProcessor";
export { flattenObject, isNested as hasNestedStructure, recordToMap } from "@src/processor/utils/tokens";
