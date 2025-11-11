import type { interpreterResult } from "@interpreter/interpreter";

/**
 * Token builder interface for constructing output structures incrementally.
 * Builders receive resolved tokens one at a time via onResolve callbacks
 * and build their target structure (nested, flat, ClojureScript map, etc.) progressively.
 */
export interface TokenBuilder<T = unknown> {
  /**
   * Called when a token is successfully resolved.
   * The builder should add this token to its internal structure.
   *
   * @param tokenName - The token path/name
   * @param value - The resolved interpreter result
   */
  onResolve(tokenName: string, value: interpreterResult): void;

  /**
   * Called when a token fails to resolve.
   * The builder can choose to store the error or original value.
   *
   * @param tokenName - The token path/name
   * @param error - The error that occurred
   * @param originalValue - The original token value string
   */
  onError(tokenName: string, error: Error, originalValue: string): void;

  /**
   * Returns the final built structure.
   *
   * @returns The built output structure
   */
  getResult(): T;

  /**
   * The name/identifier of this builder
   */
  readonly name: string;
}

/**
 * Registry of available builder formats
 */
export type BuilderFormat = "nested" | "flat" | "map";
