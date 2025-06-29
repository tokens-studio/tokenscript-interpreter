/**
 * DTCG Adapter Module
 *
 * This module provides utilities for converting between DTCG format and the flat
 * key-value format expected by the core TokenSetResolver. This separation allows
 * the core resolution engine to remain format-agnostic while supporting DTCG
 * as a "layer on top".
 */

/**
 * Flattens a DTCG-structured tokens object into a simple key-value map.
 * This is the primary input adapter for the core resolver.
 *
 * @param tokenset - The DTCG tokens object to flatten
 * @param prefix - Internal parameter for recursion (dot-separated path)
 * @returns A flat Record<string, string> suitable for TokenSetResolver
 *
 * @example
 * Input:  { "color": { "red": { "$value": "#FF0000", "$type": "color" } } }
 * Output: { "color.red": "#FF0000" }
 */
export function flattenTokens(tokenset: any, prefix = ""): Record<string, string> {
  const flattenedTokens: Record<string, string> = {};

  for (const [key, node] of Object.entries(tokenset)) {
    // Skip DTCG metadata keys
    if (key.startsWith("$")) continue;

    if (typeof node === "object" && node !== null && !Array.isArray(node)) {
      if ("$value" in node) {
        // This is a token with a value - extract it
        const name = prefix ? `${prefix}.${key}` : key;
        // Ensure the value is always a string for the resolver
        flattenedTokens[name] = String((node as any).$value);
      } else {
        // This is a nested group - recurse
        const nested = flattenTokens(node, prefix ? `${prefix}.${key}` : key);
        Object.assign(flattenedTokens, nested);
      }
    }
  }

  return flattenedTokens;
}

/**
 * Collects the full DTCG metadata for each token, keyed by its flat name.
 * Used for re-hydrating the output back to DTCG format.
 *
 * @param tokenset - The DTCG tokens object to collect metadata from
 * @param prefix - Internal parameter for recursion (dot-separated path)
 * @returns A Record mapping flat token names to their complete DTCG metadata
 *
 * @example
 * Input:  { "color": { "red": { "$value": "#FF0000", "$type": "color" } } }
 * Output: { "color.red": { "$value": "#FF0000", "$type": "color" } }
 */
export function collectTokenMetadata(tokenset: any, prefix = ""): Record<string, any> {
  const metadata: Record<string, any> = {};

  for (const [key, node] of Object.entries(tokenset)) {
    // Skip DTCG metadata keys
    if (key.startsWith("$")) continue;

    if (typeof node === "object" && node !== null && !Array.isArray(node)) {
      const name = prefix ? `${prefix}.${key}` : key;
      if ("$value" in node) {
        // This is a token - store its complete metadata
        metadata[name] = { ...node };
      } else {
        // This is a nested group - recurse
        const nested = collectTokenMetadata(node, name);
        Object.assign(metadata, nested);
      }
    }
  }

  return metadata;
}

/**
 * Re-hydrates a flat map of resolved tokens back into a DTCG structure,
 * using the original metadata.
 *
 * @param resolvedTokens - Flat map of resolved token values from TokenSetResolver
 * @param originalMetadata - Original DTCG metadata collected during input processing
 * @returns A DTCG-formatted object with resolved values and preserved metadata
 *
 * @example
 * resolvedTokens: { "color.red": "#FF0000" }
 * originalMetadata: { "color.red": { "$value": "{color.base}", "$type": "color" } }
 * Output: { "color.red": { "$value": "#FF0000", "$type": "color" } }
 */
export function rehydrateToDTCG(
  resolvedTokens: Record<string, any>,
  originalMetadata: Record<string, any>
): Record<string, any> {
  const dtcgTokens: Record<string, any> = {};

  for (const [tokenName, metadata] of Object.entries(originalMetadata)) {
    const resolvedValue = resolvedTokens[tokenName];

    dtcgTokens[tokenName] = {
      ...metadata,
      $value:
        resolvedValue && typeof resolvedValue === "object" && "toString" in resolvedValue
          ? resolvedValue.toString()
          : (resolvedValue ?? metadata.$value),
    };
  }

  return dtcgTokens;
}

// Cache for flattened tokens and metadata to avoid redundant processing
const flattenedTokensCache = new Map<string, Record<string, string>>();
const metadataCache = new Map<string, Record<string, any>>();

/**
 * Clears the flattening caches. Call this when processing a new set of token files
 * to prevent memory leaks and ensure fresh processing.
 */
export function clearFlatteningCaches(): void {
  flattenedTokensCache.clear();
  metadataCache.clear();
}

/**
 * Handles theme-based DTCG processing by extracting tokens from selected token sets.
 * Uses caching to avoid redundant processing when multiple themes share token sets.
 *
 * @param dtcgJson - Complete DTCG JSON with themes
 * @param theme - Theme object with selectedTokenSets
 * @returns Object with flat tokens and metadata for the theme
 */
export function extractThemeTokens(
  dtcgJson: Record<string, any>,
  theme: any
): { flatTokens: Record<string, string>; metadata: Record<string, any> } {
  const flatTokens: Record<string, string> = {};
  const metadata: Record<string, any> = {};
  const selectedTokenSets = theme.selectedTokenSets;

  if (Array.isArray(selectedTokenSets)) {
    // New format: array of objects with id and status
    for (const tokenSetRef of selectedTokenSets) {
      if (tokenSetRef.status === "enabled" || tokenSetRef.status === "source") {
        const setId = tokenSetRef.id;
        if (setId in dtcgJson) {
          const setData = dtcgJson[setId];

          // Check cache first, flatten only if not cached
          let cachedFlatTokens = flattenedTokensCache.get(setId);
          if (!cachedFlatTokens) {
            cachedFlatTokens = flattenTokens(setData);
            flattenedTokensCache.set(setId, cachedFlatTokens);
          }

          let cachedMetadata = metadataCache.get(setId);
          if (!cachedMetadata) {
            cachedMetadata = collectTokenMetadata(setData);
            metadataCache.set(setId, cachedMetadata);
          }

          // Merge cached results into theme tokens
          for (const [tokenName, tokenValue] of Object.entries(cachedFlatTokens)) {
            flatTokens[tokenName] = tokenValue;
          }
          for (const [metaName, metaValue] of Object.entries(cachedMetadata)) {
            metadata[metaName] = metaValue;
          }
        }
      }
    }
  } else {
    // Old format: object with key-value pairs
    for (const [setName, status] of Object.entries(selectedTokenSets)) {
      if (status === "enabled" || status === "source") {
        if (setName in dtcgJson) {
          const setData = dtcgJson[setName];

          // Check cache first, flatten only if not cached
          let cachedFlatTokens = flattenedTokensCache.get(setName);
          if (!cachedFlatTokens) {
            cachedFlatTokens = flattenTokens(setData);
            flattenedTokensCache.set(setName, cachedFlatTokens);
          }

          let cachedMetadata = metadataCache.get(setName);
          if (!cachedMetadata) {
            cachedMetadata = collectTokenMetadata(setData);
            metadataCache.set(setName, cachedMetadata);
          }

          // Merge cached results into theme tokens
          for (const [tokenName, tokenValue] of Object.entries(cachedFlatTokens)) {
            flatTokens[tokenName] = tokenValue;
          }
          for (const [metaName, metaValue] of Object.entries(cachedMetadata)) {
            metadata[metaName] = metaValue;
          }
        }
      }
    }
  }

  return { flatTokens, metadata };
}

/**
 * Detects if a JSON object has DTCG nested structure (vs flat tokens).
 *
 * @param json - JSON object to analyze
 * @returns true if the object has nested DTCG structure
 */
export function hasNestedDTCGStructure(json: Record<string, any>): boolean {
  return Object.keys(json).some(
    (key) =>
      typeof json[key] === "object" &&
      json[key] !== null &&
      !Array.isArray(json[key]) &&
      !key.startsWith("$")
  );
}

/**
 * Converts flat tokens to DTCG format (for cases where input was already flat).
 *
 * @param flatTokens - Flat token map
 * @returns DTCG-formatted tokens with $value properties
 */
export function flatTokensToDTCG(flatTokens: Record<string, any>): Record<string, any> {
  const dtcgTokens: Record<string, any> = {};

  for (const [key, value] of Object.entries(flatTokens)) {
    const resolvedValue =
      value && typeof value === "object" && "toString" in value ? value.toString() : value;

    dtcgTokens[key] = {
      $value: resolvedValue,
    };
  }

  return dtcgTokens;
}
