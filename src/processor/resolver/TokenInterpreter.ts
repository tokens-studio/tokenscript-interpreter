import type { ASTNode } from "@interpreter/ast";
import type { Config } from "@interpreter/config";
import { Interpreter } from "@interpreter/interpreter";
import { DictionarySymbol } from "@interpreter/symbols";
import type { ISymbolType } from "@src/types";
import { DependencyError } from "../errors";
import type { CachedValue, RefPath, TokenResult } from "./types";

/**
 * Handles token interpretation and dependency error checking.
 * Manages the interpreter instance and AST execution.
 */
export class TokenInterpreter {
  private readonly interpreter: Interpreter;
  private readonly astNodes = new Map<RefPath, ASTNode>();

  constructor(
    private readonly referenceCache: Map<string, CachedValue>,
    private readonly config?: Config,
  ) {
    this.interpreter = new Interpreter(null, {
      references: this.referenceCache as Map<string, any>,
      config: this.config,
    });
  }

  /**
   * Store AST for a token
   */
  setTokenAST(tokenName: RefPath, ast: ASTNode): void {
    this.astNodes.set(tokenName, ast);
  }

  /**
   * Get AST for a token
   */
  getTokenAST(tokenName: RefPath): ASTNode | undefined {
    return this.astNodes.get(tokenName);
  }

  /**
   * Interpret a token using its stored AST
   */
  interpretToken(tokenName: RefPath, originalValue: string): TokenResult {
    const ast = this.astNodes.get(tokenName);

    if (!ast) {
      return originalValue;
    }

    try {
      this.interpreter.resetSymbolTable();
      this.interpreter.setAst(ast);
      return this.interpreter.interpret();
    } catch (error) {
      return error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Check if a token has dependency errors and build appropriate error
   */
  buildDependencyError(
    tokenName: RefPath,
    dependencies: Set<string>,
    resolved: Map<RefPath, TokenResult>,
  ): DependencyError | undefined {
    for (const dep of dependencies) {
      const depValue = resolved.get(dep);
      if (depValue instanceof Error) {
        return new DependencyError(tokenName, dep, depValue);
      }
    }
    return undefined;
  }

  /**
   * Flatten a dictionary symbol into the reference cache
   * Returns list of flattened reference paths
   */
  flattenDictionaryToCache(tokenName: RefPath, value: TokenResult): RefPath[] {
    if (!(value instanceof DictionarySymbol) || !value.value) {
      return [];
    }

    const flattenedNames: RefPath[] = [];
    const entries = value.value;

    for (const [childKey, childValue] of entries) {
      const flattenedKey = `${tokenName}.${childKey}`;
      const clone = this.isSymbolType(childValue) ? childValue.cloneIfMutable() : childValue;
      this.referenceCache.set(flattenedKey, clone);
      flattenedNames.push(flattenedKey);
    }

    return flattenedNames;
  }

  /**
   * Update reference cache with a resolved token value
   */
  updateReferenceCache(tokenName: RefPath, value: TokenResult): void {
    if (value instanceof Error) return;
    this.referenceCache.set(tokenName, value);
  }

  private isSymbolType(value: unknown): value is ISymbolType {
    return Boolean(
      value &&
        typeof value === "object" &&
        typeof (value as ISymbolType).cloneIfMutable === "function",
    );
  }
}
