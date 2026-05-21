# Inline Mode

Inline mode is the expression-only subset of tokenscript used when evaluating token `$value` fields. It parses a single expression (which may be a comma-separated list) rather than a full program with statements.

## When inline mode is used

- Token `$value` evaluation — every token value is first parsed in inline mode (with a fallback to statement mode for values that contain statements)
- The tolerant parser always operates in inline mode
- `parser.parse(true)` activates inline mode

## Greedy Strings

Inline mode uses **greedy string parsing**. When the lexer encounters an unquoted identifier, it consumes all adjacent characters until it hits **whitespace** or a **structural delimiter**.

This allows natural values like URLs, dotted paths, and namespaced identifiers to be written without quotes:

```
http://fonts.example.com     → "http://fonts.example.com"
foo.bar.baz                  → "foo.bar.baz"
hello:world                  → "hello:world"
```

### Structural delimiters

These characters always end a greedy string, even without surrounding whitespace:

| Char | Reason |
|------|--------|
| `{` `}` | Reference boundaries |
| `(` `)` | Function calls / grouping |
| `[` `]` | Block delimiters |
| `,` | List separator |
| `"` `'` | Explicit string delimiters |
| `;` | Statement separator |

Everything else (`:`, `/`, `.`, `+`, `=`, `#`, `&`, `?`, etc.) is consumed as part of the string.

### Why whitespace still matters

Operators work normally when surrounded by spaces — the space ends the string before the operator is reached:

```
foo + bar       → STRING("foo"), OP(+), STRING("bar")   // arithmetic
foo+bar         → STRING("foo+bar")                     // single string
{base} * 2      → REFERENCE, OP(*), NUMBER              // arithmetic
```

### Format units in greedy mode

Unit suffixes adjacent to numbers are still correctly recognized. When the lexer is immediately after a number (or closing paren), it uses non-greedy parsing to extract the unit before resuming greedy mode:

```
3px             → 3px (unit)           // format extracted
10rem^2         → (10rem) ^ 2 = 100rem // format + operator + number
http://foo.bar  → "http://foo.bar"     // greedy string (not after a number)
```

### Greedy strings vs statement mode

Greedy strings are only active in inline mode. In statement mode (schema/function bodies), the lexer uses the standard rules where characters like `:`, `.`, and `/` produce separate tokens. This preserves type annotations (`variable x: Number`) and attribute access (`output.s = value`).

When a token `$value` contains statement-mode constructs (like `variable` declarations), the parser automatically falls back to statement mode without greedy strings.

## Supported constructs

| Construct | Example |
|---|---|
| Numbers | `42`, `3.14` |
| Numbers with units | `16px`, `1.5s`, `200ms` |
| Strings (bare identifiers) | `red`, `bold` |
| Greedy strings | `http://example.com`, `foo.bar.baz` |
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
| Template strings | `` `hello {name}, ${1 + 2}` `` |

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

# URLs and dotted paths (greedy strings)
http://fonts.example.com/css
com.example.tokens.primary
```
