# Inline Mode

Inline mode is the expression-only subset of tokenscript used when evaluating token `$value` fields. It parses a single expression (which may be a comma-separated list) rather than a full program with statements.

## When inline mode is used

- Token `$value` evaluation — every token value is parsed in inline mode
- The tolerant parser always operates in inline mode
- `parser.parse(true)` activates inline mode

## Supported constructs

| Construct | Example |
|---|---|
| Numbers | `42`, `3.14` |
| Numbers with units | `16px`, `1.5s`, `200ms` |
| Strings (bare identifiers) | `red`, `bold` |
| Explicit strings | `"hello world"` |
| Hex colors | `#FF0000`, `#fff` |
| References | `{color.primary}`, `{spacing.base}` |
| Arithmetic | `{base} * 2`, `{a} + {b}` |
| Comparison | `{x} > 10`, `{a} == {b}` |
| Logical operators | `{a} && {b}`, `{x} \|\| {fallback}` |
| Unary operators | `-{value}`, `!{flag}` |
| Function calls | `rgb(255, 128, 64)`, `mix({a}, {b}, 50)` |
| Attribute access | `{color}.lightness()`, `{token}.value` |
| Parenthesized expressions | `({a} + {b}) * 2` |
| Comma-separated lists | `{r}, {g}, {b}` |
| Implicit (whitespace) lists | `{size} {style} {color}` |
| Booleans | `true`, `false` |
| Null | `null` |

## Not supported in inline mode

These constructs are only available in statement mode (schema/function bodies):

- `if` / `elif` / `else` conditionals
- `while` loops
- `var` declarations (e.g., `var x: Number = 10`)
- Variable reassignment (e.g., `x = 20`)
- `return` statements
- `[...]` blocks
- `;` statement separators

## Parse call chain

When inline mode is active, the parser enters through `listExpr` and follows this chain:

```
parse(inlineMode=true)
  → listExpr            (comma-separated list)
    → implicitListExpr   (whitespace-separated implicit list)
      → expr             (&&, ||)
        → logicTerm      (+, -)
          → comparison   (==, !=, >, <, >=, <=)
            → term       (*, /)
              → power    (^)
                → factor (unary, number, paren, reference, hex, string, identifier/funcall)
                  → functionCall  (args)
                  → attributeAccess (.property, .method())
```

## Examples

```tokenscript
# Simple arithmetic
{spacing.base} * 2

# Color function
rgb({r}, {g}, {b})

# Comparison with fallback
{value} > 0 && {value} || {fallback}

# Implicit list (CSS shorthand)
{width} solid {color}

# Chained attribute access
{color}.lightness() * 1.2
```
