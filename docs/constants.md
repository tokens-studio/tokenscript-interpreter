# Constants Schema

Constants schemas define named values that are available as bare identifiers during token `$value` evaluation. They are useful for shipping predefined vocabularies (e.g., CSS color names) alongside design token data.

## Schema Format

```json
{
  "name": "CSS Hex Colors",
  "type": "constants",
  "description": "CSS named colors mapped to hex values",
  "inline": true,
  "values": {
    "red": "#FF0000",
    "blue": "#0000FF",
    "green": "#008000"
  }
}
```

### Properties

| Property      | Type      | Required | Description                                      |
|---------------|-----------|----------|--------------------------------------------------|
| `name`        | `string`  | yes      | Display name for the constants set                |
| `type`        | `string`  | yes      | Must be `"constants"`                             |
| `description` | `string`  | no       | Human-readable description                        |
| `inline`      | `boolean` | yes      | Whether constants are injected during evaluation  |
| `values`      | `object`  | yes      | Map of identifier names to values (`string`, `number`, or `boolean`) |

## How It Works

When `inline: true`, constant values are parsed once at initialization and injected into the interpreter's symbol table before each token `$value` evaluation.

### Value Parsing

String values are parsed through the interpreter, so they resolve to typed symbols:

- `"#FF0000"` becomes a `ColorSymbol`
- `"10px"` becomes a `NumberWithUnitSymbol`
- `"hello"` becomes a `StringSymbol`

Non-string values use direct conversion:

- `42` becomes a `NumberSymbol`
- `true` becomes a `BooleanSymbol`

### Identifier Lookup Order

When the interpreter encounters a bare identifier (e.g., `red`), it checks:

1. **Symbol table** (local variables + injected constants) — highest priority
2. **References** (resolved tokens via `{ref}` syntax)
3. **String fallback** — identifier becomes a plain string

Constants occupy the symbol table, so they resolve before the string fallback but can be shadowed by variable declarations in the same scope.

### Scoping

Constants are only available during top-level token `$value` evaluation. They do **not** leak into:

- Function scripts (created with fresh interpreter instances)
- Color initializer/conversion scripts
- Unit conversion scripts

This is because these scripts all create new `Interpreter` instances with empty symbol tables.

### Reference Syntax

Constants are **not** available via reference syntax. `{red}` will not resolve a constant named `red` — it only resolves actual tokens in the token set.

## Registration

```typescript
import { Config } from "@tokens-studio/tokenscript-interpreter";

const config = new Config();
config.registerSchemas([
  {
    uri: "css-colors",
    schema: {
      name: "CSS Colors",
      type: "constants",
      inline: true,
      values: {
        red: "#FF0000",
        blue: "#0000FF",
      },
    },
  },
]);
```

Multiple constants schemas can be registered — their values merge into a single map. If two schemas define the same key, the last registration wins.

### `Config.clone()` Isolation

`Config.clone()` does **not** carry over inline constants. The cloned config starts with an empty constants map. This ensures schema isolation when forking configurations.

## `inline: false`

When `inline` is `false`, the schema is accepted by `registerSchemas()` but no values are injected. This can be used to register constants metadata without affecting evaluation.
