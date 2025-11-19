import type { Config } from "@interpreter/config";
import type { ISymbolType } from "@src/types";

/**
 * ObjectParser allows custom transformation of structured values into interpreter symbols.
 *
 * @example
 * const numberWithUnitParser: ObjectParser = {
 *   predicate: (value) => isObject(value) && 'value' in value && 'unit' in value,
 *   toSymbol: ({ value, unit }, config) => new NumberWithUnitSymbol(value, unit, config)
 * }
 */
export type ObjectParser = {
  predicate: (value: unknown) => boolean;
  toSymbol: (value: any, config?: Config) => ISymbolType;
};
