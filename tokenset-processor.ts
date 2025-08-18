import chalk from "chalk";
import type { ASTNode } from "./interpreter/ast";
import { Interpreter } from "./interpreter/interpreter";
import { Lexer } from "./interpreter/lexer";
import { Parser } from "./interpreter/parser";
import { UNINTERPRETED_KEYWORDS } from "./types";
import { flattenTokens as flattenDTCGTokens, flattenTokensWithMetadata, hasNestedDTCGStructure } from "./utils/dtcg-adapter";
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

        if (lexer.isEOF()) {
          this.resolvedTokens.set(tokenName, tokenData);
          continue;
        }

        const parser = new Parser(lexer);
        const ast = parser.parse();

        if (ast) {
          this.parsers.set(tokenName, ast);

          if (parser.requiredReferences.has(tokenName)) {
            this.warnings.push(`Token '${tokenName}' has a circular reference to itself.`);
          }

          // Build dependency graph
          for (const refToken of parser.requiredReferences) {
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
      } catch (error: unknown) {
        this.warnings.push(
          `Error parsing token '${tokenName}': ${error instanceof Error ? error.message : String(error)} (value: ${tokenData})`,
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
      } catch (error: unknown) {
        this.warnings.push(
          `Error interpreting token '${tokenName}': ${error instanceof Error ? error.message : String(error)} (value: ${this.tokens.get(tokenName)})`,
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
      (tokenName) => !(tokenName in this.requiresTokens),
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
      (tokenName) => !this.resolvedTokens.has(tokenName),
    );

    if (unresolvedTokens.length > 0) {
      this.warnings.push(
        `Not all tokens could be resolved. Remaining tokens: ${unresolvedTokens.map((token) => `${token}: ${this.tokens.get(token)}`).join(", ")}`,
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
  options?: { enablePerformanceTracking?: boolean },
): Promise<Record<string, any>> {
  const outputTokens: Record<string, any> = {};
  const globalTokensCache: Record<string, any> = {};
  const performanceTracker = options?.enablePerformanceTracking ? new PerformanceTracker() : null;

  performanceTracker?.startTracking();

  for (const [themeName, themeTokens] of Object.entries(themes)) {
    console.log(
      chalk.blue("🔄 Processing theme: ") +
        chalk.cyan(themeName) +
        chalk.gray(` (${Object.keys(themeTokens).length} tokens)`),
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
  tokensets: Record<string, any>,
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
  tokens: Record<string, any> = {},
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
  tokens: Record<string, any>,
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
// Extended result type that includes metadata
export interface TokenProcessingResult {
  tokens: Record<string, any>;
  metadata: Record<string, Record<string, any>>;
}

/**
 * Enhanced token interpretation that preserves DTCG metadata alongside computed values.
 * Returns both the computed token values and their original metadata.
 */
export function interpretTokensWithMetadata(tokenInput: Record<string, any>): TokenProcessingResult {
  if (!tokenInput || typeof tokenInput !== "object") {
    throw new Error("Invalid JSON input: Expected an object");
  }

  // Check if this is a complete DTCG file with themes
  if (tokenInput.$themes && Array.isArray(tokenInput.$themes)) {
    // This is a complete DTCG file with themes - process like a ZIP file
    const themes = loadThemesFromJson(tokenInput);
    return processThemesSyncWithMetadata(themes, tokenInput);
  } else {
    // 1. ADAPT: Normalize input to flat format with metadata
    let flatTokens: Record<string, string>;
    let metadata: Record<string, Record<string, any>> = {};

    if (hasNestedDTCGStructure(tokenInput)) {
      // This is a DTCG structure without themes - flatten it with metadata
      const result = flattenTokensWithMetadata(tokenInput);
      flatTokens = result.flatTokens;
      metadata = result.metadata;
    } else {
      // This is already a flat token set - ensure all values are strings
      flatTokens = {};
      for (const [key, value] of Object.entries(tokenInput)) {
        flatTokens[key] = String(value);
      }
      // No metadata for flat tokens
    }

    // 2. CORE: Resolve the flat tokens
    const resolver = new TokenSetResolver(flatTokens);
    const result = resolver.resolve();

    // 3. Create enhanced output format with metadata
    const enhancedTokens: Record<string, any> = {};
    for (const [key, value] of Object.entries(result.resolvedTokens)) {
      const computedValue = value?.toString() ?? value;
      enhancedTokens[key] = computedValue;
      
      // Add metadata properties if they exist
      if (metadata[key]) {
        for (const [metaKey, metaValue] of Object.entries(metadata[key])) {
          enhancedTokens[`${key}.${metaKey}`] = metaValue;
        }
      }
    }

    return { 
      tokens: enhancedTokens, 
      metadata 
    };
  }
}

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
    // For backward compatibility, use the enhanced function but only return tokens
    const result = interpretTokensWithMetadata(tokenInput);
    return result.tokens;
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
    const themeName = theme.$id || theme.name || theme.$name;
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
              chalk.yellow(`⚠️  Token set '${setId}' referenced in '${themeName}' not found.`),
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

// Enhanced theme processing that preserves metadata
function processThemesSyncWithMetadata(
  themes: Record<string, Record<string, any>>, 
  originalDtcgJson: Record<string, any>
): TokenProcessingResult {
  const outputTokens: Record<string, any> = {};

  for (const [themeName, themeTokens] of Object.entries(themes)) {
    // Extract metadata for this theme by re-processing the original DTCG structure
    const themeMetadata: Record<string, Record<string, any>> = {};
    
    // Get the theme definition to understand which token sets are included
    const themeDefinition = originalDtcgJson.$themes?.find((t: any) => 
      t.$id === themeName || t.name === themeName || t.$name === themeName
    );
    if (themeDefinition) {
      const selectedTokenSets = themeDefinition.selectedTokenSets;
      
      if (Array.isArray(selectedTokenSets)) {
        // New format: array of objects with id and status
        for (const tokenSetRef of selectedTokenSets) {
          if (tokenSetRef.status === "enabled" || tokenSetRef.status === "source") {
            const setId = tokenSetRef.id;
            if (setId in originalDtcgJson) {
              const result = flattenTokensWithMetadata(originalDtcgJson[setId]);
              Object.assign(themeMetadata, result.metadata);
            }
          }
        }
      } else {
        // Old format: object with key-value pairs
        for (const [setName, status] of Object.entries(selectedTokenSets)) {
          if (status === "enabled" || status === "source") {
            if (setName in originalDtcgJson) {
              const result = flattenTokensWithMetadata(originalDtcgJson[setName]);
              Object.assign(themeMetadata, result.metadata);
            }
          }
        }
      }
    }

    // Process tokens as usual
    const stringTokens: Record<string, string> = {};
    for (const [key, value] of Object.entries(themeTokens)) {
      stringTokens[key] = String(value);
    }

    const tokenSet = new TokenSetResolver(stringTokens);
    const result = tokenSet.resolve();

    // Create enhanced output with metadata
    const enhancedTokens: Record<string, any> = {};
    for (const [key, value] of Object.entries(result.resolvedTokens)) {
      const computedValue = value?.toString() ?? value;
      enhancedTokens[key] = computedValue;
      
      // Add metadata properties if they exist
      if (themeMetadata[key]) {
        for (const [metaKey, metaValue] of Object.entries(themeMetadata[key])) {
          enhancedTokens[`${key}.${metaKey}`] = metaValue;
        }
      }
    }

    outputTokens[themeName] = { 
      tokens: enhancedTokens, 
      metadata: themeMetadata 
    };
  }

  return { 
    tokens: outputTokens,
    metadata: {} // Will be populated per theme
  };
}

// Transform system implementation
import type { 
  TokenTransform, 
  TransformOptions, 
  TransformResult,
  TokenObject,
  TokenObjectTransform,
  TokenObjectTransformOptions,
  TokenObjectResult
} from "./types";

export async function interpretTokensWithTransforms(
  tokenInput: Record<string, any>, 
  options: TransformOptions = {}
): Promise<TransformResult> {
  const { transforms = [], enableThemes = false, continueOnError = false } = options;
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // First, interpret tokens normally with metadata
    let result: TokenProcessingResult;
    
    if (enableThemes && tokenInput.$themes && Array.isArray(tokenInput.$themes)) {
      // Handle theme-based processing
      const themes = loadThemesFromJson(tokenInput);
      const themeResults = processThemesSyncWithMetadata(themes, tokenInput);
      
      // For themes, we need to flatten the result structure
      // Take the first theme if multiple themes exist
      const firstThemeName = Object.keys(themeResults.tokens)[0];
      if (firstThemeName && themeResults.tokens[firstThemeName]) {
        const themeData = themeResults.tokens[firstThemeName];
        result = {
          tokens: themeData.tokens,
          metadata: themeData.metadata
        };
      } else {
        result = { tokens: {}, metadata: {} };
      }
    } else {
      // Handle regular token processing
      result = interpretTokensWithMetadata(tokenInput);
    }

    // Apply transforms
    const transformedTokens: Record<string, any> = { ...result.tokens };
    const transformedMetadata: Record<string, any> = { ...result.metadata };

    for (const transform of transforms) {
      try {
        await applyTransform(transform, transformedTokens, transformedMetadata);
      } catch (error) {
        const errorMessage = `Transform "${transform.name}" failed: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMessage);
        
        if (!continueOnError) {
          throw new Error(errorMessage);
        }
      }
    }

    return {
      tokens: transformedTokens,
      metadata: transformedMetadata,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };

  } catch (error) {
    throw new Error(`Token processing with transforms failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function applyTransform(
  transform: TokenTransform,
  tokens: Record<string, any>,
  metadata: Record<string, any>
): Promise<void> {
  for (const [tokenName, tokenValue] of Object.entries(tokens)) {
    // Skip metadata properties (they have dots in the name like "token.$description")
    if (tokenName.includes(".$")) {
      continue;
    }

    const tokenMetadata = metadata[tokenName];
    const tokenType = tokenMetadata?.$type;

    // Check if this transform should be applied to this token type
    if (transform.targetTypes && transform.targetTypes.length > 0) {
      if (!tokenType || !transform.targetTypes.includes(tokenType)) {
        continue;
      }
    }

    // Apply value transform
    try {
      const transformedValue = await transform.transform(tokenValue, tokenMetadata, tokenName);
      tokens[tokenName] = transformedValue;
    } catch (error) {
      throw new Error(`Failed to transform token "${tokenName}": ${error instanceof Error ? error.message : String(error)}`);
    }

    // Apply metadata transform if provided
    if (transform.transformMetadata && tokenMetadata) {
      try {
        const transformedMeta = await transform.transformMetadata(tokenMetadata, tokenName);
        metadata[tokenName] = transformedMeta;
        
        // Update the flattened metadata properties in tokens
        for (const [metaKey, metaValue] of Object.entries(transformedMeta)) {
          tokens[`${tokenName}.${metaKey}`] = metaValue;
        }
      } catch (error) {
        throw new Error(`Failed to transform metadata for token "${tokenName}": ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
}

// Built-in transform creators
export function createFigmaColorTransform(): TokenTransform {
  return {
    name: "figma-colors",
    targetTypes: ["color"],
    transform: (value: string) => {
      return convertToFigmaColor(value);
    }
  };
}

export function createCustomTransform(config: {
  name: string;
  targetTypes?: string[];
  transform: (value: any, metadata?: any, tokenName?: string) => any;
  transformMetadata?: (metadata: any, tokenName?: string) => any;
}): TokenTransform {
  return {
    name: config.name,
    targetTypes: config.targetTypes,
    transform: config.transform,
    transformMetadata: config.transformMetadata
  };
}

// Color conversion utilities
function convertToFigmaColor(colorValue: string): { r: number; g: number; b: number; a: number } {
  // Handle hex colors
  if (colorValue.startsWith("#")) {
    return hexToFigmaColor(colorValue);
  }
  
  // Handle rgb() and rgba() colors
  if (colorValue.startsWith("rgb")) {
    return rgbToFigmaColor(colorValue);
  }
  
  // Handle hsl() colors
  if (colorValue.startsWith("hsl")) {
    return hslToFigmaColor(colorValue);
  }
  
  // Fallback for unknown formats
  throw new Error(`Unsupported color format: ${colorValue}`);
}

function hexToFigmaColor(hex: string): { r: number; g: number; b: number; a: number } {
  // Remove # and handle both 3 and 6 character hex
  let cleanHex = hex.replace("#", "");
  
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split("").map(char => char + char).join("");
  }
  
  if (cleanHex.length !== 6) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  
  return { r, g, b, a: 1 };
}

function rgbToFigmaColor(rgb: string): { r: number; g: number; b: number; a: number } {
  // Extract values from rgb(r, g, b) or rgba(r, g, b, a)
  const match = rgb.match(/rgba?\(([^)]+)\)/);
  if (!match) {
    throw new Error(`Invalid RGB color: ${rgb}`);
  }
  
  const values = match[1].split(",").map(v => v.trim());
  
  if (values.length < 3 || values.length > 4) {
    throw new Error(`Invalid RGB color: ${rgb}`);
  }
  
  const r = parseInt(values[0]) / 255;
  const g = parseInt(values[1]) / 255;
  const b = parseInt(values[2]) / 255;
  const a = values.length === 4 ? parseFloat(values[3]) : 1;
  
  return { r, g, b, a };
}

function hslToFigmaColor(hsl: string): { r: number; g: number; b: number; a: number } {
  // Extract values from hsl(h, s%, l%) or hsla(h, s%, l%, a)
  const match = hsl.match(/hsla?\(([^)]+)\)/);
  if (!match) {
    throw new Error(`Invalid HSL color: ${hsl}`);
  }
  
  const values = match[1].split(",").map(v => v.trim());
  
  if (values.length < 3 || values.length > 4) {
    throw new Error(`Invalid HSL color: ${hsl}`);
  }
  
  const h = parseInt(values[0]) / 360;
  const s = parseInt(values[1].replace("%", "")) / 100;
  const l = parseInt(values[2].replace("%", "")) / 100;
  const a = values.length === 4 ? parseFloat(values[3]) : 1;
  
  // Convert HSL to RGB
  const { r, g, b } = hslToRgb(h, s, l);
  
  return { r, g, b, a };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return { r, g, b };
}

/**
 * Check if the input has theme-based structure (DTCG with themes and tokenSets)
 */
function isThemeBasedInput(input: Record<string, any>): boolean {
  return !!(
    input &&
    typeof input === 'object' &&
    (input.themes || input.$themes) &&
    (input.tokenSets || input.$tokenSets)
  );
}
/**
 * Interpret tokens and return them as token objects with value, transformedValue, and metadata
 * @param tokenInput - Tokens in any supported format (flat or DTCG)
 * @param options - Transform and processing options
 * @returns Token objects with original values, transformed values, and metadata
 */
export function interpretTokensAsObjects(
  tokenInput: Record<string, any>,
  options: TokenObjectTransformOptions = {}
): TokenObjectResult {
  const { transforms = [], enableThemes = false, continueOnError = true } = options;
  
  try {
    let tokens: Record<string, any>;
    let metadata: Record<string, any>;

    // First, get tokens and metadata using existing processing
    if (enableThemes && (tokenInput.$themes && Array.isArray(tokenInput.$themes))) {
      // This is a complete DTCG file with themes - process like interpretTokensWithMetadata
      const themes = loadThemesFromJson(tokenInput);
      const result = processThemesSyncWithMetadata(themes, tokenInput);
      
      // Extract first theme for simplicity (could be enhanced to handle multiple themes)
      const themeNames = Object.keys(result.tokens);
      if (themeNames.length === 0) {
        throw new Error('No themes found in input');
      }
      
      const firstTheme = themeNames[0];
      tokens = result.tokens[firstTheme] || {};
      metadata = result.metadata || {};
    } else {
      // Use existing metadata processing
      const result = interpretTokensWithMetadata(tokenInput);
      tokens = result.tokens;
      metadata = result.metadata;
    }

    // Convert to token objects
    const tokenObjects: Record<string, TokenObject> = {};
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const [tokenName, tokenValue] of Object.entries(tokens)) {
      // Skip metadata tokens (those ending with .$property)
      if (tokenName.includes('.$')) {
        continue;
      }
      
      try {
        // Create base token object
        const tokenObject: TokenObject = {
          value: tokenValue, // Preserve original value
          ...(metadata[tokenName] || {}) // Add metadata
        };

        // Apply transforms
        let transformedObject = tokenObject;
        for (const transform of transforms) {
          try {
            // Check if transform applies to this token type
            if (transform.targetTypes && metadata[tokenName]?.$type) {
              if (!transform.targetTypes.includes(metadata[tokenName].$type)) {
                continue; // Skip this transform
              }
            }

            transformedObject = transform.transform(transformedObject, tokenName);
          } catch (error) {
            const errorMsg = `Transform "${transform.name}" failed for token "${tokenName}": ${error instanceof Error ? error.message : String(error)}`;
            errors.push(errorMsg);
            
            if (!continueOnError) {
              throw new Error(errorMsg);
            }
          }
        }

        tokenObjects[tokenName] = transformedObject;
      } catch (error) {
        const errorMsg = `Failed to process token "${tokenName}": ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMsg);
        
        if (!continueOnError) {
          throw new Error(errorMsg);
        }
      }
    }

    return {
      tokens: tokenObjects,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };

  } catch (error) {
    const errorMsg = `Token object processing failed: ${error instanceof Error ? error.message : String(error)}`;
    return {
      tokens: {},
      errors: [errorMsg]
    };
  }
}

/**
 * Create a Figma color transform for token objects
 * Adds transformedValue with Figma format while preserving original value
 */
export function createFigmaColorTransformForObjects(): TokenObjectTransform {
  return {
    name: "figma-color-objects",
    targetTypes: ["color"],
    transform: (tokenObject: TokenObject, tokenName?: string) => {
      try {
        // Parse the original color value
        const colorValue = tokenObject.value;
        if (typeof colorValue !== 'string') {
          return tokenObject; // Skip non-string values
        }

        const figmaColor = convertToFigmaColor(colorValue);
        
        return {
          ...tokenObject,
          transformedValue: figmaColor // Add transformed value while keeping original
        };
      } catch (error) {
        throw new Error(`Failed to transform color "${tokenObject.value}": ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  };
}

/**
 * Create a custom transform for token objects
 */
export function createCustomTransformForObjects(config: {
  name: string;
  targetTypes?: string[];
  transform: (tokenObject: TokenObject, tokenName?: string) => TokenObject;
}): TokenObjectTransform {
  return {
    name: config.name,
    targetTypes: config.targetTypes,
    transform: config.transform
  };
}
