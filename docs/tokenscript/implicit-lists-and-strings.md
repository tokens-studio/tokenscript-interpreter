# Implicit Lists and Strings

Tokenscript supports implicit (unquoted) strings and implicit lists to enable a more natural, CSS-like syntax for design tokens.

> **Recommendation: Use Explicit Strings**
>
> Implicit strings exist for backward compatibility and convenience, but they have confusing edge cases. **Prefer to use quotes around strings (`"hello"`) instead of relying on implicit strings (`hello`).**

## Implicit Strings

Unquoted text that isn't a reserved keyword is treated as a string:

```
hello           → "hello"
my-value        → "my-value"
primary-color   → "primary-color"
```

This allows design token values to be written naturally:
```json
{
  "font-weight": { "$value": "bold" },
  "text-align": { "$value": "center" }
}
```

Instead of requiring explicit quotes:
```json
{
  "font-weight": { "$value": "\"bold\"" },
  "text-align": { "$value": "\"center\"" }
}
```

## Implicit Lists

Adjacent expressions separated by whitespace (without operators) form an implicit list:

```
hello world     → ["hello", "world"]
3 foo           → [3, "foo"]
red 500         → ["red", 500]
1px solid black → [1px, "solid", "black"]
```

This enables CSS-like shorthand syntax:
```json
{
  "border": { "$value": "1px solid black" },
  "font": { "$value": "bold 16px Arial" },
  "shadow": { "$value": "0 2px 4px rgba(0,0,0,0.1)" }
}
```

### Explicit Lists

Use commas for explicit list syntax:
```
a, b, c         → ["a", "b", "c"]  // explicit list
a b c           → ["a", "b", "c"]  // implicit list (same result)
```

The difference matters when mixing with operators:
```
1 + 2 3         → [3, 3]           // (1+2), then implicit list with 3
1 + 2, 3        → [3, 3]           // explicit list of (1+2) and 3
```

## Edge Cases and Pitfalls

### Strings Starting with Numbers

Unlike CSS (which disallows unquoted identifiers starting with numbers), Tokenscript allows them but they become implicit lists:

```
// ⚠️ GOTCHA: Space is added between number and text!
1unknown        → [1, "unknown"]   // NOT "1unknown"!
5test           → [5, "test"]      // NOT "5test"!
3D Font         → [3, "D", "Font"] // NOT "3D Font"!
```

**Solution:** Use explicit strings:
```
"1unknown"      → "1unknown"
"3D Font"       → "3D Font"
```

### Arithmetic with Implicit Strings

When you mix arithmetic operators with implicit strings, the behavior may surprise you:

```
// ⚠️ This evaluates to [2, "unknown"], not an error!
// The arithmetic happens first: (1 + 1) = 2
// Then creates implicit list with result and string
1 + 1unknown    → [2, "unknown"]
```

**Solution:** Use recognized units or explicit strings:
```
1px + 1px       → 2px              // recognized units work
1 + "1unknown"  → ERROR            // explicit string catches the mistake
```

## Interaction with Format Units

Format units (like `px`, `rem`, `s`, `ms`) have special parsing rules that interact with implicit lists.

### The Adjacency Rule

A format keyword is only recognized as a unit when **immediately adjacent** (no whitespace) to a number:

| Expression | Result | Explanation |
|------------|--------|-------------|
| `3px` | `3px` (unit) | Adjacent - parsed as number-with-unit |
| `3 px` | `[3, "px"]` | Whitespace - parsed as implicit list |
| `3s` | `3s` (unit) | Adjacent - parsed as 3 seconds |
| `3 s` | `[3, "s"]` | Whitespace - parsed as implicit list |

### Why This Matters for Backwards Compatibility

Without the adjacency rule, adding new units would break existing token values:

```
// Token value: "red 500"
// Before adding hypothetical unit "red":
red 500         → ["red", 500]              // implicit list ✓

// If "red" was treated as unit unconditionally:
red 500         → NumberWithUnit(500, "red") // WRONG!
```

The adjacency rule ensures:
1. `3s` is parsed as 3 seconds (useful for animations)
2. `red 500` remains an implicit list (useful for color palettes)
3. Existing token values don't change meaning when new units are added

### Variable Names and Units

Variables can use unit keywords as names because the adjacency rule only applies after numbers:

```
variable s: Number = 5;
s               → 5                         // variable reference
3s              → 3s (unit)                 // unit (no conflict)
3 + s           → 8                         // variable in expression
```

## Best Practices

> **Always Use Explicit Strings When Possible**
>
> While implicit strings are convenient, they can lead to confusion and errors. We recommend using explicit strings in most cases.

```
// ✓ Use explicit strings (clear intent)
"3D Font", "some other font", "Font with emoji 😼"

// ⚠️ Implicit strings can be ambiguous
3D Font         → [3, "D", "Font"]  // probably not what you wanted
```

### When Implicit Strings Are Acceptable

Implicit strings are mainly useful for:

1. **Simple identifiers without spaces or special characters**
   ```
   primary         → "primary"
   accent-color    → "accent-color"
   ```

2. **CSS-like shorthand values**
   ```
   1px solid black → [1px, "solid", "black"]
   bold 16px Arial → ["bold", 16px, "Arial"]
   ```

3. **Backward compatibility** - Existing Tokenscript code may rely on implicit strings

## Examples

### Design Token Values

```
// Border shorthand
1px solid black         → [1px, "solid", "black"]

// Animation duration
0.3s                    → 0.3s (unit)

// Color with weight
primary 500             → ["primary", 500]

// Font stack (use commas for explicit list)
Arial, sans-serif       → ["Arial", "sans-serif"]
```

### Arithmetic with Units

```
3px + 2px               → 5px
3s * 2                  → 6s
100ms + 50ms            → 150ms
```

### Unit Conversion

```
{base} * 2px            → result in px
(3 + 4)px               → 7px
```

## Related Documentation

- [Format/Unit Parsing Edge Cases](./edge-cases/format-unit-parsing.md) - Implementation details of the adjacency rule
