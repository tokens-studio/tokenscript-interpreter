# Token Resolver — CRUD Operations

The `TokenResolver` class provides methods for incremental token management after the initial `build()` call. These methods update the internal token map, re-resolve affected tokens, and return dependency information — all without requiring a full rebuild.

## Setup

```typescript
import { TokenResolver } from "@tokens-studio/tokenscript-interpreter/processor";
import type { TokenData } from "@tokens-studio/tokenscript-interpreter/processor";

const tokens = new Map<string, TokenData>([
  ["color.primary", { $value: "#FF0000", $type: "color" }],
  ["spacing.base", { $value: "8", $type: "dimension" }],
  ["spacing.large", { $value: "{spacing.base} * 2", $type: "dimension" }],
]);

const { resolver, tokens: resolvedTokens, issues } = new TokenResolver().build(tokens);
```

## createToken

Add a new token to the resolved set.

```typescript
const result = resolver.createToken({
  tokenPath: "color.secondary",
  tokenData: { $value: "#00FF00", $type: "color" },
});

result.created;              // true
result.resolved?.toString(); // "#00FF00"
result.tokens;               // Map of all resolved tokens
result.issues;               // IssuesMap — empty if no errors
result.dependants;           // { graph: DependencyGraph }
```

Throws `ProcessorError` (`TOKEN_ALREADY_EXISTS`) if the token already exists.

References to the new token that were previously broken are automatically fixed on the next resolution.

## updateToken

Modify an existing token's value, type, or path.

```typescript
const result = resolver.updateToken({
  tokenPath: "spacing.base",
  tokenData: { $value: "16", $type: "dimension" },
});

result.updated;              // true
result.resolved?.toString(); // "16"
```

All tokens that transitively depend on the changed token are re-resolved automatically. In the example above, `spacing.large` would resolve to `32` (16 * 2).

If the token does not exist and `tokenData` is provided, it is created instead (with `result.updated = false`).

### Renaming

```typescript
const result = resolver.updateToken({
  tokenPath: "color.primary",
  tokenPathRenamed: "color.brand",
  updateReferences: true, // rewrite {color.primary} → {color.brand} in dependents
});
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `tokenData` | `TokenData` | — | New token data. Omit to keep existing data (useful for rename-only). |
| `tokenPathRenamed` | `string` | — | New path for the token. |
| `updateReferences` | `boolean` | `false` | Rewrite references in dependent tokens when renaming. |

## deleteToken

Remove a token from the resolved set.

```typescript
const result = resolver.deleteToken({
  tokenPath: "color.primary",
});

result.tokens;      // Map of all resolved tokens (without the deleted one)
result.issues;      // IssuesMap — includes broken references in dependents
result.dependants;  // { graph } — tokens that depended on the deleted one
```

Throws `ProcessorError` (`TOKEN_NOT_FOUND`) if the token does not exist.

Tokens that referenced the deleted token will have issues reported in `result.issues`.

## Common result shape

All three methods return a `TokenOperationResult`:

```typescript
type TokenOperationResult = {
  tokens: ResolvedValueMap;       // All resolved token values
  resolved?: InterpreterResult;   // Resolved value of the target token
  issues?: IssuesMap;             // Map<tokenPath, ResolveIssue[]>
  dependants?: {
    graph: DependencyGraph;       // Subgraph of affected tokens
  };
};
```

### Working with the dependants graph

The `dependants.graph` contains only tokens affected by the operation:

```typescript
const result = resolver.updateToken({
  tokenPath: "spacing.base",
  tokenData: { $value: "16", $type: "dimension" },
});

const nodes = result.dependants!.graph.getNodes();
// Map {
//   "spacing.base"  => Set {},
//   "spacing.large" => Set { "spacing.base" },
// }
```

### Checking for issues

```typescript
import { hasAnyIssues, getTokensWithIssues } from "@tokens-studio/tokenscript-interpreter/processor";

if (hasAnyIssues(result.issues)) {
  const broken = getTokensWithIssues(result.issues);
  console.log("Tokens with errors:", broken);
}
```

## resolveValue — Preview resolution

`resolveValue` is a lightweight method for resolving a single expression against the existing token cache. It is designed for **development-time use** in frontend input fields — e.g. previewing what a token value would resolve to as the user types.

```typescript
const result = resolver.resolveValue({ value: "{spacing.base} * 3 + 1" });

result.resolved?.toString(); // "25"
result.issues;               // ResolveIssue[] — flat array, not a Map
```

### Validation

Pass `type` and `validate: true` to validate the resolved value against a registered token type spec. Validation issues are appended to the `issues` array alongside any parse/resolution errors.

```typescript
const result = resolver.resolveValue({
  value: "not-a-color",
  type: "color",
  validate: true,
});

result.issues; // [{ code: "...", severity: "warning", message: "Token validation failed: ..." }]
```

| Option | Type | Default | Description |
|---|---|---|---|
| `value` | `unknown` | — | The expression to resolve. |
| `type` | `string` | — | Token type for validation (e.g. `"color"`, `"dimension"`). |
| `validate` | `boolean` | `false` | Enable type validation on the resolved value. Requires `type`. |

### Characteristics

- **No rebuild**: Evaluates against the warm reference cache. No cloning, no graph rebuild, no re-parsing of other tokens.
- **Read-only**: Does not modify resolver state. The resolved value is not stored in the cache.
- **Graceful errors**: Syntax errors and missing references are returned as `issues`, not thrown.

### Input handling

| Input | `resolved` | `issues` |
|---|---|---|
| `"{spacing.base} * 2"` | `16` | `[]` |
| `"#FF0000"` | `#FF0000` | `[]` |
| `"1 + + +"` | `null` | `[ParserError]` |
| `"{nonexistent}"` | `null` | `[ProcessorError]` |
| `""` / `null` / `undefined` | `null` | `[]` |
| `42` (non-string) | `42` | `[]` (coerced to string) |

### Isolation

`resolveValue` shares the resolver's interpreter instance and reads from its current cache. For scenarios that need isolation (e.g. speculative resolution that must not observe or be affected by other operations), create a separate `TokenResolver` and call `build()` on a copy of the token map.

Must not be called concurrently with `updateToken`, `createToken`, or `deleteToken` — those methods rebuild the internal resolver and the shared interpreter state would conflict.

### Example: Live input preview

```typescript
function onInputChange(newValue: string) {
  const { resolved, issues } = resolver.resolveValue({ value: newValue });

  if (issues.length > 0) {
    showError(issues[0].message);
  } else {
    showPreview(resolved?.toString() ?? "");
  }
}
```
