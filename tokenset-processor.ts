import chalk from "chalk";
import type { ASTNode } from "./interpreter/ast";
import { Interpreter } from "./interpreter/interpreter";
import { Lexer } from "./interpreter/lexer";
import { Parser } from "./interpreter/parser";
import { UNINTERPRETED_KEYWORDS } from "./types";
import { flattenTokens as flattenDTCGTokens, hasNestedDTCGStructure } from "./utils/dtcg-adapter";
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
  private tokens: Map<string, string>;
  private resolvedTokens: Map<string, any>;
  private requiredByTokens: Record<string, Set<string>> = {};
  private requiresTokens: Record<string, Set<string>> = {};
  private parsers: Map<string, ASTNode> = new Map();
  private referenceCache: Interpreter;
  private warnings: string[] = [];
  private errors: string[] = [];

  constructor(tokens: Record<string, string>, globalTokens: Record<string, any> = {}) {
    this.tokens = new Map(Object.entries(tokens));
    this.resolvedTokens = new Map(Object.entries(globalTokens));

    // CRITICAL: Pass the resolvedTokens Map directly to the Interpreter.
    // The interpreter now holds a LIVE REFERENCE to this map.
    this.referenceCache = new Interpreter(null, this.resolvedTokens);
  }

  private buildRequirementsGraph(): void {
    for (const [tokenName, tokenData] of this.tokens.entries()) {
      // Skip uninterpreted keywords
      if (UNINTERPRETED_KEYWORDS.includes(tokenData)) {
        this.resolvedTokens.set(tokenName, tokenData);
        continue;
      }

      try {
        const lexer = new Lexer(tokenData);

        // Check if lexer is at EOF (empty or whitespace-only input)
        if (lexer.isEOF()) {
          this.resolvedTokens.set(tokenName, tokenData);
          continue;
        }

        const parser = new Parser(lexer);
        const ast = parser.parse();

        if (ast) {
          this.parsers.set(tokenName, ast);

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
          this.resolvedTokens.set(tokenName, tokenData);
        }
      } catch (error: any) {
        this.warnings.push(
          `Error parsing token '${tokenName}': ${error.message} (value: ${tokenData})`
        );
        this.resolvedTokens.set(tokenName, tokenData);
      }
    }
  }

  private resolveTokenIteratively(tokenName: string): void {
    if (!this.tokens.has(tokenName)) {
      throw new Error(`Token '${tokenName}' not found.`);
    }

    if (!this.resolvedTokens.has(tokenName)) {
      const ast = this.parsers.get(tokenName);
      if (!ast) {
        const tokenValue = this.tokens.get(tokenName);
        if (tokenValue !== undefined) {
          this.resolvedTokens.set(tokenName, tokenValue);
        }
        return;
      }

      try {
        // CRITICAL: The referenceCache interpreter ALREADY has a live reference
        // to resolvedTokens via its references property. No updates are needed.
        this.referenceCache.setAst(ast);
        const result = this.referenceCache.interpret();

        // CRITICAL: We now write the result DIRECTLY to the shared map.
        // The interpreter will see this new value on the next call to interpret()
        // automatically, because it holds a reference to the same map.
        this.resolvedTokens.set(tokenName, result);
      } catch (error: any) {
        this.warnings.push(
          `Error interpreting token '${tokenName}': ${error.message} (value: ${this.tokens.get(tokenName)})`
        );
        const tokenValue = this.tokens.get(tokenName);
        if (tokenValue !== undefined) {
          this.resolvedTokens.set(tokenName, tokenValue);
        }
      }
    }
  }

  public resolve(): TokenSetResolverResult {
    this.buildRequirementsGraph();

    // Iterative topological sort resolution
    // 1. Find all tokens with zero dependencies and add them to the queue
    const queue: string[] = Array.from(this.tokens.keys()).filter(
      (tokenName) => !(tokenName in this.requiresTokens)
    );

    // 2. Process tokens iteratively
    while (queue.length > 0) {
      const tokenName = queue.shift();
      if (!tokenName) continue;

      // Resolve this token
      this.resolveTokenIteratively(tokenName);

      // Check dependent tokens and add them to queue if they're now ready
      if (tokenName in this.requiredByTokens) {
        for (const dependentToken of this.requiredByTokens[tokenName]) {
          this.requiresTokens[dependentToken].delete(tokenName);

          // If this dependent token has no more dependencies, add it to the queue
          if (this.requiresTokens[dependentToken].size === 0) {
            queue.push(dependentToken);
            // Clean up the empty dependency set
            delete this.requiresTokens[dependentToken];
          }
        }
      }
    }

    // Check for unresolved tokens (circular dependencies or missing references)
    const unresolvedTokens = Array.from(this.tokens.keys()).filter(
      (tokenName) => !this.resolvedTokens.has(tokenName)
    );

    if (unresolvedTokens.length > 0) {
      this.warnings.push(
        `Not all tokens could be resolved. Remaining tokens: ${unresolvedTokens.map((token) => `${token}: ${this.tokens.get(token)}`).join(", ")}`
      );
    }

    return {
      resolvedTokens: Object.fromEntries(this.resolvedTokens.entries()),
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

    // Ensure all values are strings for the new TokenSetResolver
    const stringTokens: Record<string, string> = {};
    for (const [key, value] of Object.entries(themeTokens)) {
      stringTokens[key] = String(value);
    }

    const tokenSet = new TokenSetResolver(stringTokens);
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
          Object.assign(tokens, flattenDTCGTokens(tokensets[setId]));
        }
      }
    } else {
      // Old format: object with key-value pairs
      for (const [setName, status] of Object.entries(selectedTokenSets)) {
        if (status === "enabled" || status === "source") {
          if (!(setName in tokensets)) {
            throw new Error(`Token set '${setName}' referenced in '${themeName}' not found.`);
          }
          Object.assign(tokens, flattenDTCGTokens(tokensets[setName]));
        }
      }
    }

    themeTree[themeGroup][themeName] = tokens;
  }

  return themeTree;
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

    // Ensure all values are strings for the new TokenSetResolver
    const stringTokens: Record<string, string> = {};
    for (const [key, value] of Object.entries(permutationTree)) {
      stringTokens[key] = String(value);
    }

    const tokenSet = new TokenSetResolver(stringTokens);
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
export function interpretTokens(tokenInput: Record<string, any>): Record<string, any> {
  if (!tokenInput || typeof tokenInput !== "object") {
    throw new Error("Invalid JSON input: Expected an object");
  }

  // Check if this is a complete DTCG file with themes
  if (tokenInput.$themes && Array.isArray(tokenInput.$themes)) {
    // This is a complete DTCG file with themes - process like a ZIP file
    const themes = loadThemesFromJson(tokenInput);
    return processThemesSync(themes);
  } else {
    // 1. ADAPT: Normalize input to flat format
    let flatTokens: Record<string, string>;

    if (hasNestedDTCGStructure(tokenInput)) {
      // This is a DTCG structure without themes - flatten it
      flatTokens = flattenDTCGTokens(tokenInput);
    } else {
      // This is already a flat token set - ensure all values are strings
      flatTokens = {};
      for (const [key, value] of Object.entries(tokenInput)) {
        flatTokens[key] = String(value);
      }
    }

    // 2. CORE: Resolve the flat tokens
    const resolver = new TokenSetResolver(flatTokens);
    const result = resolver.resolve();

    // 3. Stringify for clean output
    const stringifiedTokens: Record<string, any> = {};
    for (const [key, value] of Object.entries(result.resolvedTokens)) {
      stringifiedTokens[key] = value?.toString() ?? value;
    }

    return stringifiedTokens;
  }
}

// Keep the original functions for backward compatibility
export function processTokensFromJson(dtcgJson: Record<string, any>): Record<string, any> {
  return interpretTokens(dtcgJson);
}

export function processSingleTokenSet(tokens: Record<string, any>): Record<string, any> {
  // This function is now just a wrapper around interpretTokens for backward compatibility
  return interpretTokens(tokens);
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
          Object.assign(themeTokens[themeName], flattenDTCGTokens(dtcgJson[setId]));
        }
      }
    } else {
      // Old format: object with key-value pairs
      for (const [setName, status] of Object.entries(selectedTokenSets)) {
        if (status === "enabled" || status === "source") {
          if (!(setName in dtcgJson)) {
            throw new Error(`Token set '${setName}' referenced in '${themeName}' not found.`);
          }
          Object.assign(themeTokens[themeName], flattenDTCGTokens(dtcgJson[setName]));
        }
      }
    }
  }

  return themeTokens;
}

// Synchronous version of processThemes for in-memory processing
function processThemesSync(themes: Record<string, Record<string, any>>): Record<string, any> {
  const outputTokens: Record<string, any> = {};

  for (const [themeName, themeTokens] of Object.entries(themes)) {
    // Ensure all values are strings for the new TokenSetResolver
    const stringTokens: Record<string, string> = {};
    for (const [key, value] of Object.entries(themeTokens)) {
      stringTokens[key] = String(value);
    }

    const tokenSet = new TokenSetResolver(stringTokens);
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
  }

  return outputTokens;
}
