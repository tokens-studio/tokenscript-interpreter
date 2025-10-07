import type { Config } from "../config";

type uri = string;
type specType = string;

/**
 * Base manager class that provides common functionality for managing specifications,
 * conversions, and BFS-based conversion path resolution.
 */
export abstract class BaseManager<TSpec, TInput, TOutput> {
  protected specs: Map<uri, TSpec> = new Map();
  protected specTypes: Map<uri, specType> = new Map();
  protected conversions: Map<uri, Map<uri, (input: TInput) => TOutput>> = new Map();
  protected parentConfig?: Config;

  protected removeVersionFromUri(uri: uri): uri {
    return uri.replace(/\/\d+\/$/, "/");
  }

  /**
   * Find a conversion path from source to target format using BFS
   */
  protected findConversionPath(sourceUri: uri, targetUri: uri): uri[] {
    const normalizedSource = this.removeVersionFromUri(sourceUri);
    const normalizedTarget = this.removeVersionFromUri(targetUri);

    if (normalizedSource === normalizedTarget) {
      return [sourceUri];
    }

    const visited = new Set<uri>([normalizedSource]);
    const queue: Array<[uri, uri[]]> = [[sourceUri, [sourceUri]]];

    while (queue.length > 0) {
      const shifted = queue.shift();
      if (!shifted) break;
      const [current, path] = shifted;

      const availableConversions = this.conversions.get(current);
      if (!availableConversions) continue;

      for (const nextFormat of availableConversions.keys()) {
        const normalizedNext = this.removeVersionFromUri(nextFormat);

        if (normalizedNext === normalizedTarget) {
          return [...path, nextFormat];
        }

        if (!visited.has(normalizedNext)) {
          visited.add(normalizedNext);
          queue.push([nextFormat, [...path, nextFormat]]);
        }
      }
    }

    return [];
  }

  /**
   * Check if a conversion path exists between source and target URIs
   */
  public hasConversion(sourceUri: uri, targetUri: uri): boolean {
    if (this.conversions.get(sourceUri)?.has(targetUri)) {
      return true;
    }
    const conversionPath = this.findConversionPath(sourceUri, targetUri);
    return conversionPath.length > 0;
  }

  /**
   * Get a specification by its URI
   */
  public getSpec(uri: uri): TSpec | undefined {
    return this.specs.get(uri);
  }

  /**
   * Convert input through a chain of conversions to reach the target URI
   */
  protected convertThroughPath(input: TInput, sourceUri: uri, targetUri: uri): TOutput {
    if (sourceUri === targetUri) {
      return input as unknown as TOutput;
    }

    // Try direct conversion first
    const directConversionFn = this.conversions.get(sourceUri)?.get(targetUri);
    if (directConversionFn) {
      return directConversionFn(input);
    }

    // If no direct conversion, find a path through intermediate conversions
    const conversionPath = this.findConversionPath(sourceUri, targetUri);
    if (conversionPath.length === 0) {
      throw new Error(`No conversion path found from '${sourceUri}' to '${targetUri}'`);
    }

    // Execute the conversion chain
    let current = input;
    for (let i = 0; i < conversionPath.length - 1; i++) {
      const fromUri = conversionPath[i];
      const toUri = conversionPath[i + 1];

      const conversionFn = this.conversions.get(fromUri)?.get(toUri);
      if (!conversionFn) {
        throw new Error(
          `Missing conversion step from '${fromUri}' to '${toUri}' in conversion path`,
        );
      }

      current = conversionFn(current) as unknown as TInput;
    }

    return current as unknown as TOutput;
  }

  /**
   * Register a conversion function between two URIs
   */
  protected registerConversionFunction(
    sourceUri: uri,
    targetUri: uri,
    conversionFn: (input: TInput) => TOutput,
  ): void {
    if (!this.conversions.has(sourceUri)) {
      this.conversions.set(sourceUri, new Map());
    }

    const sourceMap = this.conversions.get(sourceUri);
    if (sourceMap) {
      sourceMap.set(targetUri, conversionFn);
    }
  }

  public abstract register(uri: uri, spec: TSpec | specType): TSpec;

  protected abstract getSpecName(spec: TSpec): string;

  /**
   * Abstract method for creating a clone of the manager
   */
  public abstract clone(): this;

  /**
   * Set the parent config reference
   */
  public setParentConfig(config: Config) {
    this.parentConfig = config;
  }

  /**
   * Get the parent config reference
   */
  public getParentConfig() {
    return this.parentConfig;
  }

  /**
   * Creates interpreter configuration with full context for conversion functions and initializers.
   * Uses parent config if available to provide access to all managers and registrations.
   */
  protected createInterpreterConfig(references: Record<string, any>): {
    references: Record<string, any>;
    config?: Config;
  } {
    if (!this.parentConfig) {
      return { references };
    }

    // Use the parent config directly to ensure all registrations are available
    return {
      references,
      config: this.parentConfig,
    };
  }
}
