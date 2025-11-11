import type { RefPath } from "./types";

/**
 * Optimizes prefix extraction by caching results.
 *
 * Instead of repeatedly computing prefix paths by scanning for dots,
 * this class caches the computed results to avoid redundant string operations.
 */
export class PrefixExtractor {
  private readonly prefixCache = new Map<RefPath, string[]>();

  /**
   * Extract all prefix paths for a token reference.
   *
   * Example: "a.b.c" returns ["a", "a.b"]
   * Cached after first call for the same token.
   */
  extractPrefixes(tokenName: RefPath): string[] {
    const cached = this.prefixCache.get(tokenName);
    if (cached) {
      return cached;
    }

    const prefixes: string[] = [];
    let dotIndex = tokenName.indexOf(".");

    while (dotIndex !== -1) {
      prefixes.push(tokenName.slice(0, dotIndex));
      dotIndex = tokenName.indexOf(".", dotIndex + 1);
    }

    this.prefixCache.set(tokenName, prefixes);
    return prefixes;
  }

  clearCache(): void {
    this.prefixCache.clear();
  }
}
