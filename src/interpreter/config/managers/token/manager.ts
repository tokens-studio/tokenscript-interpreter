import { filterAST, ReturnNode, StringNode } from "@interpreter/ast";
import { Interpreter } from "@interpreter/interpreter";
import { Lexer } from "@interpreter/lexer";
import { Parser } from "@interpreter/parser";
import {
  BooleanSymbol,
  ColorSymbol,
  DictionarySymbol,
  ListSymbol,
  StringSymbol,
  TokenSymbol,
} from "@interpreter/symbols";
import type { ASTNode, ISymbolType } from "@src/types";
import { ZodError } from "@tokens-studio/schema-validation";
import { BaseManager } from "../base-manager";
import {
  parseTokenSpec,
  type SpecItemsType,
  type SpecProperty,
  specName,
  type TokenSpecification,
} from "./schema";

type uriType = string;

/**
 * Result of validating a token value.
 * For nested validation failures, path indicates where the error occurred.
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  tokenType?: string;
  path?: (string | number)[]; // Path for nested errors, e.g., ["fontSize"] or ["shadows", 0, "blur"]
}

/** Maximum depth for nested token validation to prevent stack overflow */
const MAX_VALIDATION_DEPTH = 10;

export class TokenManager extends BaseManager<TokenSpecification, TokenSymbol, TokenSymbol> {
  /**
   * TokenScript validation scripts by token type.
   * The script receives {input} as the value to validate.
   * Should return true if valid, or a string error code if invalid.
   */
  private validationScripts: Map<string, string> = new Map();

  /**
   * Cached parsed ASTs for validation scripts.
   * Avoids re-parsing the same script on every validation call.
   */
  private validationAstCache = new Map<string, ASTNode | null>();

  /**
   * Cached Interpreter instances for validation scripts.
   * Reusing interpreters avoids recreating Config, SymbolTable, etc.
   */
  private validationInterpreterCache = new Map<string, Interpreter>();

  /**
   * TokenScript stringification scripts keyed by `tokenType\0formatKey`.
   * The script receives {input} (the resolved token value) and, for the
   * color path, {colorSpace} (the export's target color space). It should
   * return the formatted output string for that format.
   */
  private stringificationScripts: Map<string, string> = new Map();

  /** Cached parsed ASTs for stringification scripts. */
  private stringificationAstCache = new Map<string, ASTNode | null>();

  /** Cached Interpreter instances for stringification scripts. */
  private stringificationInterpreterCache = new Map<string, Interpreter>();

  /**
   * TokenScript normalization scripts by token type.
   * The script receives {input} as the resolved value and returns the
   * normalized value (e.g. bare number → number with unit).
   */
  private normalizationScripts: Map<string, string> = new Map();

  /** Cached parsed ASTs for normalization scripts. */
  private normalizationAstCache = new Map<string, ASTNode | null>();

  /** Cached Interpreter instances for normalization scripts. */
  private normalizationInterpreterCache = new Map<string, Interpreter>();

  protected getSpecName(spec: TokenSpecification): string {
    return specName(spec);
  }

  public getSpecByType(type: string): TokenSpecification | undefined {
    const uri = this.specTypes.get(type.toLowerCase());
    if (!uri) return;
    return this.getSpec(uri);
  }

  public clone(): this {
    const tokenManager = new TokenManager();
    tokenManager.specs = new Map(this.specs);
    tokenManager.specTypes = new Map(this.specTypes);
    tokenManager.conversions = new Map(this.conversions);
    tokenManager.validationScripts = new Map(this.validationScripts);
    tokenManager.validationAstCache = new Map(this.validationAstCache);
    tokenManager.validationInterpreterCache = new Map(this.validationInterpreterCache);
    tokenManager.stringificationScripts = new Map(this.stringificationScripts);
    tokenManager.stringificationAstCache = new Map(this.stringificationAstCache);
    tokenManager.stringificationInterpreterCache = new Map(this.stringificationInterpreterCache);
    tokenManager.normalizationScripts = new Map(this.normalizationScripts);
    tokenManager.normalizationAstCache = new Map(this.normalizationAstCache);
    tokenManager.normalizationInterpreterCache = new Map(this.normalizationInterpreterCache);
    return tokenManager as this;
  }

  public register(uri: uriType, spec: TokenSpecification | string): TokenSpecification {
    let parsedSpec: TokenSpecification;
    let rawInput: unknown;

    try {
      const input = typeof spec === "string" ? JSON.parse(spec) : spec;
      rawInput = input;
      parsedSpec = parseTokenSpec(input);
    } catch (err) {
      const summary =
        err instanceof ZodError
          ? err.issues.map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`).join("; ")
          : err instanceof Error
            ? err.message
            : String(err);
      const jsonSuffix = typeof spec === "string" ? `\nJson:\n${spec}` : "";
      throw new Error(`Invalid token specification for URI ${uri}: ${summary}${jsonSuffix}`);
    }

    this.specs.set(uri, parsedSpec);
    this.specTypes.set(specName(parsedSpec), uri);

    // Auto-register validation script if present in spec
    if (parsedSpec.validation) {
      this.registerValidation(parsedSpec.name, parsedSpec.validation);
    }

    // Auto-register normalization script if present in spec
    if (parsedSpec.normalization) {
      this.registerNormalization(parsedSpec.name, parsedSpec.normalization);
    }

    // Auto-register per-format stringification scripts if present in spec.
    // The schema field is `stringification: { <formatKey>: {type, script} }`.
    // Read from the raw input: `stringification` is not (yet) part of the
    // published schema-validation token schema, so the Zod parse strips it.
    // It is opaque to schema validation — same as the Go side reads it from
    // the raw spec JSON — so honour it directly off the original object.
    const specStringification = (
      rawInput as {
        stringification?: Record<string, string | { type: string; script: string }>;
      }
    ).stringification;
    if (specStringification) {
      for (const [formatKey, block] of Object.entries(specStringification)) {
        this.registerStringification(parsedSpec.name, formatKey, block);
      }
    }

    return parsedSpec;
  }

  /**
   * Register a TokenScript validation script for a token type.
   * The script receives {input} as the value to validate.
   * Accepts either a string (direct script) or an object with type and script properties (built schema).
   */
  public registerValidation(
    tokenType: string,
    validation: string | { type: string; script: string },
  ): void {
    const normalizedType = tokenType.toLowerCase();
    // If validation is an object with script property (from built schema), extract the script
    const script = typeof validation === "string" ? validation : validation.script;
    this.validationScripts.set(normalizedType, script);
    // Invalidate caches when script changes
    this.validationAstCache.delete(normalizedType);
    this.validationInterpreterCache.delete(normalizedType);
  }

  /**
   * Get validation script for a token type.
   */
  public getValidation(tokenType: string): string | undefined {
    return this.validationScripts.get(tokenType.toLowerCase());
  }

  /**
   * Register a TokenScript normalization script for a token type.
   * The script receives {input} as the resolved value and returns the
   * normalized form (e.g. bare 300 → 300ms for duration tokens).
   * Accepts either a string (direct script) or an object with type and script properties.
   */
  public registerNormalization(
    tokenType: string,
    normalization: string | { type: string; script: string },
  ): void {
    const normalizedType = tokenType.toLowerCase();
    const script = typeof normalization === "string" ? normalization : normalization.script;
    this.normalizationScripts.set(normalizedType, script);
    this.normalizationAstCache.delete(normalizedType);
    this.normalizationInterpreterCache.delete(normalizedType);
  }

  /**
   * Get normalization script for a token type.
   */
  public getNormalization(tokenType: string): string | undefined {
    return this.normalizationScripts.get(tokenType.toLowerCase());
  }

  /**
   * Normalize a resolved token value using the token type's normalization script.
   * Returns the normalized value, or the original value if no script is registered
   * or execution fails.
   */
  public normalize(tokenType: string, value: ISymbolType): ISymbolType {
    const normalizedType = tokenType.toLowerCase();
    const script = this.normalizationScripts.get(normalizedType);
    if (!script) return value;

    try {
      let interpreter = this.normalizationInterpreterCache.get(normalizedType);

      if (!interpreter) {
        let ast = this.normalizationAstCache.get(normalizedType);
        if (ast === undefined) {
          ast = new Parser(new Lexer(script)).parse();
          this.normalizationAstCache.set(normalizedType, ast);
        }

        interpreter = new Interpreter(ast, {
          config: this.parentConfig ?? undefined,
        });
        this.normalizationInterpreterCache.set(normalizedType, interpreter);
      }

      interpreter.resetSymbolTable();
      interpreter.setReference("input", value);

      const result = interpreter.interpret();
      if (result != null && typeof result === "object" && "type" in result) {
        return result as ISymbolType;
      }
      return value;
    } catch {
      return value;
    }
  }

  /** Map key for a (tokenType, formatKey) stringification pair. */
  private stringifyKey(tokenType: string, formatKey: string): string {
    return `${tokenType.toLowerCase()}\u0000${formatKey}`;
  }

  /**
   * Register a TokenScript stringification script for a token type and output
   * format (e.g. "css"). The script receives {input} (the resolved value) and
   * should return the formatted output string. Accepts either a raw script
   * string or a {type, script} block (from a built schema).
   */
  public registerStringification(
    tokenType: string,
    formatKey: string,
    stringification: string | { type: string; script: string },
  ): void {
    const key = this.stringifyKey(tokenType, formatKey);
    const script = typeof stringification === "string" ? stringification : stringification.script;
    this.stringificationScripts.set(key, script);
    // Invalidate caches when script changes
    this.stringificationAstCache.delete(key);
    this.stringificationInterpreterCache.delete(key);
  }

  /** Get the stringification script for a token type and format, if any. */
  public getStringification(tokenType: string, formatKey: string): string | undefined {
    return this.stringificationScripts.get(this.stringifyKey(tokenType, formatKey));
  }

  /** Whether a stringification script is registered for a token type and format. */
  public hasStringification(tokenType: string, formatKey: string): boolean {
    return this.stringificationScripts.has(this.stringifyKey(tokenType, formatKey));
  }

  /**
   * Stringify a resolved token value for the given format. Before the script
   * runs, the value's scalar leaves are walked: color leaves are rendered to
   * their literal string form (valid CSS for manager-backed colors), so the
   * script only ever interpolates strings/numbers — never live color objects.
   *
   * Returns the formatted string, or `undefined` if no script is registered
   * or execution fails.
   *
   * This is the always-resolved path for non-color token types (gradient,
   * border, shadow, fontFamily, cubicBezier). Color types use
   * {@link stringifyColor}.
   */
  public stringify(tokenType: string, formatKey: string, value: ISymbolType): string | undefined {
    const prepared = this.prepareStringifyValue(value);
    return this.runStringificationScript(tokenType, formatKey, { input: prepared });
  }

  /**
   * Stringify a color token, passing the raw color as {input} (NOT
   * pre-stringified) and the export's target color space as {colorSpace}. The
   * script converts ({input}.to(colorSpace)) and renders the channels itself —
   * color conversion lives in TokenScript, not here.
   *
   * Returns the formatted string, or `undefined` when no script is registered,
   * execution fails, or the script yields an empty string (the convention by
   * which a script defers a color space it does not render back to the
   * caller's fallback formatter).
   */
  public stringifyColor(
    tokenType: string,
    formatKey: string,
    value: ISymbolType,
    colorSpace: string,
  ): string | undefined {
    const result = this.runStringificationScript(tokenType, formatKey, {
      input: value,
      colorSpace: new StringSymbol(colorSpace),
    });
    if (result === "") {
      return undefined;
    }
    return result;
  }

  /**
   * Run a stringification script with the given references bound. Uses a cached
   * Interpreter when available to avoid recreation overhead. Returns the script
   * result coerced to a string, or `undefined` if no script is registered or
   * execution fails.
   */
  private runStringificationScript(
    tokenType: string,
    formatKey: string,
    references: Record<string, ISymbolType>,
  ): string | undefined {
    const key = this.stringifyKey(tokenType, formatKey);
    const script = this.stringificationScripts.get(key);
    if (!script) {
      return undefined;
    }

    try {
      let interpreter = this.stringificationInterpreterCache.get(key);
      if (!interpreter) {
        let ast = this.stringificationAstCache.get(key);
        if (ast === undefined) {
          ast = new Parser(new Lexer(script)).parse();
          this.stringificationAstCache.set(key, ast);
        }
        interpreter = new Interpreter(ast, {
          config: this.parentConfig ?? undefined,
        });
        this.stringificationInterpreterCache.set(key, interpreter);
      }

      interpreter.resetSymbolTable();
      for (const [name, symbol] of Object.entries(references)) {
        interpreter.setReference(name, symbol);
      }

      const result = interpreter.interpret();
      if (result instanceof StringSymbol) {
        return result.value as string;
      }
      if (result === null || result === undefined) {
        return undefined;
      }
      // Non-string result: coerce via toString (mirrors the Go resolver).
      return result.toString();
    } catch {
      return undefined;
    }
  }

  /**
   * Walk a value and rewrite its scalar leaves so a stringification script only
   * ever interpolates strings/numbers. Color leaves are replaced with their
   * literal string form; all other scalars pass through untouched. Dictionaries
   * and lists are rebuilt recursively.
   */
  private prepareStringifyValue(value: ISymbolType): ISymbolType {
    if (value instanceof DictionarySymbol) {
      const entries = new Map<string, ISymbolType>();
      for (const [k, v] of value.value) {
        entries.set(k, this.prepareStringifyValue(v));
      }
      return new DictionarySymbol(entries, this.parentConfig ?? undefined);
    }
    if (value instanceof ListSymbol) {
      const elements = value.value.map((el) => this.prepareStringifyValue(el));
      return new ListSymbol(elements, value.isImplicit, this.parentConfig ?? undefined);
    }
    if (value instanceof ColorSymbol) {
      return new StringSymbol(value.toString(), this.parentConfig ?? undefined);
    }
    return value;
  }

  /**
   * Get possible error codes from validation scripts by walking the AST.
   * Finds all return statements that return string literals (error codes).
   *
   * @param tokenType - Optional token type to get errors for. If omitted, returns all error types.
   * @returns Array of error code strings
   */
  public validationErrorTypes(tokenType?: string): string[] {
    if (tokenType) {
      return this.extractErrorTypesFromAST(tokenType);
    }

    // Get all error types from all registered validation scripts
    const allErrors = new Set<string>();
    for (const type of this.validationScripts.keys()) {
      for (const error of this.extractErrorTypesFromAST(type)) {
        allErrors.add(error);
      }
    }
    return Array.from(allErrors);
  }

  /**
   * Extract error codes from a validation script's AST.
   * Walks the tree and returns string values from return statements.
   */
  private extractErrorTypesFromAST(tokenType: string): string[] {
    const normalizedType = tokenType.toLowerCase();
    const script = this.validationScripts.get(normalizedType);
    if (!script) {
      return [];
    }

    // Use cached AST if available, otherwise parse and cache
    let ast = this.validationAstCache.get(normalizedType);
    if (ast === undefined) {
      try {
        ast = new Parser(new Lexer(script)).parse();
        this.validationAstCache.set(normalizedType, ast);
      } catch {
        return [];
      }
    }

    if (!ast) {
      return [];
    }

    // Find all return statements and extract string literals
    const returnNodes = filterAST<ReturnNode>(ast, (node) => node instanceof ReturnNode);
    const errorTypes: string[] = [];

    for (const returnNode of returnNodes) {
      if (returnNode.expr instanceof StringNode) {
        errorTypes.push(returnNode.expr.value);
      }
    }

    return errorTypes;
  }

  /**
   * Validate a token value against its type using TokenScript.
   * Automatically performs deep validation for nested token properties.
   * Returns an array of validation results (empty or single valid result if all pass).
   *
   * @param tokenType - The token type name (e.g., "typography", "color")
   * @param value - The symbol value to validate
   * @param visitedUrls - Set of URLs already visited (for circular reference detection)
   * @param basePath - Path prefix for nested validation errors
   * @param depth - Current nesting depth (for max depth protection)
   */
  public validate(
    tokenType: string,
    value: ISymbolType,
    visitedUrls: Set<string> = new Set(),
    basePath: (string | number)[] = [],
    depth: number = 0,
  ): ValidationResult[] {
    // Check max depth to prevent stack overflow
    if (depth > MAX_VALIDATION_DEPTH) {
      return [
        {
          valid: false,
          error: "MAX_VALIDATION_DEPTH_EXCEEDED",
          tokenType,
          path: basePath.length > 0 ? basePath : undefined,
        },
      ];
    }

    const results: ValidationResult[] = [];

    // 1. Run top-level validation script
    const topLevelResult = this.runValidationScript(tokenType, value, basePath);
    if (!topLevelResult.valid) {
      results.push(topLevelResult);
      return results; // Early return on top-level failure
    }

    // 2. Get the spec for this token type to check for nested properties
    const spec = this.getSpecByType(tokenType);
    if (!spec?.schema) {
      return [{ valid: true, tokenType }]; // No schema
    }

    // 3. Handle list types with items
    if (spec.schema.type === "list" && spec.schema.items) {
      const listResults = this.validateListItems(
        value,
        spec.schema.items,
        visitedUrls,
        basePath,
        depth,
      );
      results.push(...listResults);

      if (results.length > 0) {
        return results;
      }
      return [{ valid: true, tokenType }];
    }

    // 4. Handle object types with properties
    if (!spec.schema.properties) {
      return [{ valid: true, tokenType }]; // No nested properties
    }

    // 5. Get the value map for nested property access
    const valueMap = this.getValueMap(value);
    if (!valueMap) {
      return [{ valid: true, tokenType }];
    }

    // 6. Validate nested token properties
    const propResults = this.validateObjectProperties(
      valueMap,
      spec.schema.properties,
      visitedUrls,
      basePath,
      depth,
    );
    results.push(...propResults);

    // Return failures or single valid result
    if (results.length > 0) {
      return results;
    }
    return [{ valid: true, tokenType }];
  }

  /**
   * Validate items in a list against an items schema.
   * Each item is validated and errors include the index in the path.
   */
  private validateListItems(
    value: ISymbolType,
    itemsSpec: SpecItemsType,
    visitedUrls: Set<string>,
    basePath: (string | number)[],
    depth: number,
  ): ValidationResult[] {
    const results: ValidationResult[] = [];

    // Get the list
    if (!(value instanceof ListSymbol)) {
      return results; // Not a list, validation script should have caught this
    }

    const items = value.value;

    // Validate each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemPath = [...basePath, i];

      // Handle object items with properties
      if (itemsSpec.type === "object" && itemsSpec.properties) {
        const itemMap = this.getValueMap(item);
        if (itemMap) {
          const propResults = this.validateObjectProperties(
            itemMap,
            itemsSpec.properties,
            visitedUrls,
            itemPath,
            depth + 1,
          );
          results.push(...propResults);
        }
      }

      // Handle token items (direct reference to another token type)
      if (itemsSpec.type === "token" && itemsSpec.url) {
        const referencedSpec = this.getSpec(itemsSpec.url);
        if (referencedSpec) {
          const newVisited = new Set(visitedUrls);
          newVisited.add(itemsSpec.url);

          const nestedResults = this.validate(
            referencedSpec.name,
            item,
            newVisited,
            itemPath,
            depth + 1,
          );

          for (const result of nestedResults) {
            if (!result.valid) {
              results.push(result);
            }
          }
        }
      }
    }

    return results;
  }

  /**
   * Validate properties of an object against a properties schema.
   */
  private validateObjectProperties(
    valueMap: Map<string, ISymbolType>,
    properties: Record<string, SpecProperty>,
    visitedUrls: Set<string>,
    basePath: (string | number)[],
    depth: number,
  ): ValidationResult[] {
    const results: ValidationResult[] = [];

    for (const [propName, propSpec] of Object.entries(properties)) {
      const typedPropSpec = propSpec as SpecProperty;
      if (typedPropSpec.type !== "token" || !typedPropSpec.url) {
        continue;
      }

      // Circular reference detection
      if (visitedUrls.has(typedPropSpec.url)) {
        results.push({
          valid: false,
          error: "CIRCULAR_REFERENCE",
          tokenType: typedPropSpec.url,
          path: [...basePath, propName],
        });
        continue;
      }

      // Get the property value
      const propValue = valueMap.get(propName);
      if (!propValue) {
        continue; // Property not present, skip
      }

      // Look up referenced spec
      const referencedSpec = this.getSpec(typedPropSpec.url);
      if (!referencedSpec) {
        continue; // Spec not registered, skip
      }

      // Recursively validate with updated visited set, path, and depth
      const newVisited = new Set(visitedUrls);
      newVisited.add(typedPropSpec.url);

      const nestedResults = this.validate(
        referencedSpec.name,
        propValue,
        newVisited,
        [...basePath, propName],
        depth + 1,
      );

      // Collect any failures
      for (const result of nestedResults) {
        if (!result.valid) {
          results.push(result);
        }
      }
    }

    return results;
  }

  /**
   * Run the validation script for a token type.
   * Internal method used by validate().
   * Uses cached Interpreter when available to avoid recreation overhead.
   */
  private runValidationScript(
    tokenType: string,
    value: ISymbolType,
    path: (string | number)[] = [],
  ): ValidationResult {
    const normalizedType = tokenType.toLowerCase();
    const script = this.getValidation(tokenType);
    if (!script) {
      return { valid: true, tokenType };
    }

    try {
      // Get or create cached interpreter for this token type
      let interpreter = this.validationInterpreterCache.get(normalizedType);

      if (!interpreter) {
        // Parse AST (use cached if available)
        let ast = this.validationAstCache.get(normalizedType);
        if (ast === undefined) {
          ast = new Parser(new Lexer(script)).parse();
          this.validationAstCache.set(normalizedType, ast);
        }

        // Create and cache interpreter
        interpreter = new Interpreter(ast, {
          config: this.parentConfig ?? undefined,
        });
        this.validationInterpreterCache.set(normalizedType, interpreter);
      }

      // Reset state and set new input reference
      interpreter.resetSymbolTable();
      interpreter.setReference("input", value);

      const result = interpreter.interpret();

      if (result instanceof BooleanSymbol && result.value === true) {
        return { valid: true, tokenType };
      }
      if (result instanceof StringSymbol) {
        return {
          valid: false,
          error: result.value as string,
          tokenType,
          path: path.length > 0 ? path : undefined,
        };
      }
      return {
        valid: false,
        error: "VALIDATION_INVALID_RESULT",
        tokenType,
        path: path.length > 0 ? path : undefined,
      };
    } catch (error) {
      return {
        valid: false,
        error: `VALIDATION_ERROR: ${error instanceof Error ? error.message : String(error)}`,
        tokenType,
        path: path.length > 0 ? path : undefined,
      };
    }
  }

  /**
   * Extract a Map from various symbol types that can contain key-value pairs.
   */
  private getValueMap(value: ISymbolType): Map<string, ISymbolType> | null {
    if (value instanceof DictionarySymbol) {
      return value.value;
    }
    if (value instanceof TokenSymbol && value.value instanceof Map) {
      return value.value;
    }
    return null;
  }
}
