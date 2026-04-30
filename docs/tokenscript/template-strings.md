# Template Strings

Template strings use backtick syntax to build strings with embedded references and expressions. They are the recommended way to compose string values from multiple parts.

```
`hello {name}, you have ${1 + 1} items`
```

## Syntax

Template strings are delimited by backticks (`` ` ``). Inside, two interpolation forms are supported:

| Syntax | Description | Example |
|--------|-------------|---------|
| `{ref.path}` | Reference interpolation | `` `color: {color.primary}` `` |
| `${expression}` | Expression interpolation | `` `width: ${base * 2}px` `` |

### Reference Interpolation

Curly braces interpolate a token reference, the same way references work elsewhere in tokenscript:

```
`border: {border.width} solid {border.color}`
```

Whitespace inside braces is stripped: `{ color.primary }` is equivalent to `{color.primary}`.

### Expression Interpolation

Dollar-brace interpolates an arbitrary expression. Any valid inline-mode expression is allowed:

```
`width: ${16 * 2}px`           → "width: 32px"
`sum: ${1 + 2 + 3}`            → "sum: 6"
`mixed: ${mix({a}, {b}, 50)}`  → result of mix function
```

References inside expressions are tracked as dependencies, so `${mix({a}, {b}, 50)}` correctly registers `a` and `b` as required references.

## Escape Sequences

Use a backslash to include literal characters that would otherwise be interpreted:

| Escape | Result |
|--------|--------|
| `\{` | Literal `{` |
| `\${` | Literal `${` |
| `` \` `` | Literal `` ` `` |
| `\\` | Literal `\` |

```
`not a \{reference}`    → "not a {reference}"
`not \${an expr}`       → "not ${an expr}"
`backtick: \``          → "backtick: `"
```

## Type Behavior

### Single-part templates preserve type

When a template contains only a single interpolation with no surrounding text, the original type is preserved:

```
`{count}`   // where count = 42 → NumberSymbol(42), not "42"
```

### Multi-part templates produce strings

When the template has multiple parts (text + interpolation, or multiple interpolations), all parts are coerced to strings and concatenated:

```
`value: {count}`     // where count = 42 → "value: 42"
`${true} and ${null}` → "true and null"
```

## Allowed Types

Only primitive types can be interpolated. The following types are allowed:

- **Strings** — included as-is
- **Numbers** — converted to string representation
- **Booleans** — `"true"` or `"false"`
- **Null** — `"null"`
- **Hex colors** — included as hex string (e.g., `"#FF0000"`)

### Rejected types

These types throw a `TEMPLATE_INVALID_TYPE` error:

- **Lists** — use individual elements instead
- **Dictionaries** — access specific properties instead
- **Non-hex colors** (HSL, OKLCH, etc.) — convert to hex first

```
// ✗ Error: List cannot be interpolated
`items: {myList}`

// ✓ Access individual elements instead
`first: {myList.0}`

// ✗ Error: Color.HSL cannot be interpolated
`color: {hslColor}`

// ✓ Convert to hex first or use a hex color reference
`color: {hexColor}`
```

## Nesting

Nested template strings are not allowed. A backtick inside `${...}` is a parse error:

```
// ✗ Error: Nested template strings are not allowed
`outer ${`inner`}`
```

## Empty Templates

An empty template produces an empty string:

```
``  → ""
```

## Design Token Examples

```json
{
  "button-padding": {
    "$value": "`${({spacing.base} * 2)}px ${({spacing.base} * 4)}px`"
  },
  "greeting": {
    "$value": "`Hello {user.name}, welcome back`"
  },
  "border": {
    "$value": "`{border.width} solid {border.color}`"
  }
}
```

## Related Documentation

- [Inline Mode](./inline-mode.md) — Supported expressions inside `${...}`
- [Implicit Lists and Strings](./implicit-lists-and-strings.md) — How template strings differ from implicit string concatenation
