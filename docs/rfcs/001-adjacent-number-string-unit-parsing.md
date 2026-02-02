# RFC 001: Adjacent Number-String Unit Parsing

## Status
**Rejected** - Approach attempted and abandoned due to cascading edge cases.

## Summary
Investigated changing the parsing behavior for adjacent number-string sequences (like `3s`, `3.3ms`) to be recognized as potential unit expressions at parse time rather than implicit lists.

## Problem Statement
When users register custom units (e.g., `s` for seconds, `ms` for milliseconds) via the UnitManager, expressions like `3.3s + 3.3ms` fail to parse correctly because:
1. The lexer doesn't recognize `s`/`ms` as FORMAT tokens (they're not in hardcoded `SupportedFormats` enum)
2. The parser creates `ImplicitListNode` instead of `ElementWithUnitNode`
3. Arithmetic operations fail because the AST structure is wrong

Current behavior:
- `3s` → `ImplicitListNode([NumNode(3), IdentifierNode("s")])` ✗
- `3px` → `ElementWithUnitNode(NumNode(3), "px")` ✓

The difference is that `px` is in the hardcoded `SupportedFormats` enum, while `s` is not.

## Attempted Approach: Parser-Level Detection Without Config

### Implementation
Created a new AST node `NumberWithPossibleUnitNode` and modified the parser's `number()` method to detect adjacent NUMBER + STRING tokens (no whitespace: `NUMBER.endPos === STRING.pos`):

```typescript
// In parser.ts number() method
if (
  this.currentToken.type === TokenType.STRING &&
  numToken.endPos === this.currentToken.pos
) {
  const unitIdentifier = this.currentToken.value as string;
  this.eat(TokenType.STRING);
  return new NumberWithPossibleUnitNode(node, unitIdentifier, numToken);
}
```

The interpreter would then check if the identifier is a registered unit and convert accordingly.

### Why It Failed

1. **`NumberWithUnitSymbol` validation**: The symbol constructor validates units against the `SupportedFormats` enum, throwing "Attribute 's' not found on Unit" for dynamic units. Would require significant changes to the symbol system.

2. **Implicit list edge cases**: Expressions like `1 * 1unknown` (number multiplied by implicit list) broke because the parser consumed `unknown` as part of `NumberWithPossibleUnitNode` instead of leaving it for implicit list handling.

3. **Fallback complexity**: When the identifier isn't a registered unit, converting back to implicit list behavior requires reconstructing the list in the interpreter, duplicating parser logic.

4. **Spec violation**: Per the language spec, `3NON_UNIT` should remain an implicit list `3 NON_UNIT`, but this approach would create `NumberWithPossibleUnitNode` for all adjacent number-identifier sequences.

5. **Cascading changes**: Fixing each edge case revealed new ones, requiring changes across lexer, parser, interpreter, and symbol system.

## Conclusion

The approach of detecting potential units at parse time without config knowledge creates too many edge cases and spec violations. The parser cannot make correct decisions about unit parsing without knowing which units are registered.

## Recommended Approach: Config-Aware Parser

The parser should be initialized with knowledge of registered unit keywords from the config. This allows:

1. Lexer to emit FORMAT tokens for registered units
2. Parser to create `ElementWithUnitNode` directly
3. No special-case handling needed
4. Spec-compliant behavior for non-unit identifiers

### Trade-offs
- **Con**: Parser requires config dependency
- **Pro**: Clean separation of concerns
- **Pro**: Consistent with how `SupportedFormats` already works
- **Pro**: No interpreter-level workarounds

## Related Files
- `src/types.ts` - `SupportedFormats` enum
- `src/interpreter/lexer.ts` - FORMAT token creation
- `src/interpreter/parser.ts` - `number()` method, `implicitListExpr()`
- `src/interpreter/ast.ts` - `ElementWithUnitNode`, `ImplicitListNode`
- `src/interpreter/config/managers/unit/manager.ts` - UnitManager

## Branch History
- `fix-sign-fn` - Contains the failed implementation attempt (do not merge)
