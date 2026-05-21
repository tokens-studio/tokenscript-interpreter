/**
 * Tolerant Parser for Tokenscript
 *
 * This module provides a tolerant parsing mode that can handle incomplete tokenscript
 * values while the user is typing. Instead of throwing errors on incomplete input,
 * the parser returns partial AST nodes with metadata about what's incomplete.
 *
 * Use cases:
 * - Syntax highlighting for incomplete references (e.g., `{color` highlighted as partial)
 * - Autocomplete suggestions (e.g., `{foo.ba|` - suggest completions)
 * - Live color display for incomplete color functions (e.g., `rgb(255, 128`)
 */

import type { ASTNode, Token } from "@src/types";
import { ReferenceNode, walkAST } from "../ast";
import { Lexer } from "../lexer";
import { Parser, lexerOptionsForMode } from "../parser";
import { PartialReferenceNode } from "./partial-nodes";
import { ParseState, type TolerantParseResult } from "./types";

// Re-export types and partial nodes
export * from "./partial-nodes";
export * from "./types";

/**
 * Parse tokenscript input tolerantly, returning partial AST nodes for incomplete input.
 *
 * @param text - The tokenscript text to parse
 * @returns Parse result containing AST, state, and incomplete info
 *
 * @example
 * ```typescript
 * // Parse incomplete reference
 * const result = parseTolerantly("{color");
 * if (result.state === ParseState.INCOMPLETE) {
 *   console.log("Incomplete reference:", result.ast);
 * }
 *
 * // Parse incomplete function call
 * const result2 = parseTolerantly("rgb(255, 128");
 * // result2.ast will be a PartialFunctionCallNode
 * ```
 */
export function parseTolerantly(text: string): TolerantParseResult {
  const lexer = new Lexer(text, lexerOptionsForMode("inline", { tolerant: true }));

  try {
    const parser = new Parser(lexer, { tolerant: true });
    const ast = parser.parse(true);
    const incomplete = parser.getIncomplete();

    return {
      ast,
      state: incomplete.length > 0 ? ParseState.INCOMPLETE : ParseState.COMPLETE,
      incomplete,
      tokens: lexer.getAllTokens(),
    };
  } catch (e) {
    // Even in tolerant mode, some errors might slip through
    // Return what we have so far, with the error attached for debugging
    return {
      ast: null,
      state: ParseState.INCOMPLETE,
      incomplete: [],
      tokens: lexer.getAllTokens(),
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

/**
 * Tokenize input tolerantly and return all tokens including partial ones.
 *
 * @param text - The tokenscript text to tokenize
 * @returns Array of tokens
 *
 * @example
 * ```typescript
 * const tokens = tokenizeTolerantly("{color");
 * // tokens[0] will be a PARTIAL_REFERENCE token
 * ```
 */
export function tokenizeTolerantly(text: string): Token[] {
  const lexer = new Lexer(text, lexerOptionsForMode("inline", { tolerant: true }));
  return lexer.tokenizeAll();
}

/**
 * Reference information extracted from an AST
 */
export interface ReferenceInfo {
  /** The reference name (e.g., "color.primary") */
  name: string;
  /** Whether this is a partial/incomplete reference */
  isPartial: boolean;
  /** The AST node */
  node: ReferenceNode | PartialReferenceNode;
}

/**
 * Collect all references from a tolerant parse result, including partial references.
 *
 * @param ast - The AST node to search
 * @returns Array of reference information
 *
 * @example
 * ```typescript
 * const result = parseTolerantly("{color} + {foo");
 * const refs = collectAllReferences(result.ast);
 * // refs = [
 * //   { name: "color", isPartial: false, node: ReferenceNode },
 * //   { name: "foo", isPartial: true, node: PartialReferenceNode }
 * // ]
 * ```
 */
export function collectAllReferences(ast: ASTNode | null): ReferenceInfo[] {
  if (!ast) return [];

  const refs: ReferenceInfo[] = [];
  walkAST(ast, (node) => {
    if (node instanceof ReferenceNode) {
      refs.push({ name: node.value, isPartial: false, node });
    } else if (node instanceof PartialReferenceNode) {
      refs.push({ name: node.partialValue, isPartial: true, node });
    }
  });
  return refs;
}

const PARTIAL_FOUND = Symbol("PARTIAL_FOUND");

/**
 * Check if an AST contains any partial/incomplete nodes
 */
export function hasPartialNodes(ast: ASTNode | null): boolean {
  if (!ast) return false;

  try {
    walkAST(ast, (node) => {
      if (node.nodeType.startsWith("Partial")) {
        throw PARTIAL_FOUND;
      }
    });
    return false;
  } catch (e) {
    if (e === PARTIAL_FOUND) return true;
    throw e;
  }
}
