// Browser-compatible processor exports
// For Node.js file-based processing, use:
// import { processTokensFromFiles } from "@tokens-studio/tokenscript-interpreter/processor-node";

export {
  type CreateTokenParams,
  type CreateTokenResult,
  type DeleteTokenParams,
  type DeleteTokenResult,
  type FlattenCallback,
  flattenChildrenMap,
  flattenChildrenObject,
  type ProcessorOutput,
  type ProcessorResult,
  type TokenBuilder,
  TokenResolver,
  type UpdateTokenParams,
  type UpdateTokenResult,
} from "@src/processor";
export { processTokenSets, processTokens } from "@src/processor/process";
export type { TokenData } from "@src/processor/utils/tokens";
