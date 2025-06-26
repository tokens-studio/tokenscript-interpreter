import chalk from "chalk";
import type { ASTNode } from "./interpreter/ast";
import { Interpreter } from "./interpreter/interpreter";
import { Lexer } from "./interpreter/lexer";
import { Parser } from "./interpreter/parser";
import { UNINTERPRETED_KEYWORDS } from "./types";

export interface TokenSetResolverOptions {
  maxIterations?: number;
}

export class TokenSetResolver {
  private tokens: Record<string, any>;
  private resolvedTokens: Record<string, any>;
  private requiredByTokens: Record<string, Set<string>> = {};
  private requiresTokens: Record<string, Set<string>> = {};
  private parsers: Record<string, ASTNode> = {};
  private referenceCache: Interpreter;

  constructor(tokens: Record<string, any>, globalTokens: Record<string, any> = {}) {
    this.tokens = tokens;
    this.resolvedTokens = { ...globalTokens };
    this.referenceCache = new Interpreter(null, this.resolvedTokens);
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
            console.warn(
              chalk.yellow(`⚠️  Token '${tokenName}' has a circular reference to itself.`)
            );
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
        console.warn(
          chalk.yellow(
            `⚠️  Error parsing token '${tokenName}': ${error.message} (value: ${tokenData})`
          )
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
        const interpreter = new Interpreter(ast, {});
        // Share reference cache
        interpreter.setReferences(this.resolvedTokens);

        const result = interpreter.interpret();
        this.resolvedTokens[tokenName] = result;
      } catch (error: any) {
        console.warn(
          chalk.yellow(
            `⚠️  Error interpreting token '${tokenName}': ${error.message} (value: ${this.tokens[tokenName]})`
          )
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

  public resolve(): Record<string, any> {
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
      console.warn(
        chalk.yellow(
          `⚠️  Not all tokens could be resolved. Remaining tokens: ${unresolvedTokens.map((token) => `${token}: ${this.tokens[token]}`).join(", ")}`
        )
      );
    }

    return this.resolvedTokens;
  }
}

// Process themes and resolve tokens
export async function processThemes(
  themes: Record<string, Record<string, any>>
): Promise<Record<string, any>> {
  let sumTokens = 0;
  const outputTokens: Record<string, any> = {};
  const globalTokensCache: Record<string, any> = {};
  const timingData: Array<{
    name: string;
    inputTokens: number;
    outputTokens: number;
    duration: number;
    tokensPerSecond: number;
  }> = [];

  const overallStartTime = Date.now();

  for (const [themeName, themeTokens] of Object.entries(themes)) {
    console.log(
      chalk.blue("🔄 Processing theme: ") +
        chalk.cyan(themeName) +
        chalk.gray(` (${Object.keys(themeTokens).length} tokens)`)
    );

    const startTime = Date.now();
    const tokenSet = new TokenSetResolver(themeTokens, {});
    const resolvedTokens = tokenSet.resolve();
    const endTime = Date.now();

    const duration = (endTime - startTime) / 1000;
    const inputCount = Object.keys(themeTokens).length;
    const outputCount = Object.keys(resolvedTokens).length;
    const tokensPerSecond = outputCount / Math.max(duration, 0.001); // Avoid division by zero

    timingData.push({
      name: themeName,
      inputTokens: inputCount,
      outputTokens: outputCount,
      duration,
      tokensPerSecond,
    });

    sumTokens += outputCount;
    outputTokens[themeName] = resolvedTokens;
    Object.assign(globalTokensCache, resolvedTokens);
  }

  const overallEndTime = Date.now();
  const totalDuration = (overallEndTime - overallStartTime) / 1000;

  // Display performance summary
  console.log(`\n${chalk.cyan("=".repeat(80))}`);
  console.log(chalk.cyan.bold("🚀 PERFORMANCE SUMMARY"));
  console.log(chalk.cyan("=".repeat(80)));

  // Table header
  console.log(
    chalk.bold(
      "Theme".padEnd(30) +
        "Input".padStart(12) +
        "Output".padStart(12) +
        "Time (s)".padStart(12) +
        "Tokens/s".padStart(14)
    )
  );
  console.log(chalk.gray("-".repeat(80)));

  // Table rows
  for (const data of timingData) {
    const name = data.name.length > 29 ? `${data.name.substring(0, 26)}...` : data.name;
    const tokensPerSec =
      data.tokensPerSecond > 999999 ? "∞" : Math.round(data.tokensPerSecond).toLocaleString();

    // Color code based on performance
    const speedColor =
      data.tokensPerSecond > 20000
        ? chalk.green
        : data.tokensPerSecond > 10000
          ? chalk.yellow
          : chalk.red;

    console.log(
      chalk.cyan(name.padEnd(30)) +
        chalk.blue(data.inputTokens.toLocaleString().padStart(12)) +
        chalk.green(data.outputTokens.toLocaleString().padStart(12)) +
        chalk.yellow(data.duration.toFixed(3).padStart(12)) +
        speedColor(tokensPerSec.padStart(14))
    );
  }

  console.log(chalk.gray("-".repeat(80)));

  // Summary statistics
  const avgTokensPerSecond = sumTokens / Math.max(totalDuration, 0.001);
  const totalSpeedColor =
    avgTokensPerSecond > 15000 ? chalk.green : avgTokensPerSecond > 8000 ? chalk.yellow : chalk.red;

  console.log(
    chalk.bold("TOTAL".padEnd(30)) +
      chalk.blue(
        timingData
          .reduce((sum, d) => sum + d.inputTokens, 0)
          .toLocaleString()
          .padStart(12)
      ) +
      chalk.green(sumTokens.toLocaleString().padStart(12)) +
      chalk.yellow(totalDuration.toFixed(3).padStart(12)) +
      totalSpeedColor(Math.round(avgTokensPerSecond).toLocaleString().padStart(14))
  );

  console.log(chalk.cyan("\n📊 Summary:"));
  console.log(chalk.white("   • Total themes processed: ") + chalk.cyan(timingData.length));
  console.log(
    chalk.white("   • Total tokens resolved: ") + chalk.green(sumTokens.toLocaleString())
  );
  console.log(
    chalk.white("   • Total processing time: ") + chalk.yellow(`${totalDuration.toFixed(3)}s`)
  );
  console.log(
    chalk.white("   • Average throughput: ") +
      totalSpeedColor(`${Math.round(avgTokensPerSecond).toLocaleString()} tokens/second`)
  );

  const fastestTheme = timingData.reduce((fastest, current) =>
    current.tokensPerSecond > fastest.tokensPerSecond ? current : fastest
  );
  const slowestTheme = timingData.reduce((slowest, current) =>
    current.tokensPerSecond < slowest.tokensPerSecond ? current : slowest
  );

  console.log(
    chalk.white("   • Fastest theme: ") +
      chalk.green(fastestTheme.name) +
      chalk.gray(` (${Math.round(fastestTheme.tokensPerSecond).toLocaleString()} tokens/s)`)
  );
  console.log(
    chalk.white("   • Slowest theme: ") +
      chalk.red(slowestTheme.name) +
      chalk.gray(` (${Math.round(slowestTheme.tokensPerSecond).toLocaleString()} tokens/s)`)
  );
  console.log(chalk.cyan("=".repeat(80)));

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
    const resolvedTokens = tokenSet.resolve();

    const relevantTokensExtracted: Record<string, any> = {};
    for (const token of relevantTokens) {
      relevantTokensExtracted[token] = resolvedTokens[token];
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
