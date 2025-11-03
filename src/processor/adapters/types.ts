/**
 * Core adapter type - converts any input format to flat token map
 */
export type TokenAdapter<TInput = any> = (input: TInput) => Map<string, string>;

/**
 * Configuration options for adapters
 */
export interface AdapterOptions {
  /** Optional prefix to add to all token names */
  prefix?: string;
  /** Whether to skip tokens starting with $ */
  skipMetadata?: boolean;
}
