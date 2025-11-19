// Browser-compatible processor exports
// For Node.js file-based processing, use:
// import { processTokensFromFiles } from "@tokens-studio/tokenscript-interpreter/processor-node";

export {
  type FlattenCallback,
  flattenChildrenMap,
  flattenChildrenObject,
  type ProcessorOutput,
  type ProcessorResult,
  type TokenBuilder,
  TokenResolver,
} from "@src/processor";
export { processTokenSets, processTokens } from "@src/processor/process";
export type { TokenData } from "@src/processor/utils/tokens";
