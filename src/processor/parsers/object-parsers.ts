import type { Config } from "@interpreter/config";
import { NumberWithUnitSymbol } from "@interpreter/symbols";
import { isNumber, isObject, isString } from "@interpreter/utils/type";
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
export const numberWithUnitParser: ObjectParser = {
  predicate: (value: unknown): boolean => {
    if (!isObject(value)) return false;
    const obj = value as Record<string, unknown>;
    return (
      "value" in obj &&
      "unit" in obj &&
      isNumber(obj.value) &&
      isString(obj.unit) &&
      Object.keys(obj).length === 2
    );
  },
  toSymbol: (value: any, config?: Config): ISymbolType => {
    return new NumberWithUnitSymbol(value.value, value.unit, config);
  },
};

/**
 * Default object parsers used for structured token parsing.
 * These parsers are applied in order when converting JS values to interpreter symbols.
 */
export const defaultObjectParsers: ObjectParser[] = [numberWithUnitParser];
