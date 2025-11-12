import type { InterpreterResult } from "@interpreter/interpreter";
import { isTokenscriptSymbol, symbolTypeToJsValue } from "@interpreter/symbols";

export function serializeInterpreterResult(value: string | InterpreterResult): unknown {
  if (typeof value === "string") {
    return value;
  }
  if (value === null) {
    return null;
  }
  if (isTokenscriptSymbol(value)) {
    return symbolTypeToJsValue(value);
  }
  return value;
}

export function stringifyInterpreterResult(value: InterpreterResult): string {
  if (typeof value === "string") {
    return value;
  }
  if (isTokenscriptSymbol(value)) {
    return value.toString();
  }
  return String(value);
}
