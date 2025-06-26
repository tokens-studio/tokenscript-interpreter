import chalk from "chalk";
import type { ASTNode } from "./interpreter/ast";
import { Interpreter } from "./interpreter/interpreter";
import { Lexer } from "./interpreter/lexer";
import { Parser } from "./interpreter/parser";
import { UNINTERPRETED_KEYWORDS } from "./types";
import { PerformanceTracker } from "./utils/performance-tracker";

export interface TokenSetResolverOptions {
  maxIterations?: number;
}

export interface TokenSetResolverResult {
  resolvedTokens: Record<string, any>;
  warnings: string[];
  errors: string[];
}

export class TokenSetResolver {
  private tokens: Record<string, any>;
  private resolvedTokens: Record<string, any>;
  private requiredByTokens: Record<string, Set<string>> = {};
  private requiresTokens: Record<string, Set<string>> = {};
  private parsers: Record<string, ASTNode> = {};
  private referenceCache: Interpreter;
  private warnings: string[] = [];
  private errors: string[] = [];
  private lastReferencesSync: number = 0; // Track when we last synced all references

  constructor(tokens: Record<string, any>, globalTokens: Record<string, any> = {}) {
    this.tokens = tokens;
    this.resolvedTokens = { ...globalTokens };
    this.referenceCache = new Interpreter(null, this.resolvedTokens);
    this.lastReferencesSync = Object.keys(this.resolvedTokens).length;
  }

  private buildRequirementsGraph(): void {
    for (const [tokenName, tokenData] of Object.entries(this.tokens)) {
      // Skip uninterpreted keywords
      if (UNINTERPRETED_KEYWORDS.includes(String(tokenData))) {
        this.resolvedTokens[tokenName] = tokenData;
        continue;
      }

      try {
        const lexer = new Lexer(String(tokenData));

        // Check if lexer is at EOF (empty or whitespace-only input)
        if (lexer.isEOF()) {
          this.resolvedTokens[tokenName] = tokenData;
          continue;
        }

        const parser = new Parser(lexer);
        const ast = parser.parse();

        if (ast) {
          this.parsers[tokenName] = ast;

          // Extract required references from parser
          const requiredRefs = parser.getRequiredReferences();

          // Check for self-reference
          if (requiredRefs.includes(tokenName)) {
            this.warnings.push(`Token '${tokenName}' has a circular reference to itself.`);
          }

          // Build dependency graph
          for (const refToken of requiredRefs) {
            if (!this.requiresTokens[tokenName]) {
              this.requiresTokens[tokenName] = new Set();
            }
            if (!this.requiredByTokens[refToken]) {
              this.requiredByTokens[refToken] = new Set();
            }

            this.requiredByTokens[refToken].add(tokenName);
            this.requiresTokens[tokenName].add(refToken);
          }
        } else {
          this.resolvedTokens[tokenName] = tokenData;
        }
      } catch (error: any) {
        this.warnings.push(
          `Error parsing token '${tokenName}': ${error.message} (value: ${tokenData})`
        );
        this.resolvedTokens[tokenName] = tokenData;
      }
    }
  }

  private resolveSingleToken(tokenName: string): void {
    if (!(tokenName in this.tokens)) {
      throw new Error(`Token '${tokenName}' not found.`);
    }

    if (!(tokenName in this.resolvedTokens)) {
      const ast = this.parsers[tokenName];
      if (!ast) {
        this.resolvedTokens[tokenName] = this.tokens[tokenName];
        return;
      }

      try {
        // Reuse the existing interpreter instance with the cached AST
        this.referenceCache.setAst(ast);

        // Efficiently sync references: only update if we have new resolved tokens
        const currentResolvedCount = Object.keys(this.resolvedTokens).length;
        if (currentResolvedCount > this.lastReferencesSync) {
          this.referenceCache.updateReferences(this.resolvedTokens);
          this.lastReferencesSync = currentResolvedCount;
        }

        const result = this.referenceCache.interpret();
        this.resolvedTokens[tokenName] = result;

        // Add the newly resolved token directly to avoid full sync next time
        this.referenceCache.addReference(tokenName, result);
      } catch (error: any) {
        this.warnings.push(
          `Error interpreting token '${tokenName}': ${error.message} (value: ${this.tokens[tokenName]})`
        );
        this.resolvedTokens[tokenName] = this.tokens[tokenName];
      }
    }

    // Update reference cache
    this.referenceCache.setReferences({ [tokenName]: this.resolvedTokens[tokenName] });

    // Resolve dependent tokens
    if (tokenName in this.requiredByTokens) {
      for (const dependentToken of this.requiredByTokens[tokenName]) {
        this.requiresTokens[dependentToken].delete(tokenName);

        if (this.requiresTokens[dependentToken].size === 0) {
          this.resolveSingleToken(dependentToken);
        }
      }
    }

    // Clean up
    if (tokenName in this.requiresTokens) {
      delete this.requiresTokens[tokenName];
    }
  }

  public resolve(): TokenSetResolverResult {
    this.buildRequirementsGraph();

    // Resolve tokens that have no dependencies first
    const independentTokens = Object.keys(this.tokens).filter(
      (tokenName) => !(tokenName in this.requiresTokens)
    );

    for (const tokenName of independentTokens) {
      this.resolveSingleToken(tokenName);
    }

    // Check for unresolved tokens
    const unresolvedTokens = Object.keys(this.tokens).filter(
      (tokenName) => !(tokenName in this.resolvedTokens)
    );

    if (unresolvedTokens.length > 0) {
      this.warnings.push(
        `Not all tokens could be resolved. Remaining tokens: ${unresolvedTokens.map((token) => `${token}: ${this.tokens[token]}`).join(", ")}`
      );
    }

    return {
      resolvedTokens: this.resolvedTokens,
      warnings: this.warnings,
      errors: this.errors,
    };
  }
}

// Process themes and resolve tokens
export async function processThemes(
  themes: Record<string, Record<string, any>>,
  options?: { enablePerformanceTracking?: boolean }
): Promise<Record<string, any>> {
  const outputTokens: Record<string, any> = {};
  const globalTokensCache: Record<string, any> = {};
  const performanceTracker = options?.enablePerformanceTracking ? new PerformanceTracker() : null;

  performanceTracker?.startTracking();

  for (const [themeName, themeTokens] of Object.entries(themes)) {
    console.log(
      chalk.blue("🔄 Processing theme: ") +
        chalk.cyan(themeName) +
        chalk.gray(` (${Object.keys(themeTokens).length} tokens)`)
    );

    const startTime = Date.now();
    const tokenSet = new TokenSetResolver(themeTokens, {});
    const result = tokenSet.resolve();
    const endTime = Date.now();

    // Handle warnings and errors from the resolver
    for (const warning of result.warnings) {
      console.warn(chalk.yellow(`⚠️  ${warning}`));
    }
    for (const error of result.errors) {
      console.error(chalk.red(`❌ ${error}`));
    }

    const resolvedTokens = result.resolvedTokens;

    const inputCount = Object.keys(themeTokens).length;
    const outputCount = Object.keys(resolvedTokens).length;

    performanceTracker?.addEntry(themeName, inputCount, outputCount, startTime, endTime);

    outputTokens[themeName] = resolvedTokens;
    Object.assign(globalTokensCache, resolvedTokens);
  }

  // Display performance summary
  performanceTracker?.displaySummary();

  return outputTokens;
}

// Build theme tree for permutations
export function buildThemeTree(
  tokensets: Record<string, any>
): Record<string, Record<string, Record<string, any>>> {
  const themesData = tokensets.$themes;
  const themeTree: Record<string, Record<string, Record<string, any>>> = {};

  for (const theme of themesData) {
    const themeGroup = theme.group;
    if (!(themeGroup in themeTree)) {
      themeTree[themeGroup] = {};
    }

    const themeName = theme.name;
    const tokens: Record<string, any> = {};

    // Handle both old format (object) and new format (array)
    const selectedTokenSets = theme.selectedTokenSets;

    if (Array.isArray(selectedTokenSets)) {
      // New format: array of objects with id and status
      for (const tokenSetRef of selectedTokenSets) {
        if (tokenSetRef.status === "enabled" || tokenSetRef.status === "source") {
          const setId = tokenSetRef.id;
          if (!(setId in tokensets)) {
            console.warn(`Token set '${setId}' referenced in '${themeName}' not found.`);
            continue;
          }
          Object.assign(tokens, flattenTokenset(tokensets[setId]));
        }
      }
    } else {
      // Old format: object with key-value pairs
      for (const [setName, status] of Object.entries(selectedTokenSets)) {
        if (status === "enabled" || status === "source") {
          if (!(setName in tokensets)) {
            throw new Error(`Token set '${setName}' referenced in '${themeName}' not found.`);
          }
          Object.assign(tokens, flattenTokenset(tokensets[setName]));
        }
      }
    }

    themeTree[themeGroup][themeName] = tokens;
  }

  return themeTree;
}

// Flatten tokenset helper function
function flattenTokenset(tokenset: any, prefix = "", resolveAll = false): Record<string, any> {
  const flattenedTokens: Record<string, any> = {};

  for (const [setName, setData] of Object.entries(tokenset)) {
    if (typeof setData === "object" && setData !== null && !Array.isArray(setData)) {
      if (setName === "$value" || resolveAll) {
        for (const [name, value] of Object.entries(setData)) {
          const fullName = prefix ? `${prefix}.${name}` : name;
          flattenedTokens[fullName] = value;
        }
        continue;
      }

      if (setName.startsWith("$")) {
        continue;
      }

      const fullSetName = prefix ? `${prefix}.${setName}` : setName;
      const nestedTokens = flattenTokenset(setData, fullSetName);
      Object.assign(flattenedTokens, nestedTokens);
    } else if (Array.isArray(setData)) {
      setData.forEach((value, index) => {
        const name = prefix ? `${prefix}.${index}` : String(index);
        Object.assign(flattenedTokens, flattenTokenset(value, name, true));
      });
    } else {
      if (setName === "value" || setName === "$value") {
        flattenedTokens[prefix] = setData;
      }
    }
  }

  return flattenedTokens;
}

// Permutate tokensets based on theme tree
export function permutateTokensets(
  themeTree: Record<string, Record<string, Record<string, any>>>,
  permutateOn: string[],
  tokens: Record<string, any> = {}
): any {
  if (permutateOn.length === 0) {
    return tokens;
  }

  const output: any = {};
  const currentPermutation = permutateOn.shift();
  if (!currentPermutation) {
    throw new Error("No permutation available to process");
  }

  console.log(chalk.blue("🔄 Permutating on: ") + chalk.magenta(currentPermutation));

  for (const [themeName, themeTokens] of Object.entries(themeTree[currentPermutation])) {
    if (!themeTokens) {
      continue;
    }

    const themeL = { ...themeTokens, ...tokens };
    output[themeName] = permutateTokensets(themeTree, [...permutateOn], themeL);
  }

  return output;
}

// Interpret tokensets for permutations
export function interpretTokensets(
  permutationTree: any,
  permutationDimensions: Array<{ name: string; options: string[] }>,
  tokens: Record<string, any>
): any {
  if (permutationDimensions.length === 0) {
    const relevantTokens = Object.keys(tokens);
    const tokenSet = new TokenSetResolver(permutationTree, {});
    const result = tokenSet.resolve();

    const relevantTokensExtracted: Record<string, any> = {};
    for (const token of relevantTokens) {
      relevantTokensExtracted[token] = result.resolvedTokens[token];
    }

    return relevantTokensExtracted;
  }

  const currentPermutation = permutationDimensions[0];
  const remainingDimensions = permutationDimensions.slice(1);

  const output: any = {};
  for (const theme of currentPermutation.options) {
    output[theme] = interpretTokensets(permutationTree[theme], remainingDimensions, tokens);
  }

  return output;
}

// Simple function to process any DTCG JSON blob - the main API users want
// Pure in-memory processing - no file system operations
export function interpretTokens(dtcgJson: Record<string, any>): Record<string, any> {
  // Validate input
  if (!dtcgJson || typeof dtcgJson !== "object") {
    throw new Error("Invalid JSON input: Expected an object");
  }

  // Check if this is a complete DTCG file with themes
  if (dtcgJson.$themes && Array.isArray(dtcgJson.$themes)) {
    // This is a complete DTCG file with themes - process like a ZIP file
    const themes = loadThemesFromJson(dtcgJson);
    return processThemesSync(themes);
  } else {
    // Check if this looks like a flat token set (keys with dots) or DTCG structure
    const hasNestedStructure = Object.keys(dtcgJson).some(
      (key) =>
        typeof dtcgJson[key] === "object" &&
        dtcgJson[key] !== null &&
        !Array.isArray(dtcgJson[key]) &&
        !key.startsWith("$")
    );

    let tokensToProcess: Record<string, any>;

    if (hasNestedStructure) {
      // This is a DTCG structure without themes - flatten it
      tokensToProcess = flattenTokenset(dtcgJson);
    } else {
      // This is already a flat token set
      tokensToProcess = dtcgJson;
    }

    const tokenSet = new TokenSetResolver(tokensToProcess, {});
    const result = tokenSet.resolve();

    // Convert Symbol objects to strings
    const stringifiedTokens: Record<string, any> = {};
    for (const [key, value] of Object.entries(result.resolvedTokens)) {
      if (value && typeof value === "object" && "toString" in value) {
        stringifiedTokens[key] = value.toString();
      } else {
        stringifiedTokens[key] = value;
      }
    }

    return stringifiedTokens;
  }
}

// Function to process DTCG JSON and preserve metadata structure with $value
export function interpretTokensWithMetadata(dtcgJson: Record<string, any>): Record<string, any> {
  // Validate input
  if (!dtcgJson || typeof dtcgJson !== "object") {
    throw new Error("Invalid JSON input: Expected an object");
  }

  // Check if this is a complete DTCG file with themes
  if (dtcgJson.$themes && Array.isArray(dtcgJson.$themes)) {
    // This is a complete DTCG file with themes - process each theme
    const outputTokens: Record<string, Record<string, any>> = {};
    const themesData = dtcgJson.$themes;

    for (const theme of themesData) {
      const themeName = theme.name;
      const themeTokensWithMetadata: Record<string, any> = {};
      const themeTokensFlat: Record<string, any> = {};

      // Handle both old format (object) and new format (array)
      const selectedTokenSets = theme.selectedTokenSets;

      if (Array.isArray(selectedTokenSets)) {
        // New format: array of objects with id and status
        for (const tokenSetRef of selectedTokenSets) {
          if (tokenSetRef.status === "enabled" || tokenSetRef.status === "source") {
            const setId = tokenSetRef.id;
            if (!(setId in dtcgJson)) {
              console.warn(
                chalk.yellow(`⚠️  Token set '${setId}' referenced in '${themeName}' not found.`)
              );
              continue;
            }

            // Collect metadata and flatten for resolution
            const setData = dtcgJson[setId];
            collectTokenMetadata(setData, themeTokensWithMetadata, setId);
            Object.assign(themeTokensFlat, flattenTokenset(setData));
          }
        }
      } else {
        // Old format: object with key-value pairs
        for (const [setName, status] of Object.entries(selectedTokenSets)) {
          if (status === "enabled" || status === "source") {
            if (!(setName in dtcgJson)) {
              throw new Error(`Token set '${setName}' referenced in '${themeName}' not found.`);
            }

            // Collect metadata and flatten for resolution
            const setData = dtcgJson[setName];
            collectTokenMetadata(setData, themeTokensWithMetadata, setName);
            Object.assign(themeTokensFlat, flattenTokenset(setData));
          }
        }
      }

      // Resolve token references
      const tokenSet = new TokenSetResolver(themeTokensFlat, {});
      const result = tokenSet.resolve();

      // Create DTCG output with interpreted values
      const dtcgTokens: Record<string, any> = {};
      for (const [tokenName, tokenMetadata] of Object.entries(themeTokensWithMetadata)) {
        const resolvedValue = result.resolvedTokens[tokenName];

        // Preserve all metadata and update $value with interpreted result
        dtcgTokens[tokenName] = {
          ...tokenMetadata,
          $value:
            resolvedValue && typeof resolvedValue === "object" && "toString" in resolvedValue
              ? resolvedValue.toString()
              : resolvedValue || (tokenMetadata as any).$value,
        };
      }

      outputTokens[themeName] = dtcgTokens;
    }

    return outputTokens;
  } else {
    // Check if this looks like a flat token set or DTCG structure
    const hasNestedStructure = Object.keys(dtcgJson).some(
      (key) =>
        typeof dtcgJson[key] === "object" &&
        dtcgJson[key] !== null &&
        !Array.isArray(dtcgJson[key]) &&
        !key.startsWith("$")
    );

    if (hasNestedStructure) {
      // This is a DTCG structure without themes
      const tokensWithMetadata: Record<string, any> = {};
      const tokensToResolve: Record<string, any> = {};

      // Collect metadata and flatten for resolution
      collectTokenMetadata(dtcgJson, tokensWithMetadata);
      Object.assign(tokensToResolve, flattenTokenset(dtcgJson));

      // Resolve token references
      const tokenSet = new TokenSetResolver(tokensToResolve, {});
      const result = tokenSet.resolve();

      // Create DTCG output with interpreted values
      const dtcgTokens: Record<string, any> = {};
      for (const [tokenName, tokenMetadata] of Object.entries(tokensWithMetadata)) {
        const resolvedValue = result.resolvedTokens[tokenName];

        // Preserve all metadata and update $value with interpreted result
        dtcgTokens[tokenName] = {
          ...tokenMetadata,
          $value:
            resolvedValue && typeof resolvedValue === "object" && "toString" in resolvedValue
              ? resolvedValue.toString()
              : resolvedValue || tokenMetadata.$value,
        };
      }

      return dtcgTokens;
    } else {
      // This is already a flat token set - convert to DTCG format
      const tokenSet = new TokenSetResolver(dtcgJson, {});
      const resolvedTokens = tokenSet.resolve();

      // Convert to DTCG format
      const dtcgTokens: Record<string, any> = {};
      for (const [key, value] of Object.entries(resolvedTokens)) {
        const resolvedValue =
          value && typeof value === "object" && "toString" in value ? value.toString() : value;

        dtcgTokens[key] = {
          $value: resolvedValue,
        };
      }

      return dtcgTokens;
    }
  }
}

// Helper function to collect token metadata recursively
function collectTokenMetadata(tokenset: any, metadata: Record<string, any>, prefix = ""): void {
  for (const [key, value] of Object.entries(tokenset)) {
    if (key.startsWith("$")) {
      continue; // Skip metadata keys at this level
    }

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      if ((value as any).$value !== undefined) {
        // This is a token with metadata
        const tokenName = prefix ? `${prefix}.${key}` : key;
        metadata[tokenName] = { ...value };
      } else {
        // This is a nested group
        const newPrefix = prefix ? `${prefix}.${key}` : key;
        collectTokenMetadata(value, metadata, newPrefix);
      }
    }
  }
}

// Keep the original functions for backward compatibility
export function processTokensFromJson(dtcgJson: Record<string, any>): Record<string, any> {
  return interpretTokens(dtcgJson);
}

export function processSingleTokenSet(tokens: Record<string, any>): Record<string, any> {
  // Check if this looks like a flat token set or DTCG structure
  const hasNestedStructure = Object.keys(tokens).some(
    (key) =>
      typeof tokens[key] === "object" &&
      tokens[key] !== null &&
      !Array.isArray(tokens[key]) &&
      !key.startsWith("$")
  );

  let tokensToProcess: Record<string, any>;

  if (hasNestedStructure) {
    // This is a DTCG structure - flatten it
    tokensToProcess = flattenTokenset(tokens);
  } else {
    // This is already a flat token set
    tokensToProcess = tokens;
  }

  const tokenSet = new TokenSetResolver(tokensToProcess, {});
  const resolvedTokens = tokenSet.resolve();

  // Convert Symbol objects to strings
  const stringifiedTokens: Record<string, any> = {};
  for (const [key, value] of Object.entries(resolvedTokens)) {
    if (value && typeof value === "object" && "toString" in value) {
      stringifiedTokens[key] = value.toString();
    } else {
      stringifiedTokens[key] = value;
    }
  }

  return stringifiedTokens;
}

// Load themes from DTCG JSON object (similar to loadThemes but for JSON input)
function loadThemesFromJson(dtcgJson: Record<string, any>): Record<string, Record<string, any>> {
  if (!dtcgJson.$themes) {
    throw new Error("No themes found in the DTCG JSON.");
  }

  const themeTokens: Record<string, Record<string, any>> = {};
  const themesData = dtcgJson.$themes;

  for (const theme of themesData) {
    const themeName = theme.name;
    themeTokens[themeName] = {};

    // Handle both old format (object) and new format (array)
    const selectedTokenSets = theme.selectedTokenSets;

    if (Array.isArray(selectedTokenSets)) {
      // New format: array of objects with id and status
      for (const tokenSetRef of selectedTokenSets) {
        if (tokenSetRef.status === "enabled" || tokenSetRef.status === "source") {
          const setId = tokenSetRef.id;
          if (!(setId in dtcgJson)) {
            console.warn(
              chalk.yellow(`⚠️  Token set '${setId}' referenced in '${themeName}' not found.`)
            );
            continue;
          }
          Object.assign(themeTokens[themeName], flattenTokenset(dtcgJson[setId]));
        }
      }
    } else {
      // Old format: object with key-value pairs
      for (const [setName, status] of Object.entries(selectedTokenSets)) {
        if (status === "enabled" || status === "source") {
          if (!(setName in dtcgJson)) {
            throw new Error(`Token set '${setName}' referenced in '${themeName}' not found.`);
          }
          Object.assign(themeTokens[themeName], flattenTokenset(dtcgJson[setName]));
        }
      }
    }
  }

  return themeTokens;
}

// Synchronous version of processThemes for in-memory processing
function processThemesSync(themes: Record<string, Record<string, any>>): Record<string, any> {
  const outputTokens: Record<string, any> = {};
  const globalTokensCache: Record<string, any> = {};

  for (const [themeName, themeTokens] of Object.entries(themes)) {
    const tokenSet = new TokenSetResolver(themeTokens, {});
    const result = tokenSet.resolve();

    // Convert Symbol objects to strings
    const stringifiedTokens: Record<string, any> = {};
    for (const [key, value] of Object.entries(result.resolvedTokens)) {
      if (value && typeof value === "object" && "toString" in value) {
        stringifiedTokens[key] = value.toString();
      } else {
        stringifiedTokens[key] = value;
      }
    }

    outputTokens[themeName] = stringifiedTokens;
    Object.assign(globalTokensCache, stringifiedTokens);
  }

  return outputTokens;
}
