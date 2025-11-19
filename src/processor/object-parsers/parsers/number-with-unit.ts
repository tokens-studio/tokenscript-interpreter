import type { Config } from "@interpreter/config";
import { NumberWithUnitSymbol } from "@interpreter/symbols";
import { isNumber, isObject, isString } from "@interpreter/utils/type";
import type { ISymbolType } from "@src/types";
import type { ObjectParser } from "..";

/**
 * Matches objects with shape { value: number, unit: string }.
 */
export const numberWithUnitParser: ObjectParser = {
  predicate: (value: unknown): boolean => {
    if (!isObject(value)) {
      return false;
    }
    const obj = value as Record<string, unknown>;
    return (
      "value" in obj &&
      "unit" in obj &&
      isNumber(obj.value) &&
      isString(obj.unit) &&
      Object.keys(obj).length === 2
    );
  },
  toSymbol: (value: any, config?: Config): ISymbolType =>
    new NumberWithUnitSymbol(value.value, value.unit, config),
};
