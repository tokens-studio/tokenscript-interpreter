import type { InterpreterResult } from "@interpreter/interpreter";
import { isObject } from "@/src/interpreter/utils/type";
import { serializeInterpreterResult } from "./base";
import { flattenChildrenObject } from "./flatten";
import type { TokenBuilder } from "./types";

function setNestedValue(target: Record<string, unknown>, path: string, value: unknown): void {
  if (path.length === 0) {
    return;
  }
  const segments = path.split(".");
  let cursor: Record<string, unknown> = target;
  for (let i = 0; i < segments.length; i++) {
    const key = segments[i];
    const isLast = i === segments.length - 1;
    if (isLast) {
      cursor[key] = value;
      return;
    }
    if (!isObject(cursor[key])) {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  }
}

/**
 * Nested Object Builder
 *
 * Builds a nested object structure incrementally as tokens are resolved.
 * Converts flat token paths to nested structure.
 * Example: "color.primary" -> { color: { primary: value } }
 */
export class NestedObjectBuilder implements TokenBuilder<Record<string, unknown>> {
  readonly name = "nested";
  private result: Record<string, unknown> = {};

  onResolve(tokenName: string, value: InterpreterResult): void {
    const serialized = serializeInterpreterResult(value, { stringify: true });
    if (typeof serialized !== "undefined") {
      setNestedValue(this.result, tokenName, serialized);
    }
  }

  onError(tokenName: string, _error: Error, originalValue: string | unknown): void {
    // Store original value for failed tokens
    setNestedValue(this.result, tokenName, originalValue);
  }

  getResult(): Record<string, unknown> {
    return this.result;
  }
}

/**
 * Flat Object Builder
 *
 * Builds a flat key-value object incrementally as tokens are resolved.
 * Example: "color.primary" -> { "color.primary": value }
 */
export class FlatObjectBuilder implements TokenBuilder<Record<string, unknown>> {
  readonly name = "flat";
  private result: Record<string, unknown> = {};

  onResolve(tokenName: string, value: InterpreterResult): void {
    // First try to flatten the InterpreterResult directly (handles Dictionary symbols)
    let didFlatten = false;
    flattenChildrenObject(value, tokenName, (key, val) => {
      didFlatten = true;
      this.result[key] = serializeInterpreterResult(val, { stringify: true });
    });

    // If nothing was flattened, serialize and store the value directly
    if (!didFlatten) {
      const serialized = serializeInterpreterResult(value, { stringify: true });
      if (typeof serialized !== "undefined") {
        this.result[tokenName] = serialized;
      }
    }
  }

  onError(tokenName: string, _error: Error, originalValue: string | unknown): void {
    // Store original value for failed tokens
    this.result[tokenName] = originalValue;
  }

  getResult(): Record<string, unknown> {
    return this.result;
  }
}
