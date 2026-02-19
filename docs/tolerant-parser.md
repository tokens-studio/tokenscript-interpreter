# Tolerant Parser

The tolerant parser returns partial AST nodes instead of throwing errors on incomplete input. It is designed for editor integrations where users are actively typing and the input is frequently incomplete.

## Use cases

- **Autocomplete** — extract partial reference names to suggest completions
- **Live preview** — show color previews from incomplete `rgb(255, 128` calls
- **Syntax highlighting** — identify incomplete references, strings, and expressions
- **Validation** — distinguish complete from incomplete input without try/catch

## Inline-only constraint

The tolerant parser only operates on **inline expressions** (see [Inline Mode](tokenscript/inline-mode.md)). Statement-mode constructs (`if`, `while`, `var`, blocks) are not supported in tolerant mode. Attempting to use tolerant mode with statement parsing throws `PARSER_TOLERANT_REQUIRES_INLINE`.

## API

### `parseTolerantly(text: string): TolerantParseResult`

Parse tokenscript input tolerantly. Returns a result object instead of throwing on incomplete input.

```typescript
import { parseTolerantly, ParseState } from "tokenscript/interpreter";

const result = parseTolerantly("{color} + 5");
// result.state === ParseState.COMPLETE

const partial = parseTolerantly("{color");
// partial.state === ParseState.INCOMPLETE
// partial.ast instanceof PartialReferenceNode
```

### `tokenizeTolerantly(text: string): Token[]`

Tokenize input tolerantly, returning all tokens including partial ones (e.g., `PARTIAL_REFERENCE`, `PARTIAL_STRING`).

```typescript
import { tokenizeTolerantly } from "tokenscript/interpreter";

const tokens = tokenizeTolerantly("{color");
// tokens[0].type === "PARTIAL_REFERENCE"
```

### `collectAllReferences(ast: ASTNode | null): ReferenceInfo[]`

Walk an AST and collect all references, both complete and partial.

```typescript
import { parseTolerantly, collectAllReferences } from "tokenscript/interpreter";

const result = parseTolerantly("{color} + {foo");
const refs = collectAllReferences(result.ast);
// refs = [
//   { name: "color", isPartial: false, node: ReferenceNode },
//   { name: "foo", isPartial: true, node: PartialReferenceNode }
// ]
```

### `hasPartialNodes(ast: ASTNode | null): boolean`

Check if an AST contains any partial/incomplete nodes.

```typescript
import { parseTolerantly, hasPartialNodes } from "tokenscript/interpreter";

hasPartialNodes(parseTolerantly("1 + 2").ast);    // false
hasPartialNodes(parseTolerantly("1 +").ast);       // true
```

## `TolerantParseResult`

```typescript
interface TolerantParseResult {
  /** The parsed AST (may contain partial nodes if incomplete) */
  ast: ASTNode | null;
  /** Whether the input was complete or incomplete */
  state: ParseState;       // "complete" | "incomplete"
  /** List of incomplete constructs found */
  incomplete: IncompleteInfo[];
  /** All tokens parsed (including partial tokens) */
  tokens: Token[];
}
```

## Partial node types

| Node | Produced when | Key properties |
|---|---|---|
| `PartialReferenceNode` | `{color` — unclosed reference | `partialValue` |
| `PartialStringNode` | `"hello` — unclosed string | `partialValue`, `quoteType` |
| `PartialFunctionCallNode` | `rgb(255, 128` — unclosed function call | `name`, `args` |
| `PartialBinOpNode` | `1 +`, `5 >`, `true &&` — missing right operand | `left`, `op` |
| `PartialUnaryOpNode` | `-`, `!` — missing operand | `op` |
| `PartialParenNode` | `(1 + 2` — unclosed parenthesis | `expr` |

## `IncompleteType` enum

| Value | Meaning |
|---|---|
| `UNCLOSED_REFERENCE` | Missing closing `}` in reference |
| `UNCLOSED_STRING` | Missing closing quote in string |
| `UNCLOSED_PAREN` | Missing closing `)` in parenthesized expression |
| `UNCLOSED_FUNCTION` | Missing closing `)` in function call |
| `MISSING_OPERAND` | Missing right operand after binary/unary operator |

## Examples

### Autocomplete

```typescript
import { parseTolerantly, PartialReferenceNode } from "tokenscript/interpreter";

function getCompletions(input: string, allTokenNames: string[]): string[] {
  const result = parseTolerantly(input);
  if (!(result.ast instanceof PartialReferenceNode)) return [];

  const prefix = result.ast.partialValue;
  return allTokenNames.filter(name => name.startsWith(prefix));
}

getCompletions("{col", ["color", "column", "size"]);
// → ["color", "column"]
```

### Live color preview

```typescript
import { parseTolerantly, PartialFunctionCallNode } from "tokenscript/interpreter";

function getColorPreview(input: string): string | null {
  const result = parseTolerantly(input);
  const ast = result.ast;

  if (ast instanceof PartialFunctionCallNode && ast.name === "rgb") {
    const args = ast.args.map(a => (a as any).value ?? 0);
    return `rgb(${args[0] ?? 0}, ${args[1] ?? 0}, ${args[2] ?? 0})`;
  }
  return null;
}

getColorPreview("rgb(255, 128");
// → "rgb(255, 128, 0)"
```
