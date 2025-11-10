# TokenScript Prefix-Aware Resolver

## Overview

The `PrefixResolver` is an advanced token resolution system that handles complex token dependencies, including:
- **Token-to-token references**: `{base.size}`, `{component.padding}`
- **Prefix references**: `{base}` (referencing all tokens under `base.*`)
- **Dictionary construction**: Automatically builds dictionaries from dot-notated tokens
- **Virtual children**: Handles references to nested properties (`{theme.colors.primary}`)
- **Circular dependency detection**: Prevents infinite loops

This resolver is designed to maintain feature parity with the legacy resolver while supporting prefix-based references efficiently.

## Key Concepts

### 1. Prefixes

When you have tokens like `base.size.sm`, `base.size.md`, `base.color.red`, the resolver identifies:
- `base` is a prefix with children: `base.size.sm`, `base.size.md`, `base.color.red`
- `base.size` is also a prefix with children: `base.size.sm`, `base.size.md`

### 2. Token vs Prefix Resolution

The resolver distinguishes between:
- **Token reference**: `{base.size.sm}` - references a specific token
- **Prefix reference**: `{base.size}` - references a dictionary of all `base.size.*` tokens

### 3. Virtual Children

When a token references `{theme.colors.primary}` but only `theme.colors` exists as a token (containing a dictionary), `primary` is a "virtual child" - it will be resolved from the parent dictionary.

### 4. Resolution Phases

The resolver operates in distinct phases to ensure correct dependency ordering:

1. **Build Requirements Graph**: Parse all tokens and identify dependencies
2. **Map Prefix Dependencies**: Link prefix requirements to actual tokens
3. **Release Early Resolved**: Notify dependents of tokens resolved during parsing
4. **Resolve Dependency-Free**: Process tokens with all dependencies met
5. **Finalize**: Handle remaining tokens with errors or circular dependencies

## Resolution Algorithm

### Phase 1: Build Requirements Graph

```
For each token (name, value):
  1. Parse the token value
  2. Identify dependencies (references)
  3. Classify each dependency as:
     - Token dependency (if it's an actual token)
     - Prefix dependency (if it's a prefix, not a token)
     - Virtual child (if parent token exists)
     - Missing (if neither exists)
  4. Build bidirectional tracking:
     - requiresTokens: What this token needs
     - requiredByTokens: What tokens need this
     - tokensToRequiredPrefixes: Prefixes this token needs
     - requiredPrefixes: Tokens that form a prefix
```

### Phase 2: Map Prefix Dependencies

```
For each prefix that has tokens waiting on it:
  1. Find all tokens with that prefix
  2. Link them: when all these tokens resolve,
     build a dictionary and make it available
```

### Phase 3: Release Early Resolved

Tokens resolved during parsing (no dependencies, parse errors, empty values) notify their dependents so they can be processed.

### Phase 4: Resolve Dependency-Free

```
While there are tokens ready to resolve:
  1. Identify tokens with no pending dependencies
  2. Interpret each token
  3. If result is a dictionary, flatten it
  4. Notify dependents (clear their dependency on this token)
  5. Check if any prefix is now complete
     - If yes, build dictionary and release it
```

### Phase 5: Finalize

Handle any remaining unresolved tokens by:
1. Checking for dependency errors (dependency failed)
2. Attempting one more resolution pass
3. Throwing error if truly circular/unresolvable

## Example 1: Simple Token Dependencies

### Input Tokens

```json
{
  "base": "8",
  "spacing.sm": "{base} * 2",
  "spacing.md": "{base} * 4",
  "component.padding": "{spacing.sm} + 4"
}
```

### Resolution Flow

```
Phase 1: Build Requirements Graph
┌─────────────────┐
│ base: "8"       │ (no dependencies)
└─────────────────┘
         ↓ required by
┌─────────────────┐
│ spacing.sm      │ requires: base
└─────────────────┘
         ↓ required by
┌─────────────────┐
│ component.pad   │ requires: spacing.sm
└─────────────────┘

┌─────────────────┐
│ spacing.md      │ requires: base
└─────────────────┘

Phase 3: Release Early Resolved
✓ base = 8
  └─> Clear dependency for: spacing.sm, spacing.md

Phase 4: Resolve Dependency-Free
✓ spacing.sm = 16
  └─> Clear dependency for: component.padding
✓ spacing.md = 32
✓ component.padding = 20

Result:
{
  "base": 8,
  "spacing.sm": 16,
  "spacing.md": 32,
  "component.padding": 20
}
```

### Dependency Graph Visualization

```
     base (8)
      ╱  ╲
     ╱    ╲
spacing.sm spacing.md
   (16)       (32)
    │
    │
component.padding
      (20)
```

## Example 2: Prefix References with Dictionary Construction

### Input Tokens

```json
{
  "colors.red.100": "#fee",
  "colors.red.500": "#f00",
  "colors.blue.100": "#eef",
  "colors.blue.500": "#00f",
  "theme.primary": "{colors.red}",
  "theme.secondary": "{colors.blue}"
}
```

### Resolution Flow

```
Phase 1: Build Requirements Graph

Tokens with prefixes identified:
- colors.red.100 → adds to prefix "colors", "colors.red"
- colors.red.500 → adds to prefix "colors", "colors.red"
- colors.blue.100 → adds to prefix "colors", "colors.blue"
- colors.blue.500 → adds to prefix "colors", "colors.blue"

Dependencies:
- theme.primary → requires PREFIX "colors.red"
- theme.secondary → requires PREFIX "colors.blue"

┌──────────────────┐
│ colors.red.100   │ (no deps) ─┐
└──────────────────┘            │
                                ├─> form prefix "colors.red"
┌──────────────────┐            │
│ colors.red.500   │ (no deps) ─┘
└──────────────────┘

┌──────────────────┐
│ theme.primary    │ requires PREFIX: colors.red
└──────────────────┘

Phase 3: Release Early Resolved
✓ colors.red.100 = "#fee"
✓ colors.red.500 = "#f00"
✓ colors.blue.100 = "#eef"
✓ colors.blue.500 = "#00f"

Phase 4: Resolve Dependency-Free

Check prefix "colors.red":
- All tokens resolved (colors.red.100, colors.red.500)
- Build dictionary:
  {
    "100": "#fee",
    "500": "#f00"
  }
- Store as reference cache["colors.red"] = <Dictionary>
- Release prefix → theme.primary can now resolve

✓ theme.primary = <Dictionary>
  (Now available as {colors.red} reference)

Similarly for colors.blue:
✓ theme.secondary = <Dictionary>

Result (as strings):
{
  "colors.red.100": "#fee",
  "colors.red.500": "#f00",
  "colors.blue.100": "#eef",
  "colors.blue.500": "#00f",
  "theme.primary": { "100": "#fee", "500": "#f00" },
  "theme.secondary": { "100": "#eef", "500": "#00f" }
}
```

### Dependency Graph Visualization

```
colors.red.100  colors.red.500
      ╲            ╱
       ╲          ╱
        colors.red (Dictionary)
            │
            │ (prefix reference)
            ↓
      theme.primary


colors.blue.100  colors.blue.500
      ╲             ╱
       ╲           ╱
        colors.blue (Dictionary)
            │
            │ (prefix reference)
            ↓
      theme.secondary
```

## Example 3: Virtual Children (Nested Dictionary Access)

### Input Tokens

```json
{
  "theme.colors": "{ primary: '#f00', secondary: '#00f' }",
  "button.bg": "{theme.colors.primary}",
  "button.text": "{theme.colors.secondary}"
}
```

### Resolution Flow

```
Phase 1: Build Requirements Graph

- theme.colors: no dependencies
- button.bg: requires "theme.colors.primary"
  → "theme.colors.primary" doesn't exist as a token
  → Parent "theme.colors" exists → mark as virtual child
- button.text: requires "theme.colors.secondary"
  → Similar to above

Tracking:
virtualChildren[theme.colors] = Set {
  "theme.colors.primary",
  "theme.colors.secondary"
}

Phase 3: Release Early Resolved
(none - theme.colors has AST to interpret)

Phase 4: Resolve Dependency-Free
✓ theme.colors = <Dictionary> { primary: '#f00', secondary: '#00f' }

Flatten dictionary:
- referenceCache["theme.colors.primary"] = '#f00'
- referenceCache["theme.colors.secondary"] = '#00f'

Resolve virtual children:
- theme.colors.primary → satisfied by flattening
- theme.colors.secondary → satisfied by flattening

Clear dependencies:
✓ button.bg = '#f00'
✓ button.text = '#00f'

Result:
{
  "theme.colors": { primary: '#f00', secondary: '#00f' },
  "button.bg": "#f00",
  "button.text": "#00f"
}
```

### Dependency Graph Visualization

```
┌─────────────────────────────────────┐
│ theme.colors                        │
│ { primary: '#f00', secondary: '#00f'}│
└─────────────────────────────────────┘
              │
              │ (flattens to)
        ┌─────┴─────┐
        │           │
   .primary    .secondary
    '#f00'      '#00f'
        │           │
        │           │ (virtual children references)
        │           │
   button.bg   button.text
    '#f00'      '#00f'
```

## Example 4: Error Propagation

### Input Tokens

```json
{
  "base": "{missing}",
  "derived": "{base} * 2",
  "final": "{derived} + 1"
}
```

### Resolution Flow

```
Phase 1: Build Requirements Graph

- base: requires "missing"
  → "missing" not found → create error
- derived: requires "base"
- final: requires "derived"

Dependencies:
missing (error) → base → derived → final

Phase 3: Release Early Resolved
✗ missing = Error("Token 'missing' not found")

Phase 4: Resolve Dependency-Free
(none ready - all depend on missing)

Phase 5: Finalize
Loop through unresolved:
  1. base: check dependencies
     → missing is Error
     → Create DependencyError(base, missing)
     ✗ base = DependencyError
     → Notify: derived
  
  2. derived: check dependencies
     → base is Error
     → Create DependencyError(derived, base)
     ✗ derived = DependencyError
     → Notify: final
  
  3. final: check dependencies
     → derived is Error
     → Create DependencyError(final, derived)
     ✗ final = DependencyError

Result:
All tokens have errors with proper dependency chain:
{
  "missing": Error("Token 'missing' not found"),
  "base": DependencyError("base depends on missing"),
  "derived": DependencyError("derived depends on base"),
  "final": DependencyError("final depends on derived")
}
```

### Error Propagation Visualization

```
       missing
         │
         ✗ Error: not found
         │
      (propagates)
         │
         ↓
       base
         │
         ✗ DependencyError
         │
      (propagates)
         │
         ↓
      derived
         │
         ✗ DependencyError
         │
      (propagates)
         │
         ↓
       final
         │
         ✗ DependencyError
```

## Data Structures

### Core Maps

```typescript
// Token resolution status
resolved: Map<RefPath, TokenResult>
unresolved: Map<RefPath, { ast, dependencies }>

// Token dependencies (individual tokens)
requiresTokens: Map<RefPath, Set<RefPath>>
requiredByTokens: Map<RefPath, Set<RefPath>>

// Prefix dependencies (dictionary references)
tokensToRequiredPrefixes: Map<RefPath, Set<string>>
requiredPrefixes: Map<string, Set<RefPath>>
requiredByPrefixes: Map<RefPath, Set<string>>
requiredPrefixesMap: Map<string, Set<RefPath>>

// Prefix tracking
allPrefixes: Map<string, Set<RefPath>>

// Virtual children (nested access)
virtualChildren: Map<RefPath, Set<RefPath>>

// Caches
referenceCache: Map<string, TokenResult>  // Live references for interpreter
astNodes: Map<RefPath, ASTNode>  // Parsed ASTs
```

### Example State During Resolution

For tokens `base.size.sm = "8"`, `component.padding = "{base.size.sm} * 2"`:

```typescript
// After buildRequirementsGraph():
{
  allPrefixes: {
    "base": Set(["base.size.sm"]),
    "base.size": Set(["base.size.sm"])
  },
  requiresTokens: {
    "component.padding": Set(["base.size.sm"])
  },
  requiredByTokens: {
    "base.size.sm": Set(["component.padding"])
  },
  resolved: {
    "base.size.sm": 8
  },
  referenceCache: {
    "base.size.sm": 8
  }
}

// After releaseEarlyResolved():
{
  // "component.padding" dependency on "base.size.sm" is cleared
  requiresTokens: {},
  requiredByTokens: {}
}

// After resolveDependencyFreeTokens():
{
  resolved: {
    "base.size.sm": 8,
    "component.padding": 16
  },
  referenceCache: {
    "base.size.sm": 8,
    "component.padding": 16
  }
}
```

## Performance Optimizations

### 1. Single Interpreter Instance
The resolver reuses a single `Interpreter` instance across all tokens, just swapping the AST. This avoids the overhead of creating new interpreter instances.

### 2. Reference Cache
The `referenceCache` is passed by reference to the interpreter, so as tokens are resolved, they're immediately available for reference resolution.

### 3. Efficient String Operations
- Uses `indexOf` and `slice` instead of `split` and `join` for prefix extraction
- Caches prefix calculations
- Avoids repeated string allocations

### 4. Lazy Prefix Dictionary Construction
Dictionaries are only built when all prefix tokens are resolved and something actually needs them.

### 5. Pending Resolution Guard
The `pendingResolution` set prevents infinite recursion when a token resolution triggers other token resolutions.

### 6. Early Exit Checks
Fast paths for common cases:
- Already resolved? Skip
- No dependencies? Resolve immediately
- Parse error? Mark as error and continue

## Comparison with Legacy Resolver

| Feature | Legacy | Prefix-Aware |
|---------|--------|--------------|
| Token references | ✅ | ✅ |
| Prefix references | ❌ | ✅ |
| Dictionary construction | ❌ | ✅ |
| Virtual children | ❌ | ✅ |
| Topological sort | ✅ (explicit) | ✅ (implicit) |
| Error propagation | ✅ | ✅ |
| Performance (275 tokens) | 2.02ms | 1.63ms |

## Debugging

To debug resolver issues, you can temporarily uncomment the debug output:

```typescript
function prefixDebug(message: string, payload?: Record<string, unknown>): void {
  if (payload) {
    console.log(`[TokenProcessor][prefix] ${message}`, payload);
  } else {
    console.log(`[TokenProcessor][prefix] ${message}`);
  }
}
```

Key debug points:
- `parse-token`: When parsing each token
- `missing-token`: When a dependency is not found
- `dependency-error`: When a token has a failed dependency
- `interpret-token`: When interpreting a token
- `free-prefix`: When a prefix dictionary is built
- `unresolved`: When circular dependencies are detected

## Common Issues and Solutions

### Issue: Token marked as circular dependency

**Symptom**: Error: "Detected circular dependency or unresolved prefixes: token-name"

**Possible causes**:
1. Token depends on a prefix that never completes
2. Token depends on something that depends on it
3. Token depends on something that's missing

**Debug**: Check `requiresTokens` and `tokensToRequiredPrefixes` for the stuck token.

### Issue: Prefix not resolving

**Symptom**: Token waiting for a prefix never resolves

**Possible causes**:
1. Not all tokens with that prefix have resolved
2. Prefix is also a token name (edge case)

**Debug**: Check `requiredPrefixes[prefix]` to see which tokens are pending.

### Issue: Virtual child not found

**Symptom**: Error: "Token 'parent.child' not found"

**Possible causes**:
1. Parent token doesn't resolve to a dictionary
2. Dictionary doesn't contain the expected key

**Debug**: Check if parent is in `virtualChildren` map and if parent result is a DictionarySymbol.

## Future Improvements

Potential optimizations for future versions:

1. **Parallel resolution**: Resolve independent token chains concurrently
2. **Incremental updates**: Support updating a single token without full rebuild
3. **Smart caching**: Cache parsed ASTs across invocations
4. **Dependency hints**: Allow tokens to declare dependencies explicitly
5. **Resolution strategies**: Pluggable strategies for different use cases

## Conclusion

The `PrefixResolver` provides a robust, efficient system for resolving complex token dependencies while maintaining backward compatibility with the legacy resolver. Its key innovation is the ability to handle prefix-based references and automatically construct dictionaries, enabling more powerful token composition patterns.
