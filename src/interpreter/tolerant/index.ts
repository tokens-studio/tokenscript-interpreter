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
import { ReferenceNode } from "../ast";
import { Lexer } from "../lexer";
import { Parser } from "../parser";
import { PartialReferenceNode } from "./partial-nodes";
import { type TolerantParseOptions, type TolerantParseResult, ParseState } from "./types";

// Re-export types and partial nodes
export * from "./types";
export * from "./partial-nodes";

/**
 * Parse tokenscript input tolerantly, returning partial AST nodes for incomplete input.
 *
 * @param text - The tokenscript text to parse
 * @param options - Parsing options
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
export function parseTolerantly(
  text: string,
  options?: TolerantParseOptions,
): TolerantParseResult {
  const inlineMode = options?.inlineMode ?? true;
  const lexer = new Lexer(text, { tolerant: true });
  const parser = new Parser(lexer, { tolerant: true });

  try {
    const ast = parser.parse(inlineMode);
    const incomplete = parser.getIncomplete();

    return {
      ast,
      state: incomplete.length > 0 ? ParseState.INCOMPLETE : ParseState.COMPLETE,
      incomplete,
      tokens: lexer.getAllTokens(),
    };
  } catch {
    // Even in tolerant mode, some errors might slip through
    // Return what we have so far
    return {
      ast: null,
      state: ParseState.INCOMPLETE,
      incomplete: parser.getIncomplete(),
      tokens: lexer.getAllTokens(),
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
  const lexer = new Lexer(text, { tolerant: true });
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
  walkASTForReferences(ast, refs);
  return refs;
}

/**
 * Helper function to walk AST and collect references
 */
function walkASTForReferences(node: ASTNode, refs: ReferenceInfo[]): void {
  if (!node) return;

  if (node instanceof ReferenceNode) {
    refs.push({
      name: node.value,
      isPartial: false,
      node,
    });
  } else if (node instanceof PartialReferenceNode) {
    refs.push({
      name: node.partialValue,
      isPartial: true,
      node,
    });
  }

  // Walk child nodes based on node type
  // Using duck typing to avoid importing all node types
  const anyNode = node as any;

  if (anyNode.left) walkASTForReferences(anyNode.left, refs);
  if (anyNode.right) walkASTForReferences(anyNode.right, refs);
  if (anyNode.expr) walkASTForReferences(anyNode.expr, refs);
  if (anyNode.elements) {
    for (const element of anyNode.elements) {
      walkASTForReferences(element, refs);
    }
  }
  if (anyNode.args) {
    for (const arg of anyNode.args) {
      walkASTForReferences(arg, refs);
    }
  }
  if (anyNode.astNode) walkASTForReferences(anyNode.astNode, refs);
  if (anyNode.statements) {
    if (Array.isArray(anyNode.statements)) {
      for (const stmt of anyNode.statements) {
        walkASTForReferences(stmt, refs);
      }
    } else {
      walkASTForReferences(anyNode.statements, refs);
    }
  }
  if (anyNode.condition) walkASTForReferences(anyNode.condition, refs);
  if (anyNode.body) walkASTForReferences(anyNode.body, refs);
  if (anyNode.value?.nodeType) walkASTForReferences(anyNode.value, refs);
  if (anyNode.assignmentExpr) walkASTForReferences(anyNode.assignmentExpr, refs);
  if (anyNode.conditions) {
    for (const cond of anyNode.conditions) {
      walkASTForReferences(cond, refs);
    }
  }
  if (anyNode.elseBody) walkASTForReferences(anyNode.elseBody, refs);
}

/**
 * Check if an AST contains any partial/incomplete nodes
 */
export function hasPartialNodes(ast: ASTNode | null): boolean {
  if (!ast) return false;

  const nodeType = ast.nodeType;
  if (
    nodeType === "PartialReferenceNode" ||
    nodeType === "PartialStringNode" ||
    nodeType === "PartialFunctionCallNode" ||
    nodeType === "PartialBinOpNode" ||
    nodeType === "PartialUnaryOpNode" ||
    nodeType === "PartialParenNode"
  ) {
    return true;
  }

  // Walk child nodes
  const anyNode = ast as any;

  if (anyNode.left && hasPartialNodes(anyNode.left)) return true;
  if (anyNode.right && hasPartialNodes(anyNode.right)) return true;
  if (anyNode.expr && hasPartialNodes(anyNode.expr)) return true;
  if (anyNode.elements) {
    for (const element of anyNode.elements) {
      if (hasPartialNodes(element)) return true;
    }
  }
  if (anyNode.args) {
    for (const arg of anyNode.args) {
      if (hasPartialNodes(arg)) return true;
    }
  }
  if (anyNode.astNode && hasPartialNodes(anyNode.astNode)) return true;

  return false;
}
