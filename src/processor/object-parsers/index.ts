import type { Config } from "@interpreter/config";
import type { ISymbolType } from "@src/types";

/**
 * ObjectParser allows custom transformation of structured values into interpreter symbols.
 * This is useful for parsing complex nested structures like { value: 1, unit: "rem" } into NumberWithUnitSymbol.
 *
 * @example
 * const numberWithUnitParser: ObjectParser = {
 *   predicate: (value) => isObject(value) && 'value' in value && 'unit' in value,
 *   toSymbol: ({ value, unit }, config) => new NumberWithUnitSymbol(value, unit, config)
 * }
 */
export type ObjectParser = {
  /**
   * Check if this parser should handle the given value
   */
  predicate: (value: unknown) => boolean;

  /**
   * Convert the matched value to an interpreter symbol
   */
  toSymbol: (value: any, config?: Config) => ISymbolType;
};

/**
 * Default object parser for NumberWithUnit structures.
 * Matches objects with { value: number, unit: string } shape.
 *
 * @example
 * numberWithUnitParser.predicate({ value: 1, unit: "rem" }) // true
 * numberWithUnitParser.toSymbol({ value: 1, unit: "rem" }) // NumberWithUnitSymbol(1, "rem")
 */
export { defaultObjectParsers } from "./default-object-parsers";
export { numberWithUnitParser } from "./parsers/number-with-unit";
export {
  createTokenSymbol,
  createTokenSymbolFromResolvedFields,
  parseValueToSymbol,
} from "./symbol-conversion";
