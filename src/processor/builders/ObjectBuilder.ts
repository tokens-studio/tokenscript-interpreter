import type { interpreterResult } from "@interpreter/interpreter";
import { isObject } from "@/src/interpreter/utils/type";
import { serializeInterpreterResult } from "./base";
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

  onResolve(tokenName: string, value: interpreterResult): void {
    const serialized = serializeInterpreterResult(value);
    if (typeof serialized !== "undefined") {
      setNestedValue(this.result, tokenName, serialized);
    }
  }

  onError(tokenName: string, _error: Error, originalValue: string): void {
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

  private flattenObject(obj: Record<string, unknown>, prefix: string): void {
    for (const key in obj) {
      // Check for own properties to avoid iterating prototype chain
      if (Object.hasOwn(obj, key)) {
        const value = obj[key];
        const newKey = `${prefix}.${key}`;

        if (typeof value === "undefined") {
          continue; // Skip undefined values
        }

        // Recurse if it's a plain object, otherwise assign
        if (isObject(value)) {
          this.flattenObject(value as Record<string, unknown>, newKey);
        } else {
          this.result[newKey] = value;
        }
      }
    }
  }

  onResolve(tokenName: string, value: interpreterResult): void {
    const serialized = serializeInterpreterResult(value);

    if (typeof serialized === "undefined") {
      return;
    }

    if (isObject(serialized)) {
      this.flattenObject(serialized as Record<string, unknown>, tokenName);
    } else {
      this.result[tokenName] = serialized;
    }
  }
  onError(tokenName: string, _error: Error, originalValue: string): void {
    // Store original value for failed tokens
    this.result[tokenName] = originalValue;
  }

  getResult(): Record<string, unknown> {
    return this.result;
  }
}
