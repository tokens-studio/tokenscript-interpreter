import type { ASTNode } from "@interpreter/ast";
import { collectReferenceNodes } from "@interpreter/ast";
import { isSome } from "./type";

/**
 * Position of a reference in the original string
 */
type ReferencePosition = {
  start: number;
  end: number;
  oldName: string;
  newName: string;
};

/**
 * Rename references in a token value string using an AST and rename map
 *
 * @param originalValue - The original token value string
 * @param ast - The parsed AST of the token value
 * @param renameMap - Map of old names to new names { "old.name": "new.name" }
 * @returns The updated token value string with renamed references
 *
 * @example
 * const renameMap = { "color.primary": "color.main" };
 * const updated = renameReferences("{color.primary}", ast, renameMap);
 * // Returns: "{color.main}"
 *
 * @example
 * const renameMap = { "a": "x", "b": "y" };
 * const updated = renameReferences("{a} + {b}", ast, renameMap);
 * // Returns: "{x} + {y}"
 */
export function renameReferences(
  originalValue: string,
  ast: ASTNode,
  renameMap: Record<string, string>,
): string {
  const positions: ReferencePosition[] = [];

  // Collect positions for all references that need to be renamed
  for (const [oldName, newName] of Object.entries(renameMap)) {
    const references = collectReferenceNodes(ast, oldName);

    for (const ref of references) {
      if (isSome(ref.token.pos) && isSome(ref.token.endPos)) {
        positions.push({
          start: ref.token.pos,
          end: ref.token.endPos,
          oldName,
          newName,
        });
      }
    }
  }

  // Sort in reverse order for safe replacement (replace from end to start)
  // This way, earlier positions remain valid as we make replacements
  positions.sort((a, b) => b.start - a.start);

  // Apply replacements
  let result = originalValue;
  for (const pos of positions) {
    result = result.substring(0, pos.start) + pos.newName + result.substring(pos.end);
  }

  return result;
}
