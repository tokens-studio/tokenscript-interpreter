# PrefixResolver - Complete Technical Documentation

## Table of Contents

1. [Overview](#overview)
2. [Data Structures](#data-structures)
3. [Resolution Flow](#resolution-flow)
4. [Method-by-Method Breakdown](#method-by-method-breakdown)
5. [State Transitions](#state-transitions)
6. [Edge Cases and Special Handling](#edge-cases-and-special-handling)
7. [Worked Examples](#worked-examples)

## Overview

The `PrefixResolver` is a dependency-aware token resolution system that processes tokens in the correct order based on their dependencies. It extends the basic token resolution with support for:

- **Prefix references**: `{base}` references all tokens under `base.*`
- **Dictionary construction**: Automatically builds dictionaries from dot-notated tokens
- **Virtual children**: Handles `{parent.child}` where only `parent` exists as a token
- **Dependency propagation**: Errors propagate through dependency chains

### Design Philosophy

1. **Bidirectional tracking**: Every dependency is tracked both ways (who needs it, who provides it)
2. **Lazy evaluation**: Tokens are only resolved when all their dependencies are met
3. **Cascade resolution**: Resolving one token triggers resolution of dependent tokens
4. **Fail-fast for errors**: Errors are detected early and propagated immediately

## Data Structures

### Core Resolution State

```typescript
// Resolution Status Maps
resolved: Map<RefPath, TokenResult>
  // Stores final resolved values for each token
  // Key: token name (e.g., "base.size")
  // Value: resolved symbol, string, or error

unresolved: Map<RefPath, UnresolvedToken>
  // Stores tokens waiting to be resolved
  // Key: token name
  // Value: { ast: ASTNode, dependencies: Set<string> }
```

**Example State:**
```typescript
resolved: Map {
  "base" => NumberSymbol(8),
  "colors.red" => StringSymbol("#f00")
}

unresolved: Map {
  "spacing" => {
    ast: BinaryOpNode(Reference("base"), "*", Number(2)),
    dependencies: Set(["base"])
  }
}
```

### Token Dependency Tracking

```typescript
requiresTokens: Map<RefPath, Set<RefPath>>
  // What token dependencies does each token need?
  // Key: token name
  // Value: set of token names it depends on
  
requiredByTokens: Map<RefPath, Set<RefPath>>
  // What tokens need this token?
  // Key: token name
  // Value: set of token names that depend on it
```

**Example State:**
```typescript
// Given: "spacing" = "{base} * 2"
requiresTokens: Map {
  "spacing" => Set(["base"])  // spacing needs base
}

requiredByTokens: Map {
  "base" => Set(["spacing"])  // base is needed by spacing
}
```

**Why bidirectional?**
- `requiresTokens`: Check if a token is ready to resolve (all deps met)
- `requiredByTokens`: When a token resolves, notify all tokens waiting for it

### Prefix Dependency Tracking

```typescript
tokensToRequiredPrefixes: Map<RefPath, Set<string>>
  // What prefix dependencies does each token need?
  // Key: token name
  // Value: set of prefix strings it depends on

requiredPrefixes: Map<string, Set<RefPath>>
  // What tokens must resolve before a prefix is complete?
  // Key: prefix string (e.g., "base.color")
  // Value: set of tokens with that prefix

requiredByPrefixes: Map<RefPath, Set<string>>
  // What prefixes does this token contribute to?
  // Key: token name
  // Value: set of prefixes it belongs to

requiredPrefixesMap: Map<string, Set<RefPath>>
  // What tokens are waiting for a prefix to be built?
  // Key: prefix string
  // Value: set of tokens waiting for this prefix
```

**Example State:**
```typescript
// Given tokens:
// "colors.red" = "#f00"
// "colors.blue" = "#00f"
// "theme" = "{colors}"

tokensToRequiredPrefixes: Map {
  "theme" => Set(["colors"])  // theme needs the colors prefix
}

requiredPrefixes: Map {
  "colors" => Set(["colors.red", "colors.blue"])  // colors prefix needs these
}

requiredByPrefixes: Map {
  "colors.red" => Set(["colors"]),
  "colors.blue" => Set(["colors"])
}

requiredPrefixesMap: Map {
  "colors" => Set(["theme"])  // theme is waiting for colors
}
```

### Prefix and Hierarchy Tracking

```typescript
allPrefixes: Map<string, Set<RefPath>>
  // All tokens that have a given prefix
  // Key: prefix string
  // Value: set of all tokens with that prefix
```

**Example State:**
```typescript
// Given tokens: "base.size.sm", "base.size.md", "base.color.red"
allPrefixes: Map {
  "base" => Set(["base.size.sm", "base.size.md", "base.color.red"]),
  "base.size" => Set(["base.size.sm", "base.size.md"]),
  "base.color" => Set(["base.color.red"])
}
```

**Purpose**: Quickly find all tokens under a prefix for dictionary construction.

### Virtual Children Tracking

```typescript
virtualChildren: Map<RefPath, Set<RefPath>>
  // Track references to non-existent tokens that should come from parent
  // Key: parent token name
  // Value: set of virtual child references
```

**Example State:**
```typescript
// Given:
// "theme" = "{ primary: '#f00' }"
// "button" = "{theme.primary}"

virtualChildren: Map {
  "theme" => Set(["theme.primary"])
}
```

**When `theme` resolves:**
1. It creates a dictionary: `{ primary: '#f00' }`
2. Flattens it: `referenceCache["theme.primary"] = "#f00"`
3. Virtual child `theme.primary` is now satisfied

### AST and Caching

```typescript
astNodes: Map<RefPath, ASTNode>
  // Parsed AST for each token
  // Key: token name
  // Value: parsed AST tree

referenceCache: Map<string, TokenResult>
  // Live cache passed to interpreter
  // Key: reference name (can be token name or flattened path)
  // Value: resolved value
```

**Why separate from `resolved`?**
- `resolved`: Tracks resolution status for tokens
- `referenceCache`: Provides values for reference lookups during interpretation
- `referenceCache` can contain flattened dictionary entries that aren't in `resolved`

**Example:**
```typescript
resolved: Map {
  "colors" => DictionarySymbol({ red: "#f00", blue: "#00f" })
}

referenceCache: Map {
  "colors" => DictionarySymbol({ red: "#f00", blue: "#00f" }),
  "colors.red" => StringSymbol("#f00"),    // flattened
  "colors.blue" => StringSymbol("#00f")    // flattened
}
```

### Resolution Control

```typescript
pendingResolution: Set<RefPath>
  // Guard against recursive resolution
  // Contains tokens currently being resolved
```

**Purpose**: Prevent infinite loops when resolution cascades trigger more resolutions.

**Example:**
```typescript
// When resolving "base":
pendingResolution.add("base")
resolveSingleToken("base")
  // ... this might trigger resolution of "spacing"
  // but if "spacing" tries to trigger "base" again,
  // we skip it because it's in pendingResolution
pendingResolution.delete("base")
```

## Resolution Flow

### Phase-by-Phase Execution

The `resolve()` method orchestrates the entire resolution process:

```typescript
public resolve(): ProcessorResult {
  const earlyResolved = this.buildRequirementsGraph();
  this.mapToRequiredByPrefixes();
  this.releaseEarlyResolved(earlyResolved);
  this.resolveDependencyFreeTokens();
  this.finalizeResolution();
  return { graph, resolved, unresolved };
}
```

### Phase 1: buildRequirementsGraph()

**Purpose**: Parse all tokens, identify dependencies, and resolve trivial tokens.

**Process:**
```
For each token (name, value):
  ┌─ Is it a keyword (e.g., "inherit")? ──> Resolve immediately
  │
  ├─ Can't parse? ──> Mark as error
  │
  ├─ Empty AST? ──> Resolve as empty string
  │
  └─ Has dependencies?
      ├─ Parse and store AST
      ├─ Add to prefix tracking
      └─ For each dependency:
          ├─ Is it a prefix (not a token)? ──> Track as prefix dependency
          ├─ Already resolved? ──> Skip
          ├─ Is it an actual token? ──> Track as token dependency
          ├─ Has a parent token? ──> Track as virtual child
          └─ Otherwise ──> Mark as missing (error)
```

**State Changes:**
- Populates: `resolved`, `unresolved`, `astNodes`, `allPrefixes`
- Populates: `requiresTokens`, `requiredByTokens`, `virtualChildren`
- Populates: `requiredPrefixesMap`
- Returns: List of early-resolved token names

**Example Flow:**

Input:
```json
{
  "base": "8",
  "spacing": "{base} * 2",
  "colors.red": "#f00"
}
```

After buildRequirementsGraph:
```typescript
earlyResolved: ["base", "colors.red"]

resolved: Map {
  "base" => NumberSymbol(8),
  "colors.red" => StringSymbol("#f00")
}

unresolved: Map {
  "spacing" => {
    ast: BinaryOpNode(...),
    dependencies: Set(["base"])
  }
}

requiresTokens: Map {
  "spacing" => Set(["base"])
}

requiredByTokens: Map {
  "base" => Set(["spacing"])
}

allPrefixes: Map {
  "colors" => Set(["colors.red"])
}

referenceCache: Map {
  "base" => NumberSymbol(8),
  "colors.red" => StringSymbol("#f00")
}
```

### Phase 2: mapToRequiredByPrefixes()

**Purpose**: Build bidirectional links between tokens and the prefixes they contribute to or depend on.

**Process:**
```
For each prefix that has waiting tokens:
  ┌─ Find all tokens with that prefix
  │
  ├─ For each prefixed token:
  │   └─ Link: token ←→ prefix (bidirectional)
  │
  └─ For each waiting token:
      └─ Mark: token is waiting for this prefix
```

**State Changes:**
- Populates: `requiredByPrefixes` (token → prefixes it contributes to)
- Populates: `requiredPrefixes` (prefix → tokens it needs)
- Populates: `tokensToRequiredPrefixes` (token → prefixes it's waiting for)

**Example Flow:**

Input state (from phase 1):
```typescript
requiredPrefixesMap: Map {
  "colors" => Set(["theme"])  // theme is waiting for colors prefix
}

allPrefixes: Map {
  "colors" => Set(["colors.red", "colors.blue"])
}
```

After mapToRequiredByPrefixes:
```typescript
requiredByPrefixes: Map {
  "colors.red" => Set(["colors"]),
  "colors.blue" => Set(["colors"])
}

requiredPrefixes: Map {
  "colors" => Set(["colors.red", "colors.blue"])
}

tokensToRequiredPrefixes: Map {
  "theme" => Set(["colors"])
}
```

**Why this phase?**
- Separates dependency discovery from dependency linking
- Ensures all tokens are parsed before linking starts
- Makes it easier to detect circular dependencies

### Phase 3: releaseEarlyResolved()

**Purpose**: Notify dependents of tokens that were resolved during parsing.

**Process:**
```
For each early-resolved token:
  ├─ Release token dependents
  │   └─ For each token waiting on this:
  │       ├─ Remove this from their dependency list
  │       └─ If they have no more dependencies, resolve them
  │
  └─ Release prefix contributions
      └─ If this token completes a prefix:
          ├─ Build dictionary from all prefix tokens
          └─ Notify tokens waiting for the prefix
```

**State Changes:**
- Modifies: `requiresTokens` (removes satisfied dependencies)
- Modifies: `requiredPrefixes` (removes satisfied tokens)
- May trigger: Cascade of resolutions

**Example Flow:**

Input state:
```typescript
resolved: Map {
  "base" => NumberSymbol(8)
}

requiresTokens: Map {
  "spacing" => Set(["base"])
}

requiredByTokens: Map {
  "base" => Set(["spacing"])
}
```

After releaseEarlyResolved(["base"]):
```typescript
requiresTokens: Map {
  "spacing" => Set()  // base dependency removed
}

requiredByTokens: Map {
  // "base" entry deleted
}

// This triggers resolution of "spacing" since it has no more dependencies
```

### Phase 4: resolveDependencyFreeTokens()

**Purpose**: Resolve all tokens that have no remaining dependencies.

**Process:**
```
Collect all ready tokens:
  For each unresolved token:
    If requiresTokens[token].size == 0
    AND tokensToRequiredPrefixes[token].size == 0:
      Add to ready list

For each ready token:
  Resolve it
  ├─ This may trigger cascade resolutions
  └─ Via releaseDependents() and releasePrefixes()
```

**State Changes:**
- Populates: `resolved`
- Populates: `referenceCache`
- Empties: `unresolved` (for resolved tokens)
- May trigger: More resolutions via cascade

**Example Flow:**

Input state:
```typescript
requiresTokens: Map {
  "spacing" => Set()
}

tokensToRequiredPrefixes: Map {
  // empty
}
```

After resolveDependencyFreeTokens:
```typescript
resolved: Map {
  "base" => NumberSymbol(8),
  "spacing" => NumberSymbol(16)  // newly resolved
}

requiresTokens: Map {
  // "spacing" entry deleted
}
```

### Phase 5: finalizeResolution()

**Purpose**: Handle remaining unresolved tokens (errors, circular dependencies).

**Process:**
```
While changes occur:
  For each still-unresolved token:
    ┌─ Has no dependencies? ──> Resolve it (shouldn't happen, but safety)
    │
    ├─ Has dependency errors? ──> Create DependencyError and resolve
    │   └─ Notify dependents (error propagates)
    │
    └─ Otherwise ──> Add to unresolved list
  
  If no changes and still have unresolved:
    Throw circular dependency error
```

**State Changes:**
- Populates: `resolved` (with errors)
- Empties: `unresolved`
- Throws: If truly circular

**Example Flow - Error Propagation:**

Input state:
```typescript
resolved: Map {
  "base" => Error("Token 'missing' not found")
}

unresolved: Map {
  "spacing" => { dependencies: Set(["base"]) },
  "component" => { dependencies: Set(["spacing"]) }
}
```

First iteration:
```typescript
// spacing has dependency error (base is error)
resolved: Map {
  "base" => Error("Token 'missing' not found"),
  "spacing" => DependencyError("spacing depends on base")
}
// Notify dependents of spacing
```

Second iteration:
```typescript
// component has dependency error (spacing is error)
resolved: Map {
  "base" => Error("Token 'missing' not found"),
  "spacing" => DependencyError("spacing depends on base"),
  "component" => DependencyError("component depends on spacing")
}
```

## Method-by-Method Breakdown

### Constructor

```typescript
constructor(
  private readonly tokens: Map<RefPath, string>,
  callbacks?: ProcessorCallbacks,
  config?: Config
)
```

**Purpose**: Initialize the resolver with input tokens and configuration.

**Process:**
1. Store callbacks for resolution notifications
2. Store configuration
3. Create single interpreter instance with live reference to `referenceCache`

**Key Design Decision:**
- **Single interpreter instance**: Reused for all tokens by swapping AST
- **Live reference cache**: Interpreter sees updates immediately as tokens resolve

**Performance Impact:**
- Creating interpreter is expensive (~100µs)
- Reusing one instance: ~7x faster than creating per token

### buildRequirementsGraph()

```typescript
private buildRequirementsGraph(): RefPath[]
```

**Returns**: Array of token names that were resolved early (during parsing).

**Detailed Logic:**

```typescript
for (const [tokenName, tokenValue] of this.tokens.entries()) {
  // FAST PATH 1: Uninterpreted keywords (e.g., "inherit", "none")
  if (UNINTERPRETED_KEYWORDS.includes(tokenValue)) {
    const symbol = new StringSymbol(tokenValue, this.config);
    this.resolved.set(tokenName, symbol);
    this.referenceCache.set(tokenName, symbol);
    this.callbacks?.onResolve?.(tokenName, symbol);
    this.graph.addNode(tokenName, []);
    earlyResolved.push(tokenName);
    continue;  // Skip to next token
  }

  // TRY TO PARSE
  let parseResult: ParseExpressionResult;
  try {
    parseResult = parseExpression(tokenValue);
  } catch (error) {
    // FAST PATH 2: Parse errors
    const err = error instanceof Error ? error : new Error(String(error));
    this.resolved.set(tokenName, err);
    this.callbacks?.onError?.(tokenName, err, tokenValue);
    this.graph.addNode(tokenName, []);
    earlyResolved.push(tokenName);
    continue;  // Skip to next token
  }

  const { ast, parser } = parseResult;
  
  // FAST PATH 3: Empty/null AST
  if (!ast) {
    this.resolved.set(tokenName, "");
    this.referenceCache.set(tokenName, "");
    this.callbacks?.onResolve?.(tokenName, "");
    this.graph.addNode(tokenName, []);
    earlyResolved.push(tokenName);
    continue;  // Skip to next token
  }

  // STANDARD PATH: Token has dependencies
  this.astNodes.set(tokenName, ast);  // Store AST for later interpretation
  this.addToPrefixes(tokenName);      // Track in prefix hierarchy

  const dependencies = parser.requiredReferences;
  if (dependencies.size > 0) {
    this.unresolved.set(tokenName, { ast, dependencies });
  }

  this.graph.addNode(tokenName, dependencies);

  // PROCESS EACH DEPENDENCY
  for (const dep of dependencies) {
    // CASE 1: Prefix dependency (not an actual token)
    if (this.allPrefixes.has(dep) && !this.tokens.has(dep)) {
      this.addToSetMap(this.requiredPrefixesMap, dep, tokenName);
      continue;
    }

    // CASE 2: Already resolved
    if (this.resolved.has(dep)) continue;

    // CASE 3: Token dependency
    this.addToSetMap(this.requiresTokens, tokenName, dep);
    this.addToSetMap(this.requiredByTokens, dep, tokenName);

    if (this.tokens.has(dep)) continue;

    // CASE 4: Virtual child (parent.child where parent exists)
    const parentToken = this.findParentToken(dep);
    if (parentToken) {
      this.addToSetMap(this.virtualChildren, parentToken, dep);
      continue;
    }

    // CASE 5: Missing token
    if (!this.referenceCache.has(dep)) {
      const error = new Error(`Token '${dep}' not found`);
      this.resolved.set(dep, error);
      this.callbacks?.onError?.(dep, error, "");
      this.graph.addNode(dep, []);
      earlyResolved.push(dep);
    }
  }
}

return earlyResolved;
```

**Critical Decision Tree:**

```
Token Value
    │
    ├─ Is keyword? ──> Resolve immediately ──> earlyResolved[]
    │
    ├─ Parse fails? ──> Mark error ──> earlyResolved[]
    │
    ├─ No AST? ──> Resolve as "" ──> earlyResolved[]
    │
    └─ Has dependencies:
        └─ For each dependency:
            │
            ├─ Is prefix (not token)? ──> requiredPrefixesMap
            │
            ├─ Already resolved? ──> Skip
            │
            ├─ Is actual token? ──> requiresTokens, requiredByTokens
            │
            ├─ Has parent token? ──> virtualChildren
            │
            └─ Otherwise ──> Mark missing error ──> earlyResolved[]
```

**Why track both `requiresTokens` and `requiredByTokens`?**

```typescript
// requiresTokens: Used to check if token is ready
function isReady(token: string): boolean {
  const deps = requiresTokens.get(token);
  return !deps || deps.size === 0;
}

// requiredByTokens: Used to notify dependents when resolved
function notifyDependents(token: string): void {
  const dependents = requiredByTokens.get(token);
  if (dependents) {
    for (const dependent of dependents) {
      // Clear this dependency
      // Check if dependent is now ready
    }
  }
}
```

### addToPrefixes()

```typescript
private addToPrefixes(tokenName: RefPath): void
```

**Purpose**: Track this token under all its prefix hierarchies.

**Algorithm:**
```typescript
let dotIndex = tokenName.indexOf(".");
if (dotIndex === -1) return;  // No prefix (top-level token)

while (dotIndex !== -1) {
  const prefix = tokenName.slice(0, dotIndex);
  this.addToSetMap(this.allPrefixes, prefix, tokenName);
  dotIndex = tokenName.indexOf(".", dotIndex + 1);
}
```

**Example:**
```typescript
addToPrefixes("base.size.sm")

// First iteration: dotIndex = 4 ("base")
allPrefixes["base"].add("base.size.sm")

// Second iteration: dotIndex = 9 ("base.size")
allPrefixes["base.size"].add("base.size.sm")

// Third iteration: dotIndex = -1 (done)
```

**Why this matters:**
- When someone references `{base}`, we need all `base.*` tokens
- When someone references `{base.size}`, we need all `base.size.*` tokens

**Performance:**
- Old implementation: `split(".").slice().join(".")` - O(n) allocations
- New implementation: `indexOf + slice` - O(1) allocations
- For token `a.b.c.d.e`: **5 strings** vs **15+ array/string allocations**

### mapToRequiredByPrefixes()

```typescript
private mapToRequiredByPrefixes(): void
```

**Purpose**: Create bidirectional links between tokens and prefixes.

**Process:**
```typescript
for (const [prefix, tokens] of this.requiredPrefixesMap) {
  // requiredPrefixesMap: prefix → tokens waiting for it
  // Example: "colors" → Set(["theme"])
  
  const prefixedTokens = this.allPrefixes.get(prefix);
  // Example: Get all tokens like "colors.red", "colors.blue"
  
  if (!prefixedTokens) continue;

  // STEP 1: Link prefix tokens to the prefix
  for (const token of prefixedTokens) {
    this.addToSetMap(this.requiredByPrefixes, token, prefix);
    // "colors.red" contributes to prefix "colors"
    
    this.addToSetMap(this.requiredPrefixes, prefix, token);
    // Prefix "colors" needs "colors.red" to resolve
  }

  // STEP 2: Mark waiting tokens
  for (const token of tokens) {
    this.addToSetMap(this.tokensToRequiredPrefixes, token, prefix);
    // "theme" is waiting for prefix "colors"
  }
}
```

**State Transformation:**

Before:
```typescript
requiredPrefixesMap: Map {
  "colors" => Set(["theme"])
}
allPrefixes: Map {
  "colors" => Set(["colors.red", "colors.blue"])
}
```

After:
```typescript
requiredByPrefixes: Map {
  "colors.red" => Set(["colors"]),
  "colors.blue" => Set(["colors"])
}

requiredPrefixes: Map {
  "colors" => Set(["colors.red", "colors.blue"])
}

tokensToRequiredPrefixes: Map {
  "theme" => Set(["colors"])
}
```

**Why separate step?**
- Ensures all tokens are discovered before linking
- Makes circular dependency detection easier
- Cleaner separation of concerns

### releaseEarlyResolved()

```typescript
private releaseEarlyResolved(earlyResolved: RefPath[]): void
```

**Purpose**: Process tokens that were resolved during graph building.

**Process:**
```typescript
for (const tokenName of earlyResolved) {
  this.releaseDependents(tokenName);
  this.releasePrefixes(tokenName);
}
```

**Why needed?**
During `buildRequirementsGraph`, we:
1. Resolve simple tokens immediately (keywords, empty values, errors)
2. Track them as dependencies of other tokens
3. But don't notify those dependents yet (graph building not complete)

After graph building completes, we release these early-resolved tokens so:
1. Their dependents can start resolving
2. Any prefixes they contribute to can be built

**Example:**

```typescript
// During buildRequirementsGraph:
tokens: {
  "base": "8",           // Resolved immediately
  "spacing": "{base} * 2"  // Tracked as depending on "base"
}

earlyResolved: ["base"]

requiredByTokens: Map {
  "base" => Set(["spacing"])
}

requiresTokens: Map {
  "spacing" => Set(["base"])
}

// After releaseEarlyResolved(["base"]):
requiresTokens: Map {
  "spacing" => Set()  // "base" dependency cleared
}

// This makes "spacing" ready to resolve
```

### resolveDependencyFreeTokens()

```typescript
private resolveDependencyFreeTokens(): void
```

**Purpose**: Resolve all tokens with no pending dependencies.

**Algorithm:**
```typescript
// STEP 1: Collect ready tokens
const ready: RefPath[] = [];
for (const tokenName of this.tokens.keys()) {
  if (this.resolved.has(tokenName)) continue;
  
  const waitsForTokens = this.requiresTokens.get(tokenName);
  const waitsForPrefixes = this.tokensToRequiredPrefixes.get(tokenName);
  
  if (
    (!waitsForTokens || waitsForTokens.size === 0) &&
    (!waitsForPrefixes || waitsForPrefixes.size === 0)
  ) {
    ready.push(tokenName);
  }
}

// STEP 2: Resolve them (may trigger cascade)
for (const tokenName of ready) {
  this.resolveSingleToken(tokenName);
}
```

**Why separate collect/resolve steps?**
- Resolving a token may trigger resolution of other tokens
- We don't want to modify the collection we're iterating over
- Cleaner and safer iteration pattern

**Example Cascade:**

```typescript
ready: ["base"]

resolveSingleToken("base")
  └─> notifyResolution("base")
      └─> releaseDependents("base")
          └─> "spacing" is now ready
              └─> resolveSingleToken("spacing")
                  └─> notifyResolution("spacing")
                      └─> releaseDependents("spacing")
                          └─> "component" is now ready
                              └─> resolveSingleToken("component")
```

### resolveSingleToken()

```typescript
private resolveSingleToken(tokenName: RefPath): void
```

**Purpose**: Resolve one token and handle all side effects.

**Complete Flow:**

```typescript
// GUARDS
if (!this.tokens.has(tokenName) || this.resolved.has(tokenName)) return;

const ast = this.astNodes.get(tokenName);
const originalValue = this.tokens.get(tokenName)!;
const dependencyError = this.buildDependencyError(tokenName);

let tokenValue: TokenResult;

// RESOLUTION PATHS
if (dependencyError) {
  // PATH 1: Dependency failed
  tokenValue = dependencyError;
  this.resolved.set(tokenName, dependencyError);
  this.callbacks?.onError?.(tokenName, dependencyError, originalValue);
  
} else if (!ast) {
  // PATH 2: No AST (shouldn't happen here, but safety)
  tokenValue = originalValue;
  this.resolved.set(tokenName, originalValue);
  this.callbacks?.onResolve?.(tokenName, originalValue);
  this.referenceCache.set(tokenName, originalValue);
  
} else {
  // PATH 3: Normal interpretation
  try {
    this.interpreter.setAst(ast);
    tokenValue = this.interpreter.interpret();
    this.resolved.set(tokenName, tokenValue);
    this.callbacks?.onResolve?.(tokenName, tokenValue);
    if (!(tokenValue instanceof Error)) {
      this.referenceCache.set(tokenName, tokenValue);
    }
  } catch (error) {
    tokenValue = error instanceof Error ? error : new Error(String(error));
    this.resolved.set(tokenName, tokenValue);
    this.callbacks?.onError?.(tokenName, tokenValue as Error, originalValue);
  }
}

// SIDE EFFECTS
const flattened = this.flattenIfDictionary(tokenName, tokenValue);
this.resolveVirtualChildren(tokenName, flattened);
this.notifyResolution(tokenName, flattened);
this.requiresTokens.delete(tokenName);
this.unresolved.delete(tokenName);
```

**State Changes:**

Before:
```typescript
unresolved: Map {
  "spacing" => { ast: ..., dependencies: Set(["base"]) }
}
astNodes: Map {
  "spacing" => BinaryOpNode(...)
}
requiresTokens: Map {
  "spacing" => Set()  // Already cleared by releaseDependents
}
```

After resolveSingleToken("spacing"):
```typescript
resolved: Map {
  "spacing" => NumberSymbol(16)
}

referenceCache: Map {
  "spacing" => NumberSymbol(16)
}

unresolved: Map {
  // "spacing" removed
}

requiresTokens: Map {
  // "spacing" removed
}

// If "spacing" had dependents, they're notified
```

### buildDependencyError()

```typescript
private buildDependencyError(tokenName: RefPath): DependencyError | undefined
```

**Purpose**: Check if any of this token's dependencies have errors.

**Logic:**
```typescript
const meta = this.unresolved.get(tokenName);
if (!meta) return undefined;  // Not in unresolved map

for (const dep of meta.dependencies) {
  const depValue = this.resolved.get(dep);
  if (depValue instanceof Error) {
    return new DependencyError(tokenName, dep, depValue);
  }
}

return undefined;  // All dependencies are OK
```

**Example:**

```typescript
// Given:
resolved: Map {
  "base" => Error("Token 'missing' not found")
}

unresolved: Map {
  "spacing" => { dependencies: Set(["base"]) }
}

// Call:
buildDependencyError("spacing")

// Returns:
DependencyError("spacing depends on base", {
  dependencyChain: ["spacing", "base", "missing"]
})
```

**Why this check?**
- A token might be ready (all deps resolved)
- But one of those deps might be an error
- We want to propagate the error, not try to interpret

### flattenIfDictionary()

```typescript
private flattenIfDictionary(tokenName: RefPath, value: TokenResult): RefPath[]
```

**Purpose**: If value is a dictionary, add all its entries to the reference cache.

**Logic:**
```typescript
if (!(value instanceof DictionarySymbol) || !value.value) {
  return [];  // Not a dictionary
}

const flattenedNames: RefPath[] = [];
const entries = value.value;  // Map<string, ISymbolType>

for (const [childKey, childValue] of entries) {
  const flattenedKey = `${tokenName}.${childKey}`;
  const clone = this.isSymbolType(childValue) 
    ? childValue.cloneIfMutable() 
    : childValue;
  this.referenceCache.set(flattenedKey, clone);
  flattenedNames.push(flattenedKey);
}

return flattenedNames;
```

**Example:**

```typescript
// Input:
tokenName: "colors"
value: DictionarySymbol(Map {
  "red" => StringSymbol("#f00"),
  "blue" => StringSymbol("#00f")
})

// Process:
referenceCache.set("colors.red", StringSymbol("#f00"))
referenceCache.set("colors.blue", StringSymbol("#00f"))

// Return:
["colors.red", "colors.blue"]
```

**Why flatten?**
- Allows `{colors.red}` to resolve even though `colors.red` isn't a token
- Supports nested dictionary access
- Enables virtual children to work

**Why clone?**
- Symbols can be mutable (e.g., ColorSymbol has methods that modify state)
- Cloning prevents one reference from affecting another
- Immutable symbols return themselves (optimization)

### resolveVirtualChildren()

```typescript
private resolveVirtualChildren(parent: RefPath, flattened: RefPath[]): void
```

**Purpose**: Handle references to `parent.child` where only `parent` exists.

**Logic:**
```typescript
const children = this.virtualChildren.get(parent);
if (!children || children.size === 0) return;

const satisfied = flattened.length > 0 ? new Set(flattened) : null;
const parentValue = this.resolved.get(parent);

for (const child of children) {
  // Check if already satisfied
  if ((satisfied && satisfied.has(child)) || 
      this.referenceCache.has(child) || 
      this.resolved.has(child)) {
    continue;
  }

  // Not satisfied - create error
  const error = parentValue instanceof Error
    ? new DependencyError(child, parent, parentValue)
    : new Error(`Token '${child}' not found`);

  this.resolved.set(child, error);
  this.callbacks?.onError?.(child, error, "");
}

this.virtualChildren.delete(parent);
```

**Example - Success:**

```typescript
// Given:
parent: "theme"
flattened: ["theme.primary", "theme.secondary"]

virtualChildren: Map {
  "theme" => Set(["theme.primary", "theme.secondary"])
}

// After:
// Both children satisfied by flattening
// virtualChildren entry deleted
```

**Example - Failure:**

```typescript
// Given:
parent: "theme"
flattened: ["theme.primary"]  // Only one child

virtualChildren: Map {
  "theme" => Set(["theme.primary", "theme.secondary"])
}

// After:
resolved: Map {
  "theme.secondary" => Error("Token 'theme.secondary' not found")
}

// Error: theme.secondary was expected but parent didn't provide it
```

**Why needed?**
- User might reference `{theme.accent}` expecting it in theme dictionary
- If theme doesn't have `accent`, we need to report the error
- Without this, reference would silently fail during interpretation

### notifyResolution()

```typescript
private notifyResolution(name: RefPath, flattened?: RefPath[]): void
```

**Purpose**: Notify all dependents that this token (and flattened children) are now available.

**Logic:**
```typescript
this.releaseDependents(name);
this.releasePrefixes(name);

if (flattened) {
  for (const flatName of flattened) {
    this.releaseDependents(flatName);
    this.releasePrefixes(flatName);
  }
}
```

**Why notify flattened children?**
- Other tokens might depend on `{colors.red}`
- When `colors` resolves and flattens to `colors.red`, those dependents need notification
- Otherwise they'd remain stuck waiting for `colors.red`

**Example:**

```typescript
// Given:
tokens: {
  "colors": "{ red: '#f00', blue: '#00f' }",
  "button.bg": "{colors.red}",
  "button.text": "{colors.blue}"
}

// When "colors" resolves:
notifyResolution("colors", ["colors.red", "colors.blue"])
  ├─ releaseDependents("colors")
  ├─ releasePrefixes("colors")
  ├─ releaseDependents("colors.red")  // Notifies "button.bg"
  └─ releaseDependents("colors.blue")  // Notifies "button.text"
```

### releaseDependents()

```typescript
private releaseDependents(name: RefPath): void
```

**Purpose**: Clear this token from dependents' waiting lists and trigger resolution if ready.

**Complete Logic:**

```typescript
const dependents = this.requiredByTokens.get(name);
if (!dependents) return;  // No one waiting for this

for (const dependent of dependents) {
  // GUARD: Prevent recursion
  if (this.pendingResolution.has(dependent)) continue;

  const deps = this.requiresTokens.get(dependent);
  if (!deps) continue;

  // CLEAR DEPENDENCY
  deps.delete(name);
  
  // CHECK IF READY
  if (deps.size === 0) {
    const waitingPrefixes = this.tokensToRequiredPrefixes.get(dependent);
    if (!waitingPrefixes || waitingPrefixes.size === 0) {
      // READY! Resolve it
      this.requiresTokens.delete(dependent);
      this.pendingResolution.add(dependent);  // Prevent recursion
      this.resolveSingleToken(dependent);
      this.pendingResolution.delete(dependent);
    }
  }
}

this.requiredByTokens.delete(name);
```

**Recursion Prevention:**

```typescript
// Without pendingResolution:
releaseDependents("base")
  └─> resolveSingleToken("spacing")
      └─> notifyResolution("spacing")
          └─> releaseDependents("spacing")
              └─> resolveSingleToken("component")
                  └─> might somehow trigger "spacing" again
                      └─> INFINITE LOOP

// With pendingResolution:
pendingResolution: Set(["spacing"])  // Guards against re-entry
```

**State Transformation:**

Before:
```typescript
requiresTokens: Map {
  "spacing" => Set(["base"]),
  "derived" => Set(["base"])
}

requiredByTokens: Map {
  "base" => Set(["spacing", "derived"])
}
```

After releaseDependents("base"):
```typescript
requiresTokens: Map {
  "spacing" => Set(),    // Cleared, will be deleted
  "derived" => Set()     // Cleared, will be deleted
}

requiredByTokens: Map {
  // "base" entry deleted
}

// Both "spacing" and "derived" will be resolved
```

### releasePrefixes()

```typescript
private releasePrefixes(name: RefPath): void
```

**Purpose**: Check if this token completes any prefixes; if so, build and release them.

**Logic:**
```typescript
const prefixes = this.requiredByPrefixes.get(name);
if (!prefixes) return;  // This token doesn't contribute to any prefix

for (const prefix of prefixes) {
  const prefixSet = this.requiredPrefixes.get(prefix);
  if (prefixSet) {
    prefixSet.delete(name);  // Remove this token from prefix requirements
    
    if (prefixSet.size === 0) {
      // ALL tokens for this prefix are resolved!
      this.requiredPrefixes.delete(prefix);
      this.releasePrefix(prefix);  // Build dictionary and notify waiters
    }
  }
}

this.requiredByPrefixes.delete(name);
```

**Example:**

```typescript
// Given:
requiredPrefixes: Map {
  "colors" => Set(["colors.red", "colors.blue"])
}

requiredByPrefixes: Map {
  "colors.red" => Set(["colors"]),
  "colors.blue" => Set(["colors"])
}

// After releasePrefixes("colors.red"):
requiredPrefixes: Map {
  "colors" => Set(["colors.blue"])  // Still waiting for blue
}

// After releasePrefixes("colors.blue"):
requiredPrefixes: Map {
  // "colors" entry deleted (size became 0)
}

// releasePrefix("colors") is called to build the dictionary
```

### releasePrefix()

```typescript
private releasePrefix(prefix: string): void
```

**Purpose**: Build a dictionary from all prefix tokens and notify waiting tokens.

**Complete Logic:**

```typescript
const prefixedTokens = this.allPrefixes.get(prefix);
if (!prefixedTokens) return;

// STEP 1: Build dictionary from direct children only
const dictionaryEntries = new Map<string, ISymbolType>();
const prefixLen = prefix.length + 1;  // Length of "colors."

for (const tokenName of prefixedTokens) {
  const shortName = tokenName.slice(prefixLen);  // "colors.red" => "red"
  
  // Only include direct children (not nested like "colors.red.500")
  if (!shortName.includes(".")) {
    const referenceValue = this.referenceCache.get(tokenName);
    const symbol = this.toSymbol(referenceValue);
    if (symbol) {
      dictionaryEntries.set(shortName, symbol.cloneIfMutable());
    }
  }
}

// STEP 2: Store dictionary in reference cache
if (dictionaryEntries.size > 0) {
  this.referenceCache.set(prefix, new DictionarySymbol(dictionaryEntries, this.config));
}

// STEP 3: Notify waiting tokens
const waitingTokens = this.requiredPrefixesMap.get(prefix);
if (!waitingTokens) return;

for (const tokenName of waitingTokens) {
  if (this.pendingResolution.has(tokenName)) continue;

  const prefixes = this.tokensToRequiredPrefixes.get(tokenName);
  if (!prefixes) continue;

  prefixes.delete(prefix);  // Clear this prefix dependency
  
  if (prefixes.size === 0) {
    this.tokensToRequiredPrefixes.delete(tokenName);
    const remainingDeps = this.requiresTokens.get(tokenName);
    
    if (!remainingDeps || remainingDeps.size === 0) {
      // READY! Resolve it
      this.pendingResolution.add(tokenName);
      this.resolveSingleToken(tokenName);
      this.pendingResolution.delete(tokenName);
    }
  }
}
```

**Example:**

```typescript
// Given:
allPrefixes: Map {
  "colors" => Set(["colors.red", "colors.red.500", "colors.blue"])
}

referenceCache: Map {
  "colors.red" => StringSymbol("#f00"),
  "colors.red.500" => StringSymbol("#fee"),
  "colors.blue" => StringSymbol("#00f")
}

// releasePrefix("colors"):

// Build dictionary from direct children only:
dictionaryEntries: Map {
  "red" => StringSymbol("#f00"),
  "blue" => StringSymbol("#00f")
}
// "colors.red.500" excluded because shortName is "red.500" (has dot)

// Store in cache:
referenceCache.set("colors", DictionarySymbol({
  red: "#f00",
  blue: "#00f"
}))

// Notify waiters:
waitingTokens: Set(["theme"])
tokensToRequiredPrefixes.get("theme").delete("colors")
// "theme" can now resolve
```

**Why only direct children?**
```typescript
// Given: colors.red, colors.red.500

// If we included both:
{
  "red": "#f00",           // From colors.red
  "red": { "500": "#fee" } // From colors.red.* - CONFLICT!
}

// Solution: Only include direct children
// colors.red.500 will be in the "colors.red" prefix dictionary
```

### finalizeResolution()

```typescript
private finalizeResolution(): void
```

**Purpose**: Handle remaining unresolved tokens (error propagation, circular detection).

**Algorithm:**

```typescript
let changed = true;

while (changed) {
  changed = false;
  const unresolvedTokens: RefPath[] = [];

  for (const tokenName of this.tokens.keys()) {
    if (this.resolved.has(tokenName)) continue;

    const waitsForTokens = this.requiresTokens.get(tokenName);
    const waitsForPrefixes = this.tokensToRequiredPrefixes.get(tokenName);
    
    // CASE 1: Ready to resolve (shouldn't happen, but safety)
    if (
      (!waitsForTokens || waitsForTokens.size === 0) &&
      (!waitsForPrefixes || waitsForPrefixes.size === 0)
    ) {
      this.resolveSingleToken(tokenName);
      changed = true;
      continue;
    }

    // CASE 2: Has dependency error
    const dependencyError = this.buildDependencyError(tokenName);
    if (dependencyError) {
      this.resolved.set(tokenName, dependencyError);
      this.callbacks?.onError?.(tokenName, dependencyError, this.tokens.get(tokenName)!);
      this.resolveVirtualChildren(tokenName, []);
      this.notifyResolution(tokenName);
      this.requiresTokens.delete(tokenName);
      this.unresolved.delete(tokenName);
      changed = true;
      continue;
    }

    // CASE 3: Still waiting (might be circular)
    unresolvedTokens.push(tokenName);
  }

  // CIRCULAR DETECTION
  if (!changed && unresolvedTokens.length > 0) {
    throw new Error(`Detected circular dependency or unresolved prefixes: ${unresolvedTokens.join(", ")}`);
  }
}
```

**Why loop until no changes?**

Error propagation is transitive:
```typescript
// Iteration 1:
"a" depends on "missing" (error) → resolve "a" as DependencyError
changed = true

// Iteration 2:
"b" depends on "a" (now error) → resolve "b" as DependencyError
changed = true

// Iteration 3:
"c" depends on "b" (now error) → resolve "c" as DependencyError
changed = true

// Iteration 4:
No changes → done
```

**Example - Error Propagation:**

```typescript
// Initial state:
tokens: {
  "a": "{missing}",
  "b": "{a}",
  "c": "{b}"
}

resolved: Map {
  "missing" => Error("Token 'missing' not found")
}

unresolved: Map {
  "a" => { dependencies: Set(["missing"]) },
  "b" => { dependencies: Set(["a"]) },
  "c" => { dependencies: Set(["b"]) }
}

// Iteration 1:
buildDependencyError("a") → DependencyError("a depends on missing")
resolved.set("a", DependencyError)
notifyResolution("a")
  └─> releaseDependents("a")
      └─> Clear "a" from "b"'s requirements

// Iteration 2:
buildDependencyError("b") → DependencyError("b depends on a")
resolved.set("b", DependencyError)
notifyResolution("b")
  └─> releaseDependents("b")
      └─> Clear "b" from "c"'s requirements

// Iteration 3:
buildDependencyError("c") → DependencyError("c depends on b")
resolved.set("c", DependencyError)

// Iteration 4:
No unresolved tokens → done
```

**Example - Circular Detection:**

```typescript
tokens: {
  "a": "{b}",
  "b": "{a}"
}

// Iteration 1:
unresolvedTokens: ["a", "b"]
changed = false
buildDependencyError("a") → undefined (b not error, just unresolved)
buildDependencyError("b") → undefined (a not error, just unresolved)

// Since !changed && unresolvedTokens.length > 0:
throw Error("Detected circular dependency: a, b")
```

### Helper Methods

#### findParentToken()

```typescript
private findParentToken(reference: RefPath): RefPath | undefined
```

**Purpose**: Find the closest parent token for a reference.

**Example:**
```typescript
reference: "theme.colors.primary"

// Check: "theme.colors" → exists? Return it
// Check: "theme" → exists? Return it
// Otherwise: return undefined

tokens: Map {
  "theme" => "{ colors: {...} }"
}

findParentToken("theme.colors.primary") → "theme"
```

**Algorithm:**
```typescript
let lastDotIndex = reference.lastIndexOf(".");
while (lastDotIndex > 0) {
  const candidate = reference.slice(0, lastDotIndex);
  if (this.tokens.has(candidate)) {
    return candidate;
  }
  lastDotIndex = reference.lastIndexOf(".", lastDotIndex - 1);
}
return undefined;
```

**Optimization:**
- Old: `split(".").slice().join(".")` - multiple allocations
- New: `lastIndexOf + slice` - zero allocations per iteration

#### addToSetMap()

```typescript
private addToSetMap<K, V>(map: Map<K, Set<V>>, key: K, value: V): void
```

**Purpose**: Add value to a set in a map, creating the set if needed.

**Pattern:**
```typescript
// Without helper:
if (!map.has(key)) {
  map.set(key, new Set());
}
map.get(key)!.add(value);  // Two map lookups!

// With helper:
let set = map.get(key);
if (!set) {
  set = new Set();
  map.set(key, set);
}
set.add(value);  // One map lookup
```

**Performance:**
- Called hundreds of times during resolution
- Reducing from 2 to 1 map lookup: ~10% improvement

#### isSymbolType()

```typescript
private isSymbolType(value: any): value is ISymbolType
```

**Purpose**: Type guard to check if value is a symbol (has cloneIfMutable method).

**Usage:**
```typescript
const value = this.referenceCache.get(tokenName);
if (this.isSymbolType(value)) {
  const clone = value.cloneIfMutable();
  // ...
}
```

#### toSymbol()

```typescript
private toSymbol(value: TokenResult | undefined): ISymbolType | undefined
```

**Purpose**: Convert any value to a symbol type.

**Logic:**
```typescript
if (!value) return undefined;
if (this.isSymbolType(value)) return value;
if (typeof value === "string") return new StringSymbol(value, this.config);
if (value === null) return new NullSymbol(this.config);
return undefined;
```

**Usage:**
Used when building dictionaries to ensure all values are proper symbols.

## State Transitions

### Complete Resolution Example

Let's trace a complete resolution for:

```json
{
  "base": "8",
  "colors.red": "#f00",
  "colors.blue": "#00f",
  "spacing": "{base} * 2",
  "theme": "{colors}",
  "button.bg": "{theme.red}"
}
```

#### Phase 1: buildRequirementsGraph

```typescript
// Process "base": "8"
→ No dependencies, resolve immediately
resolved.set("base", NumberSymbol(8))
referenceCache.set("base", NumberSymbol(8))
earlyResolved.push("base")

// Process "colors.red": "#f00"
→ No dependencies, resolve immediately
resolved.set("colors.red", StringSymbol("#f00"))
referenceCache.set("colors.red", StringSymbol("#f00"))
addToPrefixes("colors.red")
  allPrefixes["colors"].add("colors.red")
earlyResolved.push("colors.red")

// Process "colors.blue": "#00f"
→ Similar to colors.red
allPrefixes["colors"].add("colors.blue")
earlyResolved.push("colors.blue")

// Process "spacing": "{base} * 2"
→ Has dependency on "base"
astNodes.set("spacing", BinaryOpNode(...))
unresolved.set("spacing", { ast: ..., dependencies: Set(["base"]) })
requiresTokens["spacing"].add("base")
requiredByTokens["base"].add("spacing")

// Process "theme": "{colors}"
→ Has dependency on "colors" (prefix, not token!)
astNodes.set("theme", ReferenceNode("colors"))
unresolved.set("theme", { ast: ..., dependencies: Set(["colors"]) })
allPrefixes.has("colors") && !tokens.has("colors") → true
requiredPrefixesMap["colors"].add("theme")

// Process "button.bg": "{theme.red}"
→ Has dependency on "theme.red"
astNodes.set("button.bg", ReferenceNode("theme.red"))
unresolved.set("button.bg", { ast: ..., dependencies: Set(["theme.red"]) })
findParentToken("theme.red") → "theme"
virtualChildren["theme"].add("theme.red")
requiresTokens["button.bg"].add("theme.red")
requiredByTokens["theme.red"].add("button.bg")

// Return
earlyResolved: ["base", "colors.red", "colors.blue"]
```

**State after phase 1:**

```typescript
resolved: Map {
  "base" => NumberSymbol(8),
  "colors.red" => StringSymbol("#f00"),
  "colors.blue" => StringSymbol("#00f")
}

unresolved: Map {
  "spacing" => { ast: ..., dependencies: Set(["base"]) },
  "theme" => { ast: ..., dependencies: Set(["colors"]) },
  "button.bg" => { ast: ..., dependencies: Set(["theme.red"]) }
}

requiresTokens: Map {
  "spacing" => Set(["base"]),
  "button.bg" => Set(["theme.red"])
}

requiredByTokens: Map {
  "base" => Set(["spacing"]),
  "theme.red" => Set(["button.bg"])
}

requiredPrefixesMap: Map {
  "colors" => Set(["theme"])
}

allPrefixes: Map {
  "colors" => Set(["colors.red", "colors.blue"])
}

virtualChildren: Map {
  "theme" => Set(["theme.red"])
}
```

#### Phase 2: mapToRequiredByPrefixes

```typescript
for (const [prefix, tokens] of requiredPrefixesMap) {
  // prefix = "colors", tokens = Set(["theme"])
  
  prefixedTokens = allPrefixes.get("colors")
  // = Set(["colors.red", "colors.blue"])
  
  for token in ["colors.red", "colors.blue"]:
    requiredByPrefixes[token].add("colors")
    requiredPrefixes["colors"].add(token)
  
  for token in ["theme"]:
    tokensToRequiredPrefixes[token].add("colors")
}
```

**State after phase 2:**

```typescript
requiredByPrefixes: Map {
  "colors.red" => Set(["colors"]),
  "colors.blue" => Set(["colors"])
}

requiredPrefixes: Map {
  "colors" => Set(["colors.red", "colors.blue"])
}

tokensToRequiredPrefixes: Map {
  "theme" => Set(["colors"])
}
```

#### Phase 3: releaseEarlyResolved

```typescript
for tokenName in ["base", "colors.red", "colors.blue"]:
  releaseDependents(tokenName)
  releasePrefixes(tokenName)

// releaseDependents("base"):
dependents = requiredByTokens.get("base") = Set(["spacing"])
for "spacing":
  requiresTokens["spacing"].delete("base")
  // Now empty!
  tokensToRequiredPrefixes.get("spacing") = undefined
  // Ready to resolve!
  resolveSingleToken("spacing")
    interpreter.setAst(BinaryOpNode(...))
    result = interpreter.interpret() = NumberSymbol(16)
    resolved.set("spacing", NumberSymbol(16))
    referenceCache.set("spacing", NumberSymbol(16))
    notifyResolution("spacing")
      releaseDependents("spacing") // None
      releasePrefixes("spacing") // None

// releasePrefixes("colors.red"):
prefixes = requiredByPrefixes.get("colors.red") = Set(["colors"])
for "colors":
  requiredPrefixes["colors"].delete("colors.red")
  // Now: Set(["colors.blue"])
  // Not empty yet, don't release

// releasePrefixes("colors.blue"):
prefixes = requiredByPrefixes.get("colors.blue") = Set(["colors"])
for "colors":
  requiredPrefixes["colors"].delete("colors.blue")
  // Now: Set() - empty!
  releasePrefix("colors")
    prefixedTokens = Set(["colors.red", "colors.blue"])
    dictionaryEntries = Map {
      "red" => StringSymbol("#f00"),
      "blue" => StringSymbol("#00f")
    }
    referenceCache.set("colors", DictionarySymbol(...))
    
    waitingTokens = Set(["theme"])
    for "theme":
      tokensToRequiredPrefixes["theme"].delete("colors")
      // Now empty!
      requiresTokens.get("theme") = undefined
      // Ready!
      resolveSingleToken("theme")
        interpreter.setAst(ReferenceNode("colors"))
        result = interpreter.interpret() = DictionarySymbol(...)
        resolved.set("theme", DictionarySymbol(...))
        referenceCache.set("theme", DictionarySymbol(...))
        
        flattened = flattenIfDictionary("theme", DictionarySymbol(...))
        // Returns: ["theme.red", "theme.blue"]
        referenceCache.set("theme.red", StringSymbol("#f00"))
        referenceCache.set("theme.blue", StringSymbol("#00f"))
        
        resolveVirtualChildren("theme", ["theme.red", "theme.blue"])
          virtualChildren.get("theme") = Set(["theme.red"])
          "theme.red" in flattened → satisfied
        
        notifyResolution("theme", ["theme.red", "theme.blue"])
          releaseDependents("theme.red")
            dependents = Set(["button.bg"])
            for "button.bg":
              requiresTokens["button.bg"].delete("theme.red")
              // Now empty!
              resolveSingleToken("button.bg")
                interpreter.setAst(ReferenceNode("theme.red"))
                result = interpreter.interpret() = StringSymbol("#f00")
                resolved.set("button.bg", StringSymbol("#f00"))
```

**State after phase 3:**

```typescript
resolved: Map {
  "base" => NumberSymbol(8),
  "colors.red" => StringSymbol("#f00"),
  "colors.blue" => StringSymbol("#00f"),
  "spacing" => NumberSymbol(16),
  "theme" => DictionarySymbol(...),
  "button.bg" => StringSymbol("#f00")
}

unresolved: Map {
  // All resolved!
}

referenceCache: Map {
  "base" => NumberSymbol(8),
  "colors.red" => StringSymbol("#f00"),
  "colors.blue" => StringSymbol("#00f"),
  "colors" => DictionarySymbol({ red: ..., blue: ... }),
  "spacing" => NumberSymbol(16),
  "theme" => DictionarySymbol({ red: ..., blue: ... }),
  "theme.red" => StringSymbol("#f00"),
  "theme.blue" => StringSymbol("#00f"),
  "button.bg" => StringSymbol("#f00")
}
```

#### Phase 4: resolveDependencyFreeTokens

```typescript
// All tokens already resolved in phase 3
// Nothing to do
```

#### Phase 5: finalizeResolution

```typescript
// All tokens resolved
// No errors to propagate
// Exit immediately
```

## Edge Cases and Special Handling

### 1. Circular Dependencies

**Detection:**
```typescript
tokens: {
  "a": "{b}",
  "b": "{c}",
  "c": "{a}"
}

// After buildRequirementsGraph:
requiresTokens: Map {
  "a" => Set(["b"]),
  "b" => Set(["c"]),
  "c" => Set(["a"])
}

// None can resolve because all waiting for each other
// finalizeResolution detects this and throws
```

**Error:**
```
Error: Detected circular dependency or unresolved prefixes: a, b, c
```

### 2. Partial Circular Dependencies

**Scenario:**
```typescript
tokens: {
  "base": "8",
  "a": "{b}",
  "b": "{a}",
  "spacing": "{base} * 2"
}

// "base" and "spacing" resolve fine
// "a" and "b" circular → error
```

**Result:**
```typescript
resolved: Map {
  "base" => NumberSymbol(8),
  "spacing" => NumberSymbol(16),
  // a and b throw in finalizeResolution
}
```

### 3. Token Name Same as Prefix

**Scenario:**
```typescript
tokens: {
  "colors": "#f00",          // Direct token
  "colors.red": "#f00",      // Has prefix "colors"
  "theme": "{colors}"        // Which one?
}
```

**Resolution:**
```typescript
// In buildRequirementsGraph:
if (this.allPrefixes.has(dep) && !this.tokens.has(dep)) {
  // Only treat as prefix if NOT an actual token
}

// So:
this.allPrefixes.has("colors") → true
this.tokens.has("colors") → true
// → NOT a prefix dependency
// → Treat as token dependency

theme resolves to "#f00" (the token value)
```

### 4. Missing Virtual Child

**Scenario:**
```typescript
tokens: {
  "theme": "{ primary: '#f00' }",
  "button": "{theme.accent}"  // accent doesn't exist
}
```

**Resolution:**
```typescript
// buildRequirementsGraph:
virtualChildren["theme"].add("theme.accent")

// When "theme" resolves:
flattened = ["theme.primary"]  // Only primary, no accent

resolveVirtualChildren("theme", ["theme.primary"])
  "theme.accent" not in flattened
  → resolved.set("theme.accent", Error("Token 'theme.accent' not found"))
```

### 5. Nested Dictionary Access

**Scenario:**
```typescript
tokens: {
  "colors": "{ red: { 500: '#f00' } }",
  "button": "{colors.red.500}"
}
```

**Resolution:**
```typescript
// When "colors" resolves:
value = DictionarySymbol({
  red: DictionarySymbol({ 500: '#f00' })
})

// Flatten:
referenceCache.set("colors.red", DictionarySymbol({ 500: '#f00' }))

// But "colors.red.500" is NOT flattened (nested too deep)
// So it becomes a virtual child

// findParentToken("colors.red.500") → "colors"
virtualChildren["colors"].add("colors.red.500")

// Later resolution fails because colors didn't provide colors.red.500
```

**Limitation**: Only one level of flattening supported.

### 6. Error in Prefix Token

**Scenario:**
```typescript
tokens: {
  "colors.red": "{missing}",
  "colors.blue": "#00f",
  "theme": "{colors}"
}
```

**Resolution:**
```typescript
// buildRequirementsGraph:
resolved.set("missing", Error("Token 'missing' not found"))
resolved.set("colors.red", DependencyError("colors.red depends on missing"))
resolved.set("colors.blue", StringSymbol("#00f"))

// releaseEarlyResolved:
releasePrefixes("colors.blue")
  requiredPrefixes["colors"] = Set(["colors.red", "colors.blue"])
  Delete "colors.blue" → Set(["colors.red"])
  Not empty, don't release

releasePrefixes("colors.red")
  Delete "colors.red" → Set()
  Empty! releasePrefix("colors")
    // Build dictionary, but colors.red is an error
    toSymbol(Error(...)) → undefined
    // Only "blue" in dictionary
    referenceCache.set("colors", DictionarySymbol({ blue: '#00f' }))
```

**Result**: Dictionary built with only successful tokens.

### 7. Empty Prefix

**Scenario:**
```typescript
tokens: {
  "colors.red": "{missing}",  // Error
  "theme": "{colors}"
}
```

**Resolution:**
```typescript
// After releasePrefix("colors"):
dictionaryEntries = Map()  // Empty! Both had errors

if (dictionaryEntries.size > 0) {
  // Skipped
}

// referenceCache doesn't get "colors"
// theme tries to resolve
// interpreter: reference "colors" not found → error
```

## Worked Examples

### Example 1: Simple Chain

**Input:**
```json
{
  "a": "10",
  "b": "{a} * 2",
  "c": "{b} + 5"
}
```

**Resolution Timeline:**

```
buildRequirementsGraph:
  ✓ "a" = 10 (early resolved)
  Pend "b" (needs a)
  Pend "c" (needs b)

releaseEarlyResolved(["a"]):
  Release "a" → "b" ready
  ✓ "b" = 20
  Release "b" → "c" ready
  ✓ "c" = 25

Result: All resolved
```

**Final State:**
```typescript
resolved: {
  "a": 10,
  "b": 20,
  "c": 25
}
```

### Example 2: Prefix Dictionary

**Input:**
```json
{
  "size.sm": "8",
  "size.md": "16",
  "size.lg": "24",
  "padding": "{size}"
}
```

**Resolution Timeline:**

```
buildRequirementsGraph:
  ✓ "size.sm" = 8
  ✓ "size.md" = 16
  ✓ "size.lg" = 24
  Pend "padding" (needs prefix "size")

mapToRequiredByPrefixes:
  Link: size.{sm,md,lg} → prefix "size"
  Wait: "padding" waiting for "size"

releaseEarlyResolved:
  releasePrefixes("size.sm")
    requiredPrefixes["size"] = {sm, md, lg}
    Delete sm → {md, lg}
  releasePrefixes("size.md")
    Delete md → {lg}
  releasePrefixes("size.lg")
    Delete lg → {}
    releasePrefix("size")
      Build: { sm: 8, md: 16, lg: 24 }
      referenceCache["size"] = Dictionary
      ✓ "padding" = Dictionary

Result: padding is a dictionary
```

### Example 3: Virtual Children

**Input:**
```json
{
  "theme": "{ primary: '#f00', secondary: '#00f' }",
  "button.bg": "{theme.primary}",
  "button.text": "{theme.accent}"
}
```

**Resolution Timeline:**

```
buildRequirementsGraph:
  Pend "theme" (no deps, but has AST)
  Pend "button.bg" (needs theme.primary)
    findParent("theme.primary") → "theme"
    virtualChildren["theme"].add("theme.primary")
  Pend "button.text" (needs theme.accent)
    virtualChildren["theme"].add("theme.accent")

resolveDependencyFreeTokens:
  ✓ "theme" = { primary: '#f00', secondary: '#00f' }
  Flatten:
    referenceCache["theme.primary"] = '#f00'
    referenceCache["theme.secondary"] = '#00f'
  resolveVirtualChildren:
    "theme.primary" satisfied ✓
    "theme.accent" NOT satisfied
      ✗ "theme.accent" = Error("not found")
  notifyResolution:
    releaseDependents("theme.primary")
      ✓ "button.bg" = '#f00'

Result:
  "theme" ✓
  "button.bg" ✓
  "button.text" ✗ (dependency error)
```

## Summary

The `PrefixResolver` is a sophisticated dependency resolution system that:

1. **Discovers dependencies** through parsing and reference extraction
2. **Tracks bidirectionally** both who needs what and who is needed by what
3. **Resolves in waves** starting with dependency-free tokens
4. **Cascades resolution** as dependencies are satisfied
5. **Builds dictionaries** when all tokens in a prefix are resolved
6. **Propagates errors** through dependency chains
7. **Detects circular** dependencies and fails fast

Key innovations:
- **Prefix-aware**: Understands `{base}` means all `base.*` tokens
- **Virtual children**: Handles `{parent.child}` references
- **Single interpreter**: Reuses one interpreter for performance
- **Live cache**: Reference cache updates immediately as tokens resolve
- **Optimized strings**: Minimal allocations in hot paths

The resolver maintains correctness through careful state management and achieves performance through strategic optimizations.
