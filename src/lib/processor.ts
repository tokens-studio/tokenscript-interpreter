// Browser-compatible processor exports
// For Node.js file-based processing, use:
// import { processTokensFromFiles } from "@tokens-studio/tokenscript-interpreter/processor-node";

export {
  type BuildTokensOptions,
  buildTokens,
  type CreateTokenParams,
  type CreateTokenResult,
  type DeleteTokenParams,
  type DeleteTokenResult,
  type FlattenCallback,
  flattenChildrenMap,
  flattenChildrenObject,
  linter,
  type ProcessorOutput,
  type ProcessorResult,
  type TokenBuilder,
  type TokenDataMap,
  TokenResolver,
  type UpdateTokenParams,
  type UpdateTokenResult,
} from "@src/processor";
export * as builders from "@src/processor/builders";
export { processTokenSets, processTokens } from "@src/processor/process";
export type { TokenData } from "@src/processor/utils/tokens";
