import type { interpreterResult } from "@interpreter/interpreter";
import { serializeInterpreterResult } from "./base";
import type { TokenBuilder } from "./types";

/**
 * Checks if a value is a plain object (not an array or null).
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Sets a nested value in an object using dot notation path.
 */
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
    if (!isPlainObject(cursor[key])) {
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

  onResolve(tokenName: string, value: interpreterResult): void {
    const serialized = serializeInterpreterResult(value);
    if (typeof serialized !== "undefined") {
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
