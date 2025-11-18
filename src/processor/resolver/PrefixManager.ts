import type { Config } from "@interpreter/config";
import type { InterpreterResult } from "@interpreter/interpreter";
import {
  DictionarySymbol,
  isTokenscriptSymbol,
  NullSymbol,
  StringSymbol,
} from "@interpreter/symbols";
import type { ISymbolType } from "@src/types";
import { PrefixExtractor } from "./PrefixExtractor";
import type { RefPath } from "./types";
import type { TokenData } from "@src/processor/utils/tokens";

/**
 * Handles prefix bookkeeping, dictionary construction, and virtual child tracking.
 */
export class PrefixManager {
  private readonly prefixes = new Map<string, Set<RefPath>>();
  private readonly tokenPrefixes = new Map<RefPath, Set<string>>();
  private readonly activePrefixes = new Map<string, Set<RefPath>>();
  private readonly virtualChildren = new Map<RefPath, Set<RefPath>>();
  private readonly prefixExtractor = new PrefixExtractor();

  // Optimization caches
  private readonly directChildrenCache = new Map<string, Set<string>>();
  private readonly parentLookupCache = new Map<RefPath, RefPath | undefined>();

  constructor(private readonly config?: Config) {}

  addTokenToPrefix(tokenName: RefPath): void {
    const prefixes = this.prefixExtractor.extractPrefixes(tokenName);
    if (prefixes.length === 0) return;

    for (const prefix of prefixes) {
      this.addToSetMap(this.prefixes, prefix, tokenName);
      this.addToSetMap(this.tokenPrefixes, tokenName, prefix);

      // Cache direct children for this prefix
      const prefixLen = prefix.length + 1;
      const shortName = tokenName.slice(prefixLen);
      if (!shortName.includes(".")) {
        this.addToSetMap(this.directChildrenCache, prefix, shortName);
      }
    }
  }

  hasPrefix(prefix: string): boolean {
    return this.prefixes.has(prefix);
  }

  activatePrefix(prefix: string): void {
    if (this.activePrefixes.has(prefix)) return;
    const members = this.prefixes.get(prefix);
    if (!members || members.size === 0) return;
    this.activePrefixes.set(prefix, new Set(members));
  }

  markTokenResolved(tokenName: RefPath): string[] {
    const prefixes = this.tokenPrefixes.get(tokenName);
    if (!prefixes || prefixes.size === 0) return [];

    const ready: string[] = [];
    for (const prefix of prefixes) {
      const pending = this.activePrefixes.get(prefix);
      if (!pending) continue;
      pending.delete(tokenName);
      if (pending.size === 0) {
        this.activePrefixes.delete(prefix);
        ready.push(prefix);
      }
    }

    this.tokenPrefixes.delete(tokenName);
    return ready;
  }

  buildPrefixDictionary(
    prefix: string,
    referenceCache: Map<string, InterpreterResult>,
  ): DictionarySymbol | undefined {
    const directChildren = this.directChildrenCache.get(prefix);
    if (!directChildren || directChildren.size === 0) return undefined;

    const dictionaryEntries = new Map<string, ISymbolType>();

    for (const shortName of directChildren) {
      const tokenName = `${prefix}.${shortName}`;
      const referenceValue = referenceCache.get(tokenName);
      const symbol = this.toSymbol(referenceValue);
      if (symbol) {
        dictionaryEntries.set(shortName, symbol.cloneIfMutable());
      }
    }

    if (dictionaryEntries.size === 0) return undefined;
    return new DictionarySymbol(dictionaryEntries, this.config);
  }

  findParentToken(reference: RefPath, tokens: Map<RefPath, string | TokenData>): RefPath | undefined {
    const cached = this.parentLookupCache.get(reference);
    if (cached !== undefined) {
      return cached === null ? undefined : cached;
    }

    let lastDotIndex = reference.lastIndexOf(".");
    while (lastDotIndex > 0) {
      const candidate = reference.slice(0, lastDotIndex);
      if (tokens.has(candidate)) {
        this.parentLookupCache.set(reference, candidate);
        return candidate;
      }
      lastDotIndex = reference.lastIndexOf(".", lastDotIndex - 1);
    }

    this.parentLookupCache.set(reference, null as unknown as undefined);
    return undefined;
  }

  addVirtualChild(parent: RefPath, child: RefPath): void {
    this.addToSetMap(this.virtualChildren, parent, child);
  }

  getVirtualChildren(parent: RefPath): Set<RefPath> {
    const children = this.virtualChildren.get(parent);
    return children ? new Set(children) : new Set();
  }

  getAndRemoveVirtualChildren(parent: RefPath): Set<RefPath> {
    const children = this.virtualChildren.get(parent);
    if (!children) return new Set();
    this.virtualChildren.delete(parent);
    return children;
  }

  removeVirtualChildren(parent: RefPath): void {
    this.virtualChildren.delete(parent);
  }

  getReadyPrefixes(): string[] {
    return Array.from(this.activePrefixes.keys()).filter((prefix) => {
      const pending = this.activePrefixes.get(prefix);
      return pending && pending.size === 0;
    });
  }

  clearCaches(): void {
    this.directChildrenCache.clear();
    this.parentLookupCache.clear();
  }

  private addToSetMap<K, V>(map: Map<K, Set<V>>, key: K, value: V): void {
    let set = map.get(key);
    if (!set) {
      set = new Set<V>();
      map.set(key, set);
    }
    set.add(value);
  }

  private toSymbol(value: InterpreterResult | undefined): ISymbolType | undefined {
    if (value === undefined) return undefined;

    if (value === null) return new NullSymbol(this.config);
    if (isTokenscriptSymbol(value)) return value;

    return new StringSymbol(String(value), this.config);
  }
}
