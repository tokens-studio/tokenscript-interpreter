import type { Config } from "@interpreter/config";
import { NumberWithUnitSymbol } from "@interpreter/symbols";
import { isNumber, isObject, isString } from "@interpreter/utils/type";
import type { ISymbolType } from "@src/types";
import type { ObjectParser } from ".";

/**
 * Default object parser for NumberWithUnit structures.
 * Matches objects with { value: number, unit: string } shape.
 *
 * @example
 * numberWithUnitParser.predicate({ value: 1, unit: "rem" }) // true
 * numberWithUnitParser.toSymbol({ value: 1, unit: "rem" }) // NumberWithUnitSymbol(1, "rem")
 */
export const numberWithUnitParser: ObjectParser = {
  predicate: (value: unknown): boolean =>
    isObject(value) &&
    "value" in value &&
    "unit" in value &&
    isNumber(value.value) &&
    isString(value.unit),
  toSymbol: (value: any, config?: Config): ISymbolType =>
    new NumberWithUnitSymbol(value.value, value.unit, config),
};
