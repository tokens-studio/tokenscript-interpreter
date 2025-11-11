import { MapBuilder } from "./MapBuilder";
import { FlatObjectBuilder, NestedObjectBuilder } from "./ObjectBuilder";
import type { BuilderFormat, TokenBuilder } from "./types";

export { type JsValue, symbolTypeToJsValue } from "@interpreter/symbols";
export { serializeInterpreterResult, stringifyInterpreterResult } from "./base";
export { MapBuilder } from "./MapBuilder";
export { FlatObjectBuilder, NestedObjectBuilder } from "./ObjectBuilder";
export type { BuilderFormat, TokenBuilder } from "./types";

/**
 * Gets a builder by format name
 *
 * @param format - The builder format to retrieve
 * @returns The requested builder
 */
export function getBuilder(format: BuilderFormat): TokenBuilder {
  switch (format) {
    case "nested":
      return new NestedObjectBuilder();
    case "flat":
      return new FlatObjectBuilder();
    case "map":
      return new MapBuilder("symbols");
    default:
      throw new Error(`Unknown builder format: ${format}`);
  }
}

/**
 * Gets the default builder (map with string output)
 *
 * @param outputFormat - Whether to output symbols or strings
 * @returns The default map builder
 */
export function getDefaultBuilder(outputFormat: "string" | "symbols" = "string"): TokenBuilder {
  return new MapBuilder(outputFormat);
}

/**
 * Checks if a format is supported
 *
 * @param format - The format to check
 * @returns True if the format is supported
 */
export function isValidBuilderFormat(format: string): format is BuilderFormat {
  return format === "nested" || format === "flat" || format === "map";
}

/**
 * Gets all available builder formats
 *
 * @returns Array of available format names
 */
export function getAvailableFormats(): BuilderFormat[] {
  return ["nested", "flat", "map"];
}
