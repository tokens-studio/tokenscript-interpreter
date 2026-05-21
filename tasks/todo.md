# Greedy Strings in Inline Mode

## Goal
Make unquoted string parsing in inline mode greedy — consume until whitespace or structural delimiter instead of breaking on every non-alphanumeric character. This makes `http://foo.bar` parse as a single string.

## Plan

- [x] Add `greedyStrings` option to `LexerOptions`
- [x] Implement greedy `isValidStringElementGreedy` logic (stop-set based)
- [x] Update `stringElement()` to gate keyword/format checks for non-simple tokens
- [x] Update `parseExpression()` to accept `ParseExpressionOptions` (lexerOptions + inlineMode)
- [x] Wire up in `TokenResolver.tryParseExpression()` — try inline+greedy, fallback to statement mode
- [x] Wire up in tolerant parser with `{ greedyStrings: true }`
- [x] Add tests for greedy string behavior (41 tests)
- [x] Run existing tests — all 1853 pass

## Changes

### Test adjustments
- `10rem^2` → `10rem ^ 2` (spaces needed — greedy mode absorbs `^` into string)
- Tolerant parser `foo.` test: now a complete parse (dot is part of string in greedy mode)
