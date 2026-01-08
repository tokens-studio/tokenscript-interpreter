// Browser-compatible processor exports
// For Node.js file-based processing, use:
// import { processTokensFromFiles } from "@tokens-studio/tokenscript-interpreter/processor-node";

export {
  buildTokens,
  flattenChildrenMap,
  flattenChildrenObject,
  getAffectedTokens,
  getBrokenReferences,
  getModifiedDependants,
  getRenamedReferences,
  TokenResolver,
  ValidationSeverity,
} from "@src/processor";
export type {
  BuildTokensOptions,
  CreateTokenParams,
  CreateTokenResult,
  DeleteTokenParams,
  DeleteTokenResult,
  FlattenCallback,
  IssuesMap,
  ProcessorOutput,
  ProcessorResult,
  ResolveIssue,
  TokenBuilder,
  TokenDataMap,
  TokenOperationResult,
  UpdateTokenParams,
  UpdateTokenResult,
  ValidationIssue,
} from "@src/processor";
export * as builders from "@src/processor/builders";
export { processTokenSets, processTokens } from "@src/processor/process";
export type { TokenData } from "@src/processor/utils/tokens";
