import type { Config } from "@interpreter/config";
import type { interpreterResult } from "@interpreter/interpreter";
import { DictionarySymbol, NullSymbol, StringSymbol } from "@interpreter/symbols";
import type { ISymbolType } from "@src/types";
import type { RefPath } from "./types";

/**
 * Handles prefix bookkeeping, dictionary construction, and virtual child tracking.
 */
export class PrefixManager {
  private readonly prefixes = new Map<string, Set<RefPath>>();
  private readonly tokenPrefixes = new Map<RefPath, Set<string>>();
  private readonly activePrefixes = new Map<string, Set<RefPath>>();
  private readonly virtualChildren = new Map<RefPath, Set<RefPath>>();

  constructor(private readonly config?: Config) {}

  addTokenToPrefix(tokenName: RefPath): void {
    let dotIndex = tokenName.indexOf(".");
    if (dotIndex === -1) return;

    while (dotIndex !== -1) {
      const prefix = tokenName.slice(0, dotIndex);
      this.addToSetMap(this.prefixes, prefix, tokenName);
      this.addToSetMap(this.tokenPrefixes, tokenName, prefix);
      dotIndex = tokenName.indexOf(".", dotIndex + 1);
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
    referenceCache: Map<string, interpreterResult>,
  ): DictionarySymbol | undefined {
    const prefixedTokens = this.prefixes.get(prefix);
    if (!prefixedTokens) return undefined;

    const dictionaryEntries = new Map<string, ISymbolType>();
    const prefixLen = prefix.length + 1;

    for (const tokenName of prefixedTokens) {
      const shortName = tokenName.slice(prefixLen);
      if (shortName.includes(".")) continue;

      const referenceValue = referenceCache.get(tokenName);
      const symbol = this.toSymbol(referenceValue);
      if (symbol) {
        dictionaryEntries.set(shortName, symbol.cloneIfMutable());
      }
    }

    if (dictionaryEntries.size === 0) return undefined;
    return new DictionarySymbol(dictionaryEntries, this.config);
  }

  findParentToken(reference: RefPath, tokens: Map<RefPath, string>): RefPath | undefined {
    let lastDotIndex = reference.lastIndexOf(".");
    while (lastDotIndex > 0) {
      const candidate = reference.slice(0, lastDotIndex);
      if (tokens.has(candidate)) {
        return candidate;
      }
      lastDotIndex = reference.lastIndexOf(".", lastDotIndex - 1);
    }
    return undefined;
  }

  addVirtualChild(parent: RefPath, child: RefPath): void {
    this.addToSetMap(this.virtualChildren, parent, child);
  }

  getVirtualChildren(parent: RefPath): Set<RefPath> {
    const children = this.virtualChildren.get(parent);
    return children ? new Set(children) : new Set();
  }

  removeVirtualChildren(parent: RefPath): void {
    this.virtualChildren.delete(parent);
  }

  private addToSetMap<K, V>(map: Map<K, Set<V>>, key: K, value: V): void {
    let set = map.get(key);
    if (!set) {
      set = new Set<V>();
      map.set(key, set);
    }
    set.add(value);
  }

  private isSymbolType(value: unknown): value is ISymbolType {
    return Boolean(value && typeof value === "object" && "cloneIfMutable" in (value as object));
  }

  private toSymbol(value: interpreterResult | undefined): ISymbolType | undefined {
    if (value === undefined) return undefined;
    if (value === null) {
      return new NullSymbol(this.config);
    }
    if (this.isSymbolType(value)) {
      return value;
    }
    return new StringSymbol(String(value), this.config);
  }
}
