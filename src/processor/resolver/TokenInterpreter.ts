import type { ASTNode } from "@interpreter/ast";
import type { Config } from "@interpreter/config";
import { isLanguageError, ProcessorError, ProcessorErrorCode } from "@interpreter/errors";
import { Interpreter } from "@interpreter/interpreter";
import { parseExpression } from "@interpreter/parser";
import { DictionarySymbol, jsValueToSymbolType } from "@interpreter/symbols";
import type { ISymbolType } from "@src/types";
import { createDependencyError } from "../errors";
import type { ASTNodeMap, RefPath, ResolvedValueMap, TokenResult, TokenResultMap } from "./types";

/**
 * Handles token interpretation and dependency error checking.
 * Manages the interpreter instance and AST execution.
 */
export class TokenInterpreter {
  private readonly interpreter: Interpreter;
  private readonly astNodes: ASTNodeMap = new Map();
  private readonly parsedConstants: Map<string, ISymbolType> = new Map();

  constructor(
    private readonly referenceCache: ResolvedValueMap,
    private readonly config?: Config,
  ) {
    this.interpreter = new Interpreter(null, {
      references: this.referenceCache as Map<string, any>,
      config: this.config,
    });

    this.parseConstants();
  }

  private parseConstants(): void {
    if (!this.config) return;

    for (const [name, rawValue] of this.config.inlineConstants) {
      if (typeof rawValue === "string") {
        try {
          const { ast } = parseExpression(rawValue);
          if (ast) {
            const tempInterpreter = new Interpreter(ast, { config: this.config });
            const result = tempInterpreter.interpret();
            if (result !== null && typeof result !== "string") {
              this.parsedConstants.set(name, result);
            } else if (typeof result === "string") {
              this.parsedConstants.set(name, jsValueToSymbolType(result, this.config));
            }
          }
        } catch {
          // If parsing fails, store as string symbol
          this.parsedConstants.set(name, jsValueToSymbolType(rawValue, this.config));
        }
      } else {
        this.parsedConstants.set(name, jsValueToSymbolType(rawValue, this.config));
      }
    }
  }

  private injectConstants(): void {
    for (const [name, value] of this.parsedConstants) {
      this.interpreter.setSymbol(name, value.cloneIfMutable());
    }
  }

  setTokenAST(tokenName: RefPath, ast: ASTNode): void {
    this.astNodes.set(tokenName, ast);
  }

  getTokenAST(tokenName: RefPath): ASTNode | undefined {
    return this.astNodes.get(tokenName);
  }

  interpretToken(tokenName: RefPath, originalValue: string): TokenResult {
    const ast = this.astNodes.get(tokenName);

    if (!ast) {
      return originalValue;
    }

    return this.interpretTokenWithAST(tokenName, ast);
  }

  interpretTokenWithAST(_tokenName: RefPath, ast: ASTNode): TokenResult {
    try {
      this.interpreter.resetSymbolTable();
      this.injectConstants();
      this.interpreter.setAst(ast);
      return this.interpreter.interpret();
    } catch (error) {
      if (isLanguageError(error)) {
        return error;
      }
      return new Error("Unknown error during token interpretation", { cause: error });
    }
  }

  buildDependencyError(
    tokenName: RefPath,
    dependencies: Set<RefPath>,
    resolved: TokenResultMap,
    missingDependencies?: Set<RefPath>,
  ): ProcessorError | undefined {
    for (const dep of dependencies) {
      // Check resolved map first
      const depValue = resolved.get(dep);
      if (depValue instanceof Error) {
        return createDependencyError(tokenName, dep, depValue);
      }

      // Check if it's a missing dependency (explicitly marked as missing)
      if (missingDependencies?.has(dep)) {
        const error = new ProcessorError(ProcessorErrorCode.TOKEN_NOT_FOUND, {
          data: { tokenName: dep },
        });
        return createDependencyError(tokenName, dep, error);
      }
    }
    return undefined;
  }

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
