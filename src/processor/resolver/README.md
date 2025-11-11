# TokenResolver Architecture

## Overview

The **TokenResolver** resolves tokens with references (e.g., `{colors.primary}`) while managing direct token dependencies and prefix-based dependencies.

## Key Features

- **Prefix-Aware Resolution**: Handles hierarchical token structures (e.g., `colors.primary`, `colors.secondary`)
- **Virtual Children**: Creates child tokens from dictionary structures
- **Circular Dependency Detection**: Identifies and reports circular dependencies
- **Performance Optimized**: Caches computed values and minimizes redundant lookups

## Core Concepts

### Token Types

1. **Simple Tokens**: Tokens without dependencies

   ```json
   {
     "colors.primary": "#FF0000"
   }
   ```

2. **Referenced Tokens**: Tokens that reference other tokens

   ```json
   {
     "colors.primary": "#FF0000",
     "colors.accent": "{colors.primary}"
   }
   ```

3. **Prefix References**: Tokens that reference entire prefix hierarchies

   ```json
   {
     "colors.brand.primary": "#FF0000",
     "colors.brand.secondary": "#00FF00",
     "theme.palette": "{colors.brand}"
   }
   ```

4. **Virtual Children**: Child tokens created from dictionary expansion

   ```json
   {
     "colors": "color_ramp(#FFF, 10)",
     "ui.bg": "{colors.5}"
   }
   ```

## Architecture

### Main Components

#### 1. TokenResolver (Public API)

The main entry point for token resolution.

```typescript
const resolver = new TokenResolver();
const result = resolver.build(tokens);
```

**Responsibilities:**

- Provide public API for token resolution
- Accept configuration and callbacks
- Create PrefixResolver instance
- Format output with tokens and errors
- Handle result aggregation

#### 2. PrefixResolver (Internal)

The core resolution engine that orchestrates the five-phase resolution process.

**Responsibilities:**

- Parse tokens into ASTs
- Build dependency graphs
- Manage resolution phases
- Coordinate helper components

#### 3. DependencyTracker

Tracks both token and prefix dependencies with bidirectional lookups.

**Responsibilities:**

- Track token-to-token dependencies bidirectionally
- Track token-to-prefix dependencies bidirectionally
- Determine token readiness based on dependencies
- Lookup dependents and dependencies
- Add and remove dependencies dynamically

#### 4. PrefixManager

Manages prefix hierarchies, dictionary construction, and virtual children.

**Responsibilities:**

- Extract and cache prefix paths from token names
- Track which tokens belong to each prefix
- Build dictionaries from resolved prefix members
- Manage virtual child relationships
- Find parent tokens for virtual child resolution
- Cache direct children for dictionary building

#### 5. TokenInterpreter

Handles AST interpretation and result caching.

#### 6. ResolutionNotifier

Centralizes dependency release and cascade resolution logic.

**Responsibilities:**

- Release token dependencies
- Release prefix dependencies
- Build prefix dictionaries when ready
- Trigger cascade resolution by adding newly-ready tokens to queue

#### 7. ReadinessTracker

Caches readiness checks to avoid redundant computation.

**Responsibilities:**

- Cache token readiness state
- Invalidate cache when dependencies change
- Skip redundant readiness checks

#### 8. PrefixExtractor

Caches prefix extraction to avoid repeated string operations.

**Responsibilities:**

- Extract all prefix paths from token names
- Cache extraction results
- Provide prefix lookups

**Example:**

```typescript
extractPrefixes("a.b.c.d") // Returns: ["a", "a.b", "a.b.c"]
```

## Resolution Process

### Five-Phase Resolution Strategy

The TokenResolver uses a five-phase approach to resolve tokens:

#### Phase 1: Parse and Build Graph

**Purpose:** Parse all token values and establish the dependency graph.

**Operations:**
1. Parse each token value into an AST
2. Extract dependencies from parsed expressions
3. Identify early-resolved tokens (no dependencies, parse errors, empty values)
4. Build dependency graph nodes
5. Detect missing dependencies
6. Track virtual child relationships

**Early Resolved Tokens:**
- Tokens with parse errors
- Tokens with no AST (empty values)
- Tokens with no dependencies
- Uninterpreted keywords (special literals)

**Example:**
```javascript
// Input tokens
{
  "base": "10",                    // Early resolved (no dependencies)
  "spacing": "{base} * 2",         // Has dependency on 'base'
  "invalid": "{} invalid",         // Early resolved (parse error)
  "colors.primary": "#FF0000"      // Early resolved (no dependencies)
}

// After Phase 1:
// - 'base', 'invalid', 'colors.primary' are resolved
// - 'spacing' is marked as unresolved with dependency on 'base'
```

#### Phase 2: Map Prefix Dependencies

**Purpose:** Identify which tokens depend on prefixes and activate tracking.

**Operations:**
1. Scan unresolved tokens for prefix dependencies
2. Activate prefix tracking for referenced prefixes
3. Mark tokens as waiting for prefix resolution

**Example:**
```javascript
// Input tokens
{
  "colors.red": "#FF0000",
  "colors.blue": "#0000FF",
  "palette": "{colors}",           // Depends on 'colors' prefix
  "primary": "{palette.red}"       // Depends on virtual child
}

// After Phase 2:
// - 'colors' prefix is activated
// - 'palette' is marked as waiting for 'colors' prefix
// - Prefix tracking knows 'colors.red' and 'colors.blue' belong to 'colors'
```

#### Phase 3: Release Early Resolved

**Purpose:** Notify dependents that early-resolved tokens are available.

**Operations:**
1. Process all early-resolved tokens from Phase 1
2. Release their dependents from waiting state
3. Update prefix tracking for prefix members
4. Add newly-ready tokens to ready queue

**Cascade Effect:**
```javascript
// After early resolution of 'base' = 10:
// - 'spacing' (depends on 'base') is released and added to ready queue
// - Ready queue now contains: ['spacing']
```

#### Phase 4: Resolve Dependency-Free Tokens

**Purpose:** Process the ready queue in an event-driven manner.

**Operations:**
1. Seed ready queue with initially dependency-free tokens
2. Process queue in loop until empty:
- Dequeue token
- Interpret token
- Flatten dictionaries (if applicable)
- Resolve virtual children
- Notify dependents (cascade)
3. Newly-ready tokens are automatically added to queue by ResolutionNotifier

**Event-Driven Processing:**
```javascript
// Ready queue processing:
readyQueue = ['spacing']

// Iteration 1:
// - Dequeue 'spacing'
// - Interpret: {base} * 2 = 20
// - Mark resolved
// - Check for dependents and add to queue if ready

// Queue continues until empty
```

**Cascade Resolution:**
When a token is resolved, the `ResolutionNotifier` automatically:
1. Releases token dependencies
2. Releases prefix dependencies (builds dictionaries)
3. Checks if dependents are now ready
4. Adds newly-ready tokens to queue

This creates a cascade where resolving one token can trigger resolution of multiple dependent tokens.

#### Phase 5: Finalize

**Purpose:** Handle stragglers and detect circular dependencies.

**Operations:**
1. Scan for any remaining unresolved tokens
2. Check for dependency errors
3. Throw error if circular dependencies detected

**Error Detection:**
```javascript
// Circular dependency example:
{
  "a": "{b}",
  "b": "{a}"
}
// After Phase 4, both remain unresolved
// Phase 5 detects this and throws error
```

### Resolution Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│ Phase 1: Parse and Build Graph                          │
│ - Parse all tokens into ASTs                            │
│ - Build dependency graph                                │
│ - Identify early-resolved tokens                        │
└──────────────────┬──────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────────┐
│ Phase 2: Map Prefix Dependencies                        │
│ - Identify prefix references                            │
│ - Activate prefix tracking                              │
└──────────────────┬──────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────────┐
│ Phase 3: Release Early Resolved                         │
│ - Notify dependents of early-resolved tokens            │
│ - Trigger initial cascade                               │
└──────────────────┬──────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────────┐
│ Phase 4: Resolve Dependency-Free (Event Loop)           │
│ ┌─────────────────────────────────┐                     │
│ │ While readyQueue not empty:     │                     │
│ │  1. Dequeue token               │                     │
│ │  2. Interpret token             │                     │
│ │  3. Flatten dictionaries        │                     │
│ │  4. Resolve virtual children    │                     │
│ │  5. Notify dependents (cascade) │◄────┐               │
│ └─────────────────────────────────┘     │               │
│                                         │               │
│        Cascade adds newly-ready tokens  │               │
│        back to ready queue ─────────────┘               │
└──────────────────┬──────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────────┐
│ Phase 5: Finalize                                       │
│ - Check for stragglers                                  │
│ - Detect circular dependencies                          │
│ - Throw error if unresolved tokens remain               │
└─────────────────────────────────────────────────────────┘
```

### Prefix Resolution

Prefix resolution handles hierarchical token structures where a token references an entire subtree:

```javascript
// Input
{
  "colors.brand.primary": "#FF0000",
  "colors.brand.secondary": "#00FF00",
  "theme.palette": "{colors.brand}"
}

// Process:
// 1. Parse: 'theme.palette' depends on 'colors.brand' prefix
// 2. Activate: 'colors.brand' prefix tracking starts
// 3. Wait: 'theme.palette' waits for all 'colors.brand.*' tokens to resolve
// 4. Build: When all 'colors.brand.*' tokens are resolved:
//    - Build dictionary: { primary: #FF0000, secondary: #00FF00 }
//    - Store in cache as 'colors.brand'
// 5. Release: 'theme.palette' can now be interpreted
// 6. Result: 'theme.palette' = DictionarySymbol({ primary: #FF0000, secondary: #00FF00 })
```

**Prefix Dictionary Building:**
1. Track which tokens belong to each prefix
2. Cache direct children (tokens with no dots after prefix)
3. When all prefix members resolve, build dictionary
4. Store dictionary in reference cache
5. Release tokens waiting for prefix

### Virtual Children

Virtual children are created when a token evaluates to a dictionary:

```javascript
// Input
{
  "colors": "{ primary: #FF0000, secondary: #00FF00 }",
  "ui.bg": "{colors.primary}"
}

// Process:
// 1. Parse: 'ui.bg' depends on 'colors.primary'
// 2. 'colors.primary' doesn't exist as a token
// 3. Find parent: 'colors' is the parent token
// 4. Mark: 'colors.primary' is a virtual child of 'colors'
// 5. Resolve: 'colors' evaluates to dictionary
// 6. Flatten: Dictionary entries are flattened to cache:
//    - cache['colors.primary'] = #FF0000
//    - cache['colors.secondary'] = #00FF00
// 7. Release: Virtual children are now satisfied
// 8. Continue: 'ui.bg' can now resolve using cache['colors.primary']
```

**Virtual Child Resolution:**
1. During parsing, detect references to non-existent tokens
2. Find parent token using `findParentToken`
3. Track virtual child relationship
4. When parent resolves to dictionary, flatten entries
5. Mark virtual children as resolved
6. If parent doesn't produce expected child, generate error

### Cascade Resolution

The cascade resolution mechanism uses event-driven processing:

```javascript
// Example dependency chain: a -> b -> c -> d
{
"a": "10",
"b": "{a} + 10",
  "c": "{b} + 10",
  "d": "{c} + 10"
}

// Cascade process:
// 1. Phase 1: 'a' is early-resolved (no dependencies)
// 2. Phase 3: Release 'a'
//    - Notify 'b' that 'a' is resolved
//    - Check if 'b' is ready (it is!)
//    - Add 'b' to ready queue
// 3. Phase 4: Process ready queue
//    - Dequeue 'b', interpret: 10 + 10 = 20
//    - Notify 'c' that 'b' is resolved
//    - Add 'c' to ready queue
//    - Dequeue 'c', interpret: 20 + 10 = 30
//    - Notify 'd' that 'c' is resolved
//    - Add 'd' to ready queue
//    - Dequeue 'd', interpret: 30 + 10 = 40
//    - Queue is empty, phase complete
```

**Cascade Triggers:**
1. Token resolution completes
2. `ResolutionNotifier.releaseDependencies` is called
3. For each dependent of resolved token:
- Remove dependency
- Mark readiness cache as dirty
- Check if dependent is now ready
- If ready, add to ready queue
4. Process continues until queue is empty
