# Format/Unit Parsing Edge Cases

This document describes the edge cases around parsing dynamic format tokens (units like `px`, `s`, `ms`) and the solutions implemented.

## The Problem

When adding new unit keywords (e.g., `s` for seconds, `ms` for milliseconds) to the `SupportedFormats` enum, a conflict arises:

1. `3s` should mean "3 seconds" (number with unit)
2. `output.s` should mean "access attribute `s` on `output`"
3. `variable s: Number` should allow `s` as a variable name

The lexer doesn't have semantic context to know when `s` should be a FORMAT token vs a STRING token (identifier).

## Background: Implicit Lists and Implicit Strings

Understanding this issue requires knowledge of two Tokenscript features. For full documentation, see [Implicit Lists and Strings](../implicit-lists-and-strings.md).

### Implicit Strings

Unquoted text is treated as a string identifier:
```
hello        → StringSymbol("hello")
my-value     → StringSymbol("my-value")
```

### Implicit Lists

Adjacent expressions without operators form an implicit list:
```
hello world  → ListSymbol(["hello", "world"])
3 foo        → ListSymbol([3, "foo"])
red 500      → ListSymbol(["red", 500])
```

### The Interaction Problem

Without `s` in `SupportedFormats`, the expression `3s` is parsed as:
```
3s  → ImplicitListNode([NumNode(3), IdentifierNode("s")])
    → ListSymbol([3, "s"])
    → "3 s"
```

This means `3s + 2s` becomes an attempt to add two lists, which fails.

The critical distinction is **adjacency** (no whitespace):
- `3s` (adjacent) → should be number-with-unit
- `3 s` (whitespace) → should be implicit list

### Variable Shadowing Bug

Before the fix, if `s` was in `SupportedFormats`, variables named `s` would be shadowed:
```
> variable s: String = "hello"
> s
hello

> 3s           // Expected: 3 seconds
3 hello        // Actual: implicit list of [3, s] where s="hello"
```

This revealed that the FORMAT token should take precedence based on position, not just existence in the enum.

### Example of the Bug

Before the fix, adding `s` to `SupportedFormats` would break HSL color schemas:
```typescript
// In HSL color schema script:
output.s = saturation;  // BROKEN: 's' lexed as FORMAT, not identifier
```

And without adding `s` to `SupportedFormats`:
```typescript
3s + 2s  // BROKEN: Parsed as implicit list, not number-with-unit
```

## Attempted Solutions

### Attempt 1: Parser-Level Detection (NumberWithPossibleUnitNode)

**Approach**: Create a new AST node `NumberWithPossibleUnitNode` when the parser detects adjacent NUMBER + STRING tokens. Let the interpreter decide if it's a unit.

**Implementation**:
```typescript
// In parser.ts number() method
if (
  this.currentToken.type === TokenType.STRING &&
  numToken.endPos === this.currentToken.pos
) {
  return new NumberWithPossibleUnitNode(node, unitIdentifier, numToken);
}
```

**Why it failed**:

1. **NumberWithUnitSymbol validation**: The symbol constructor validates units against the `SupportedFormats` enum, throwing errors for dynamic units like `'s'`.

2. **Implicit list edge cases**: The parser's implicit list detection was too greedy. For `1 * 1unknown`:
   - Expected: `1 * ImplicitList([1, "unknown"])`
   - Actual: `1 * NumberWithPossibleUnitNode(1, "unknown")` → broke multiplication

3. **Fallback complexity**: When the interpreter determined the identifier wasn't a registered unit, it needed to reconstruct an implicit list. This duplicated parser logic and created inconsistent AST structures.

4. **Spec violation**: Per the language spec, `3NON_UNIT` (where `NON_UNIT` is not a registered unit) should remain an implicit list `[3, "NON_UNIT"]`. But this approach created `NumberWithPossibleUnitNode` for ALL adjacent number-identifier sequences, changing the AST structure even for non-units.

5. **Cascading changes**: Each fix revealed new edge cases requiring changes across lexer, parser, interpreter, and symbol system.

### Attempt 2: Config-Aware Parser

**Approach**: Pass config to the lexer so it knows which units are registered and can emit FORMAT tokens dynamically.

**Analysis**:
```
processTokens()
    └─> buildTokens(tokens, config)
        └─> TokenResolver.build(tokens, config)
            └─> parseExpression(text)  // Config available but not passed!
                └─> new Lexer(text)    // No config
```

**Why it was deferred**:
1. Requires threading config through multiple layers
2. Tests would need to provide config for dynamic unit tests
3. Identity guarantee concerns between parser and interpreter configs
4. More invasive changes across the codebase

This approach remains viable for truly dynamic units (registered at runtime via schemas), but is overkill for common units like `s` and `ms`.

## Final Solution: Position-Based Adjacency in Lexer

**Key Insight**: FORMAT tokens should only be emitted when immediately adjacent (no whitespace) to a NUMBER, RPAREN, or REFERENCE token.

### Implementation

Track the last "unitable" token (NUMBER, RPAREN, REFERENCE) and check position adjacency:

### Tracked Tokens

The following tokens set `_lastUnitableToken`:
- `NUMBER` - For `3s`, `3.5ms`
- `RPAREN` - For `(3px + 4px)rem` (unit conversion)
- `REFERENCE` - For `{x}rem` (reference with unit)

### Behavior

The key insight is that **whitespace determines interpretation**:

| Expression   | Previous Token   | Adjacent?       | Token Type | Interpretation                 |
|--------------|------------------|-----------------|------------|--------------------------------|
| `3s`         | NUMBER(3)        | Yes             | FORMAT     | NumberWithUnitSymbol(3, "s")   |
| `3 s`        | NUMBER(3)        | No (whitespace) | STRING     | ImplicitList([3, "s"])         |
| `output.s`   | DOT              | N/A             | STRING     | Attribute access               |
| `variable s` | RESERVED_KEYWORD | N/A             | STRING     | Variable declaration           |
| `(3)s`       | RPAREN           | Yes             | FORMAT     | NumberWithUnitSymbol(3, "s")   |
| `{x}rem`     | REFERENCE        | Yes             | FORMAT     | Reference with unit conversion |

When `s` is lexed as STRING (not FORMAT), the parser's implicit list rules apply, preserving the expected `3 s` → `[3, "s"]` behavior.

### Special Case: REFERENCE endPos

The REFERENCE token stores content positions (`pos`/`endPos` point to the reference name, not the braces). For adjacency checking, we store a modified token with `endPos` pointing after the closing `}`:

```typescript
// In reference():
const token: Token = {
  type: TokenType.REFERENCE,
  pos: refStartPos,      // Points to content start
  endPos: refEndPos,     // Points to content end (before })
  ...
};
// For adjacency, track position AFTER the closing brace
this._lastUnitableToken = { ...token, endPos: this.pos };
return token;
```

## Adding New Units

To add new unit keywords:

1. Add to `SupportedFormats` enum in `src/types.ts`:
```typescript
export enum SupportedFormats {
  // ... existing
  S = "s",
  MS = "ms",
}
```

2. The lexer automatically handles adjacency checking - no other changes needed.

## Related Files

- `src/types.ts` - `SupportedFormats` enum
- `src/interpreter/lexer.ts` - Tokenization with adjacency checking (`_lastUnitableToken`)
- `src/interpreter/parser.ts` - Has `isIdentifierToken()` helper for defensive handling

## Testing

Key test cases:
```typescript
// Units work
interpret("3s")           // "3s"
interpret("3s + 2s")      // "5s"
interpret("(3)s")         // "3s"

// Variables named 's' still work
interpret("variable s: Number = 5; s")      // 5
interpret("variable s: Number = 5; 3 + s")  // 8

// Attribute access works
interpret("output.s")  // accesses 's' attribute
```
