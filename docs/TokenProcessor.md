# TokenProcessor Deep Dive

This document explains how the new `TokenProcessor` (see `src/processor/TokenProcessor.ts`) resolves TokenScript maps, with special focus on the prefix-aware resolver that replaces the legacy graph. It also captures the intent behind the latest commits on the `tokenset-resolver` branch and walks through a realistic JSON example.

## Responsibilities and Entry Points

- `TokenProcessor.processTokens` accepts a flat `Map<RefPath, string>` and optional callbacks/config. It chooses between the legacy resolver and the new prefix-aware resolver (`TokenProcessorMode` defaults to `"prefix"`).
- `TokenProcessor.build` wraps `processTokens` and materialises two maps: `tokens` (resolved values or the original input when errors occur) and `errors`.
- `LegacyTokenProcessor` remains strictly for backwards compatibility; do not add new behavior there. Everything below describes the prefix-aware flow.

## Prefix-Aware Architecture

`PrefixAwareTokenProcessor` delegates to `PrefixResolver`, which owns the full lifecycle. Important state (names reflect the code):

| Structure | Purpose |
|-----------|---------|
| `graph: DependencyGraph<RefPath>` | Records edges for tooling/diagnostics. |
| `resolved: Map<RefPath, TokenResult>` | Final values or `Error`s. Shared with callbacks. |
| `unresolved: Map<RefPath, { ast, dependencies }>` | ASTs waiting for their references. |
| `requiresTokens / requiredByTokens` | Bidirectional sets for token-to-token dependencies. |
| `requiredPrefixesMap / tokensToRequiredPrefixes / requiredByPrefixes / requiredPrefixes` | Track which tokens wait on prefixes and which tokens currently fulfill those prefixes. |
| `allPrefixes` | Map of every dotted prefix (`colors`, `colors.primary`, …) to their concrete children. |
| `referenceCache` | Live reference map fed into the single `Interpreter` instance to avoid rebuilding symbol tables. |
| `virtualChildren` | References such as `{theme.palette.primary}` pointing into dictionary entries that do not exist as independent tokens. |
| `pendingResolution` | Guard (added in `eb946d7`) that prevents recursive resolution when releasing dependents/prefixes. |

The interpreter itself is created once per resolver run and re-used for each token by swapping the AST (`Interpreter.setAst`). This mirrors the optimization that already exists in the legacy resolver and is why `referenceCache` must stay in sync with `resolved`.

## Resolution Phases

### 1. `buildRequirementsGraph`

For every token the resolver:

1. Treats uninterpreted keywords immediately (`UNINTERPRETED_KEYWORDS` → `StringSymbol`).
2. Parses the expression using `parseExpression`.
3. Stores trivial tokens (empty AST) as already resolved (`""`), caches them, and defers notification.
4. Persists each AST in `astNodes` and registers every dotted prefix via `addToPrefixes`.
5. Splits dependencies into:
   - Token dependencies (`requiresTokens`, `requiredByTokens`).
   - Prefix dependencies (`requiredPrefixesMap`) only when the dependency is a prefix without a concrete token (`allPrefixes.has(dep) && !tokens.has(dep)` – a correctness fix from `060a6a0`).
   - Virtual children (when a parent token exists but the child does not).
   - Missing references (recorded as `Error`s so dependents fail fast).
6. Adds each token and dependency set to the `DependencyGraph`.

Tokens resolved during parsing are collected in `earlyResolved` rather than released right away. Commit `060a6a0` introduced this to avoid freeing dependents before the graph was fully built.

### 2. `mapToRequiredByPrefixes`

This step links prefix waiters to the concrete tokens that fulfill those prefixes. For every prefix we:

- Attach each real token under that prefix to `requiredByPrefixes` (so they can later release the prefix).
- Attach the waiting tokens (`tokensToRequiredPrefixes`) so a token is unblocked only when every prefix it depends on is materialised.

### 3. `releaseEarlyResolved`

After the maps are ready, the resolver loops over `earlyResolved` and calls `releaseDependents` and `releasePrefixes`. This deferred release is what keeps prefix and virtual-child tracking consistent with the dependency state (again, `060a6a0`).

### 4. `resolveDependencyFreeTokens`

Any token whose `requiresTokens` and `tokensToRequiredPrefixes` entries are both empty is eligible for execution. Each ready token runs through `resolveSingleToken`.

### Token Interpretation (`resolveSingleToken`)

`resolveSingleToken` centralises all interpretation logic (refactored in `a8d69e3` so every code path works with a single `tokenValue` variable):

1. Build a `DependencyError` if any dependency already failed.
2. If there is no AST (string literal after parsing), treat the original value as the result.
3. Otherwise, reuse the shared interpreter, set the AST, and call `interpret`.
4. Store successes in both `resolved` and `referenceCache`. Errors are stored only in `resolved`/callbacks to avoid poisoning the cache.
5. Call `flattenIfDictionary` so `DictionarySymbol` results are exposed under `parent.child` reference paths. Each flattened symbol is cloned if it is mutable so downstream tokens cannot mutate shared data.
6. Notify virtual children waiting on this parent (`resolveVirtualChildren`).
7. Call `notifyResolution` which releases tokens and prefixes dependent on either the resolved token or any flattened child. The `pendingResolution` guard (commit `eb946d7`) ensures a token is never resolved twice while still in the callback stack.

### Prefix Materialisation (`releasePrefixes` / `releasePrefix`)

When the last token inside a prefix resolves, `releasePrefix` builds a synthetic `DictionarySymbol` for the prefix by collecting the prefix’s immediate children from `referenceCache`. This dictionary is cached under the prefix name so `{colors}` style expressions start working immediately. Any tokens waiting on that prefix are released just like standard dependents.

### 5. `finalizeResolution`

`finalizeResolution` makes repeated passes until no work is left:

- If a token becomes dependency-free mid-loop, it resolves immediately.
- If a dependency failed, the waiting token receives a `DependencyError`.
- If the loop finishes without progress while unresolved tokens remain, it throws a circular/prefix error with the offending paths (rewritten in `060a6a0` to retry until no progress is possible instead of only making a single pass).

## Differences vs. Legacy Resolver

- **Prefix awareness**: Prefix tokens are treated as first-class dictionaries, enabling `{theme}` or `{theme.colors}` references that never existed in the legacy resolver.
- **Virtual children**: References to nested dictionary entries (e.g., `{theme.colors.primary}`) are allowed even when `theme.colors.primary` is not a discrete token; the resolver synthesises them from dictionary values.
- **Shared interpreter lifecycle**: Both resolvers reuse a single interpreter, but the prefix resolver additionally flattens dictionary outputs back into the reference cache so other tokens see them immediately.
- **Dependency release**: The prefix resolver operates without a topological sort. Instead, it maintains live bidirectional maps, enabling incremental resolution as soon as a token or prefix becomes available.

## Example Walkthrough

Consider the following token JSON (flattened to map entries during ingestion):

```json
{
  "base.spacing": "8",
  "base.scale": "1.5",
  "spacing.sm": "{base.spacing}",
  "spacing.lg": "{spacing.sm} * {base.scale}",
  "palette.primary.100": "#eef",
  "palette.primary.500": "#00f",
  "theme.palette": "{palette.primary}",
  "theme.button.bg": "{theme.palette.500}",
  "theme.card.spacing": "{spacing}"
}
```

### Step 1 – Build Requirements

- `base.spacing`, `base.scale`, `palette.primary.100`, `palette.primary.500` parse without dependencies, so they enter `earlyResolved`.
- `spacing.sm` depends on `base.spacing` (token dependency).
- `spacing.lg` depends on `spacing.sm` and `base.scale`.
- `theme.palette` depends on prefix `palette.primary` (because no token named `palette.primary` exists, but the prefix does).
- `theme.button.bg` depends on virtual child `theme.palette.500`. `findParentToken` assigns `theme.palette` as its parent, so the virtual child is queued under `virtualChildren`.
- `theme.card.spacing` depends on prefix `spacing`.

During this phase `allPrefixes` gains entries (`base`, `base.spacing`, `palette`, `palette.primary`, `theme`, `theme.palette`, `theme.button`, `theme.card`, etc.), and `requiredPrefixesMap` records that `theme.palette` waits on `palette.primary`, while `theme.card.spacing` waits on `spacing`.

### Step 2 – Map Prefix Dependencies

`mapToRequiredByPrefixes` now knows:

- Prefix `palette.primary` is fulfilled by `palette.primary.100` and `.500`.
- Prefix `spacing` is fulfilled by `spacing.sm` and `spacing.lg` (once they resolve).
- `theme.palette` and `theme.card.spacing` must wait until their respective prefixes finish materialising.

### Step 3 – Release Early Tokens

Tokens resolved during parsing (`base.*` and `palette.primary.*`) call `releaseDependents` and `releasePrefixes`. Nothing new resolves yet because their dependents still have outstanding requirements, but their results are now in `referenceCache`.

### Step 4 – Dependency-Free Pass

1. `spacing.sm` becomes free once `base.spacing` is in `resolved`. It interprets to `8` and pushes `spacing.sm` into `referenceCache`.
2. That unblocks `spacing.lg`, which evaluates to `12`. Both tokens now sit under the `spacing` prefix, but `theme.card.spacing` still waits because the prefix dictionary is not ready yet.
3. `releasePrefixes` notices that both children of prefix `spacing` are resolved, so it builds a `DictionarySymbol` `{ sm: 8, lg: 12 }` and caches it under `"spacing"`.
4. The prefix release clears the waiting list for `theme.card.spacing`, so it resolves immediately to the entire dictionary `{ sm: 8, lg: 12 }`.
5. In parallel, `palette.primary.*` being ready allows `releasePrefix("palette.primary")` which creates a dictionary `{ "100": "#eef", "500": "#00f" }` available as `{palette.primary}`.
6. `theme.palette` now resolves to that dictionary, is cached, and `resolveVirtualChildren` satisfies the virtual child `theme.palette.500`, enabling `theme.button.bg` to read the color `#00f`.

At this point every token has resolved without ever running a global topological sort. If a dependency had failed anywhere in this chain, `buildDependencyError` would have wrapped it in a `DependencyError`, attributing the failure to both the dependent token and the failing dependency.

### Step 5 – Finalize

`finalizeResolution` performs one more scan. Because all tokens are already resolved, the loop finishes without further work. If the example had included a cycle (e.g., `{spacing.sm}` referencing `{spacing.lg}` which referenced `{spacing.sm}`), this loop would keep seeing unresolved entries without making progress and eventually throw `Detected circular dependency or unresolved prefixes: spacing.sm, spacing.lg`.

## Takeaways

- Prefix resolution depends on a precise separation of token vs. prefix dependencies (`060a6a0`).
- Reusing a single interpreter and caching dictionary children amortises parsing and evaluation cost (`a8d69e3`).
- Guarding recursive releases keeps the resolver stable even when prefix releases trigger additional resolutions (`eb946d7`).

Use this document as a roadmap when extending the resolver: new capabilities almost always fit into one of the phases above, and you can plug more bookkeeping into the existing maps without rethinking the entire architecture.
