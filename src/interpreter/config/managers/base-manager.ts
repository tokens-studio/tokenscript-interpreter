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
   * Parse semantic version from URI
   * Example: "/api/v1/schema/srgb-color/0.0.1/" -> { major: 0, minor: 0, patch: 1 }
   */
  protected parseSemverFromUri(uri: uri): { major: number; minor: number; patch: number } | null {
    const semverMatch = uri.match(/\/(\d+)\.(\d+)\.(\d+)\//);
    if (semverMatch) {
      return {
        major: parseInt(semverMatch[1], 10),
        minor: parseInt(semverMatch[2], 10),
        patch: parseInt(semverMatch[3], 10),
      };
    }

    // Also handle single number versions like "/0/" or "/1/"
    const singleVersionMatch = uri.match(/\/(\d+)\//);
    if (singleVersionMatch) {
      return {
        major: parseInt(singleVersionMatch[1], 10),
        minor: 0,
        patch: 0,
      };
    }

    return null;
  }

  /**
   * Get base URI without version
   * Example: "/api/v1/schema/srgb-color/0.0.1/" -> "/api/v1/schema/srgb-color/"
   */
  protected getBaseUri(uri: uri): uri {
    return uri.replace(/\/(?:\d+(?:\.\d+)?(?:\.\d+)?|latest)\/$/, "/");
  }

  /**
   * Generate version resolution candidates from most specific to least specific
   * Example: "0.0.1" -> ["0.0.1", "0.0", "0", "latest"]
   */
  protected generateVersionCandidates(uri: uri): uri[] {
    const baseUri = this.getBaseUri(uri);
    const candidates: uri[] = [];

    // First try the original URI as-is
    candidates.push(uri);

    // If it's already a /latest/ URI, only try that
    if (uri.includes("/latest/")) {
      return candidates;
    }

    const version = this.parseSemverFromUri(uri);
    if (version) {
      // Try progressively less specific versions
      if (version.patch > 0) {
        candidates.push(`${baseUri}${version.major}.${version.minor}/`);
      }
      if (version.minor > 0 || version.patch > 0) {
        candidates.push(`${baseUri}${version.major}/`);
      }
    }

    // Finally try /latest/
    candidates.push(`${baseUri}latest/`);

    return candidates;
  }

  /**
   * Find the latest (highest) semantic version for a base URI
   */
  protected findLatestVersion(baseUri: uri): uri | null {
    const basePattern = baseUri.replace(/\/$/, "");
    let latestVersion: { major: number; minor: number; patch: number } | null = null;
    let latestUri: uri | null = null;

    for (const [specUri] of this.specs) {
      if (specUri.startsWith(basePattern)) {
        const version = this.parseSemverFromUri(specUri);
        if (version) {
          if (!latestVersion || this.compareVersions(version, latestVersion) > 0) {
            latestVersion = version;
            latestUri = specUri;
          }
        }
      }
    }

    return latestUri;
  }

  /**
   * Compare two semantic versions
   * Returns: 1 if a > b, -1 if a < b, 0 if equal
   */
  protected compareVersions(
    a: { major: number; minor: number; patch: number },
    b: { major: number; minor: number; patch: number },
  ): number {
    if (a.major !== b.major) return a.major - b.major;
    if (a.minor !== b.minor) return a.minor - b.minor;
    return a.patch - b.patch;
  }

  /**
   * Resolve URI by trying version candidates from most specific to least specific
   */
  protected resolveVersionUri(uri: uri): uri | null {
    // Handle /latest/ URIs specifically
    if (uri.includes("/latest/")) {
      const baseUri = this.getBaseUri(uri);
      return this.findLatestVersion(baseUri);
    }

    const candidates = this.generateVersionCandidates(uri);

    for (const candidate of candidates) {
      if (this.specs.has(candidate)) {
        return candidate;
      }

      // If we hit a /latest/ candidate, resolve it
      if (candidate.includes("/latest/")) {
        const baseUri = this.getBaseUri(candidate);
        const latestUri = this.findLatestVersion(baseUri);
        if (latestUri) {
          return latestUri;
        }
      }
    }

    return null;
  }

  /**
   * Find a conversion path from source to target format using BFS with version resolution
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

      // Find all possible conversion sources that could work for the current URI
      const possibleSources: uri[] = [current];

      // Add the resolved version of current URI
      const resolvedCurrent = this.resolveVersionUri(current);
      if (resolvedCurrent && resolvedCurrent !== current) {
        possibleSources.push(resolvedCurrent);
      }

      // Also check if there are registered conversions that could resolve TO our current URI
      for (const [registeredSource] of this.conversions) {
        const registeredSourceResolved = this.resolveVersionUri(registeredSource);
        if (registeredSourceResolved === current || registeredSource === current) {
          possibleSources.push(registeredSource);
        }
      }

      // Remove duplicates
      const uniqueSources = Array.from(new Set(possibleSources));

      for (const sourceToCheck of uniqueSources) {
        const availableConversions = this.conversions.get(sourceToCheck);
        if (!availableConversions) continue;

        for (const nextFormat of availableConversions.keys()) {
          // Try to resolve the conversion target to see if it matches our target
          const resolvedNext = this.resolveVersionUri(nextFormat);
          const resolvedTargetUri = this.resolveVersionUri(targetUri);

          // Check if resolved next matches resolved target
          if (resolvedNext && resolvedTargetUri && resolvedNext === resolvedTargetUri) {
            return [...path, nextFormat];
          }

          // Also check normalized versions for BFS continuation
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
    }

    return [];
  }

  /**
   * Check if a conversion path exists between source and target URIs with version resolution
   */
  public hasConversion(sourceUri: uri, targetUri: uri): boolean {
    // Try exact URIs first
    if (this.conversions.get(sourceUri)?.has(targetUri)) {
      return true;
    }

    // Resolve source and target URIs
    const resolvedSourceUri = this.resolveVersionUri(sourceUri) || sourceUri;
    const resolvedTargetUri = this.resolveVersionUri(targetUri) || targetUri;

    // Try with resolved URIs
    if (this.conversions.get(resolvedSourceUri)?.has(resolvedTargetUri)) {
      return true;
    }

    // Check if there's a conversion from the resolved source to any URI that could resolve to our target
    const sourceConversions = this.conversions.get(resolvedSourceUri);
    if (sourceConversions) {
      for (const registeredTargetUri of sourceConversions.keys()) {
        // Check if the registered conversion target resolves to the same URI as our requested target
        const resolvedRegisteredTarget =
          this.resolveVersionUri(registeredTargetUri) || registeredTargetUri;
        if (resolvedRegisteredTarget === resolvedTargetUri) {
          return true;
        }
      }
    }

    const conversionPath = this.findConversionPath(resolvedSourceUri, resolvedTargetUri);
    return conversionPath.length > 0;
  }

  /**
   * Get a specification by its URI with version resolution
   */
  public getSpec(uri: uri): TSpec | undefined {
    // First try exact match
    const exactMatch = this.specs.get(uri);
    if (exactMatch) {
      return exactMatch;
    }

    // Try version resolution
    const resolvedUri = this.resolveVersionUri(uri);
    if (resolvedUri) {
      return this.specs.get(resolvedUri);
    }

    return undefined;
  }

  /**
   * Convert input through a chain of conversions to reach the target URI with version resolution
   */
  protected convertThroughPath(input: TInput, sourceUri: uri, targetUri: uri): TOutput {
    // Resolve URIs with version fallback
    const resolvedSourceUri = this.resolveVersionUri(sourceUri) || sourceUri;
    const resolvedTargetUri = this.resolveVersionUri(targetUri) || targetUri;

    if (resolvedSourceUri === resolvedTargetUri) {
      return input as unknown as TOutput;
    }

    // Try direct conversion first with resolved URIs
    const directConversionFn = this.conversions.get(resolvedSourceUri)?.get(resolvedTargetUri);
    if (directConversionFn) {
      return directConversionFn(input);
    }

    // If no direct conversion, find a path through intermediate conversions
    const conversionPath = this.findConversionPath(resolvedSourceUri, resolvedTargetUri);
    if (conversionPath.length === 0) {
      throw new Error(`No conversion path found from '${sourceUri}' to '${targetUri}'`);
    }

    // Execute the conversion chain with version resolution
    let current = input;
    for (let i = 0; i < conversionPath.length - 1; i++) {
      const fromUri = conversionPath[i];
      const toUri = conversionPath[i + 1];

      // Try to find conversion function using version resolution
      let conversionFn = this.conversions.get(fromUri)?.get(toUri);

      if (!conversionFn) {
        // Try with resolved URIs
        const resolvedFromUri = this.resolveVersionUri(fromUri) || fromUri;
        const resolvedToUri = this.resolveVersionUri(toUri) || toUri;

        conversionFn = this.conversions.get(resolvedFromUri)?.get(resolvedToUri);

        if (!conversionFn) {
          // Try to find conversion by checking all registered conversions that could match
          const fromConversions = this.conversions.get(resolvedFromUri);
          if (fromConversions) {
            for (const [registeredToUri, registeredFn] of fromConversions) {
              const resolvedRegisteredTo =
                this.resolveVersionUri(registeredToUri) || registeredToUri;
              if (resolvedRegisteredTo === resolvedToUri) {
                conversionFn = registeredFn;
                break;
              }
            }
          }

          // If still not found, check if there are conversions from other URIs that resolve to our fromUri
          if (!conversionFn) {
            for (const [registeredFromUri, conversions] of this.conversions) {
              const resolvedRegisteredFrom =
                this.resolveVersionUri(registeredFromUri) || registeredFromUri;
              if (resolvedRegisteredFrom === resolvedFromUri) {
                for (const [registeredToUri, registeredFn] of conversions) {
                  const resolvedRegisteredTo =
                    this.resolveVersionUri(registeredToUri) || registeredToUri;
                  if (resolvedRegisteredTo === resolvedToUri) {
                    conversionFn = registeredFn;
                    break;
                  }
                }
                if (conversionFn) break;
              }
            }
          }
        }
      }

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
