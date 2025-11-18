// Builders
export {
  type BuilderFormat,
  FlatObjectBuilder,
  type FlattenCallback,
  flattenChildrenMap,
  flattenChildrenObject,
  type JsValue,
  MapBuilder,
  NestedObjectBuilder,
  type OutputFormat,
  serializeInterpreterResult,
  stringifyInterpreterResult,
  stringifyOutput,
  symbolTypeToJsValue,
  type TokenBuilder,
  toJsonSafe,
} from "./builders";
export { DependencyError } from "./errors";
export { processTokenSets, processTokens } from "./process";
// Note: collectJsonFiles, normalizeJsonFiles, and processTokensFromFiles are Node.js-only
// and should be imported from "@tokens-studio/tokenscript-interpreter/processor-node"
export type { ProcessorOutput, ProcessorResult } from "./resolver/TokenResolver";
export { TokenResolver } from "./resolver/TokenResolver";
export type {
  ProcessFilesOptions,
  ProcessOptions,
  ProcessResult,
  ProcessSetsOptions,
} from "./types";
