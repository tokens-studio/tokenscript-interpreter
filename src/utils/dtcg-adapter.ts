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
export function flattenTokens(
  tokenset: Record<string, unknown>,
  prefix = "",
): Record<string, string> {
  const flattenedTokens: Record<string, string> = {};

  for (const [key, node] of Object.entries(tokenset)) {
    // Skip DTCG metadata keys
    if (key.startsWith("$")) continue;

    if (typeof node === "object" && node !== null && !Array.isArray(node)) {
      if ("$value" in node) {
        // Standard DTCG format with $value
        const name = prefix ? `${prefix}.${key}` : key;
        // Ensure the value is always a string for the resolver
        flattenedTokens[name] = String((node as any).$value);
      } else if ("value" in node) {
        // Non-standard format with "value" (for compatibility)
        const name = prefix ? `${prefix}.${key}` : key;
        // Ensure the value is always a string for the resolver
        flattenedTokens[name] = String((node as any).value);
      } else {
        // This is a nested group - recurse
        const nested = flattenTokens(
          node as Record<string, unknown>,
          prefix ? `${prefix}.${key}` : key,
        );
        Object.assign(flattenedTokens, nested);
      }
    }
  }

  return flattenedTokens;
}

/**
 * Flattens a DTCG-structured tokens object while preserving all metadata.
 * Returns both flat tokens for processing and metadata for reconstruction.
 *
 * @param tokenset - The DTCG tokens object to flatten
 * @param prefix - Internal parameter for recursion (dot-separated path)
 * @returns Object with flat tokens and metadata
 *
 * @example
 * Input:  { "color": { "red": { "$value": "#FF0000", "$type": "color", "$description": "Red color" } } }
 * Output: { 
 *   flatTokens: { "color.red": "#FF0000" },
 *   metadata: { "color.red": { "$type": "color", "$description": "Red color" } }
 * }
 */
export function flattenTokensWithMetadata(
  tokenset: Record<string, unknown>,
  prefix = "",
): { flatTokens: Record<string, string>; metadata: Record<string, Record<string, any>> } {
  const flatTokens: Record<string, string> = {};
  const metadata: Record<string, Record<string, any>> = {};

  for (const [key, node] of Object.entries(tokenset)) {
    // Skip DTCG metadata keys
    if (key.startsWith("$")) continue;

    if (typeof node === "object" && node !== null && !Array.isArray(node)) {
      if ("$value" in node) {
        // This is a token with a value - extract both value and metadata
        const name = prefix ? `${prefix}.${key}` : key;
        const nodeObj = node as Record<string, any>;
        
        // Extract the value for processing
        flatTokens[name] = String(nodeObj.$value);
        
        // Extract all metadata (everything except $value)
        const tokenMetadata: Record<string, any> = {};
        for (const [metaKey, metaValue] of Object.entries(nodeObj)) {
          if (metaKey !== "$value") {
            tokenMetadata[metaKey] = metaValue;
          }
        }
        
        // Only store metadata if there is any
        if (Object.keys(tokenMetadata).length > 0) {
          metadata[name] = tokenMetadata;
        }
      } else if ("value" in node) {
        // Non-standard format with "value" - extract both value and metadata
        const name = prefix ? `${prefix}.${key}` : key;
        const nodeObj = node as Record<string, any>;
        
        // Extract the value for processing
        flatTokens[name] = String(nodeObj.value);
        
        // Extract all metadata (everything except value)
        const tokenMetadata: Record<string, any> = {};
        for (const [metaKey, metaValue] of Object.entries(nodeObj)) {
          if (metaKey !== "value") {
            tokenMetadata[metaKey] = metaValue;
          }
        }
        
        // Only store metadata if there is any
        if (Object.keys(tokenMetadata).length > 0) {
          metadata[name] = tokenMetadata;
        }
      } else {
        // This is a nested group - recurse
        const nested = flattenTokensWithMetadata(
          node as Record<string, unknown>,
          prefix ? `${prefix}.${key}` : key,
        );
        Object.assign(flatTokens, nested.flatTokens);
        Object.assign(metadata, nested.metadata);
      }
    }
  }

  return { flatTokens, metadata };
}

// Cache for flattened tokens and metadata to avoid redundant processing
const flattenedTokensCache = new Map<string, Record<string, string>>();

/**
 * Clears the flattening caches. Call this when processing a new set of token files
 * to prevent memory leaks and ensure fresh processing.
 */
export function clearFlatteningCaches(): void {
  flattenedTokensCache.clear();
}

/**
 * Handles theme-based DTCG processing by extracting tokens from selected token sets.
 * Uses caching to avoid redundant processing when multiple themes share token sets.
 *
 * @param dtcgJson - Complete DTCG JSON with themes
 * @param theme - Theme object with selectedTokenSets
 * @returns Object with flat tokens only (metadata removed to align with Python implementation)
 */
export function extractThemeTokens(
  dtcgJson: Record<string, any>,
  theme: any,
): { flatTokens: Record<string, string> } {
  const flatTokens: Record<string, string> = {};
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

          // Merge cached results into theme tokens
          for (const [tokenName, tokenValue] of Object.entries(cachedFlatTokens)) {
            flatTokens[tokenName] = tokenValue;
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

          // Merge cached results into theme tokens
          for (const [tokenName, tokenValue] of Object.entries(cachedFlatTokens)) {
            flatTokens[tokenName] = tokenValue;
          }
        }
      }
    }
  }

  return { flatTokens };
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
      !key.startsWith("$"),
  );
}
