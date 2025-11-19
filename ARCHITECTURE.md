# TokenScript Interpreter - Architecture Guide

A quick introduction to the repository structure and how to use the processor runtime.

## Repository Structure

```
typescript-interpreter/
├── src/
│   ├── interpreter/       # Core language interpreter
│   ├── processor/         # Token processing runtime
│   ├── lib/              # Public API exports
│   ├── cli.ts            # CLI entry point
│   └── types.ts          # Shared type definitions
├── tests/                # Test files (mirrors src/)
├── examples/             # Demo applications
├── dist/                 # Compiled output
└── data/                 # Specifications and test data
```

### Core Components

**`src/interpreter/`** - The Language Core
- `lexer.ts` - Tokenizes source code into tokens
- `parser.ts` - Builds Abstract Syntax Tree (AST) from tokens
- `interpreter.ts` - Evaluates AST and executes code
- `symbols.ts` - Type system (Number, String, Color, etc.)
- `config/` - Manages schemas (colors, functions, units)

**`src/processor/`** - The Token Processing Runtime
- `process.ts` - Main entry points for token processing
- `builders/` - Output formats (nested, flat, map)
- `resolver/` - Dependency resolution and evaluation
- `object-parsers/` - Parse token objects (e.g., `{value, unit}`)

**`src/lib/`** - Public Exports
- Defines what gets exported from the npm package
- Provides granular import paths for tree-shaking

## Using the Processor Runtime

The processor is the main way to work with design tokens in your application.

### Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                         INPUT TOKENS                            │
│  (Map, Object, or Token Sets with $value/$type notation)        │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    1. FLATTEN & NORMALIZE                       │
│  • Flatten nested structures to Map<string, string | TokenData> │
│  • Apply set selection (activeSets, activeTheme)                │
│  • Handle token groups and $value properties                    │
│                                                                 │
│  Implementation: src/processor/utils/set-processor.ts           │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      2. OBJECT PARSING                          │
│  • Parse non-string values: {value: 16, unit: "px"} → "16px"    │
│  • Apply custom object parsers                                  │
│  • Convert TokenData objects to strings                         │
│                                                                 │
│  Implementation: src/processor/object-parsers/                  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    3. DEPENDENCY RESOLUTION                     │
│  • Build dependency graph for references: "{primary.color}"     │
│  • Structured tokens: extract string fields from objects/arrays │
│  • Prefix clearing pipeline: resolve children before parents    │
│                                                                 │
│  Implementation: src/processor/resolver/                        │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      4. INTERPRETATION                          │
│  • Lexer: Tokenize expressions                                  │
│  • Parser: Build AST from tokens                                │
│  • Interpreter: Evaluate expressions with schemas               │
│  • Type checking and conversions (Color, Number, String, etc)   │
│                                                                 │
│  Implementation: src/interpreter/                               │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      5. OUTPUT BUILDING                         │
│  • Format results using builder (Map, Object, etc)              │
│  • Convert symbols to strings or preserve types                 │
│  • Collect errors and resolution status                         │
│                                                                 │
│  Implementation: src/processor/builders/                        │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         PROCESS RESULT                          │
│  {                                                              │
│    output: T,              // Resolved tokens in chosen format  │
│    errors: Map<...>,       // Any resolution errors             │
│    resolved: Set<...>,     // Successfully processed tokens     │
│    unresolved: Set<...>    // Failed tokens                     │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
```

### Key Processing Stages

**Stage 1: Flatten & Normalize**
- Converts any input format to a flat `Map<string, string | TokenData>`
- Applies token set selection and theme merging
- Extracts `$value` from token objects

**Stage 2: Object Parsing**
- Handles complex token values like `{value: 16, unit: "px"}`
- Extensible via custom `ObjectParser` implementations
- Falls back to string conversion if no parser matches

**Stage 3: Dependency Resolution**
- Analyzes token references (e.g., `"{primary.color}"`)
- Determines evaluation order using topological sort
- Prevents circular dependency issues

**Stage 4: Interpretation**
- Lexes and parses TokenScript expressions
- Evaluates functions like `mix()`, `lighten()`, etc.
- Type-safe operations with custom schemas

**Stage 5: Output Building**
- Formats results using the chosen builder
- Converts to strings or preserves symbol types
- Aggregates errors and metadata

### Basic Token Processing

Process a simple flat token collection:

```typescript
import { processTokens } from "@tokens-studio/tokenscript-interpreter";

const tokens = new Map([
    ["primary": "#ff6b35"],
    ["secondary": "{primary}"],
    ["spacing-base": "8px"],
    ["font-family": {
        $type: "typography",
        $value: { fontFamilies: "....", fontSize: "8px" }
    }],
]);

const result = processTokens(tokens);
// result.output => Map {
//   "primary" => "#ff6b35",
//   "secondary" => "#ff6b35",
//   "spacing-base" => "8px"
// }
```

When the user passes the desired format of an already permutated set aka `Map<string,  string | TokenData>` we skip straight to resolving processing.

Otherwise the input gets flattened / normalized to a map structure.

Flattening happens here: [set-processor.ts](./src/processor/utils/set-processor.ts)

### Working with Token Sets

Process tokens with set selection and themes:

```typescript
import { processTokenSets } from "@tokens-studio/tokenscript-interpreter";

const tokenSets = {
  "core": {
    "spacing": { "$value": "8px" }
  },
  "light-theme": {
    "bg": { "$value": "#ffffff" }
  },
  "dark-theme": {
    "bg": { "$value": "#000000" }
  }
  // Themes etc
};

const result = processTokenSets(tokenSets, {
  activeSets: ["core"],
  activeTheme: "dark-theme"
});
// Resolves tokens from core + dark-theme
```

See [theme-resolver.test.ts](./tests/processor/theme-resolver.test.ts) for examples.

### Processing Files (Node.js)

For file-based processing, schemas are automatically fetched and registered:

```typescript
import { processTokensFromFiles } from "@tokens-studio/tokenscript-interpreter/processor-node";

const result = await processTokensFromFiles({
  path: "./tokens.json",
  schemas: ["https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/oklch-color/latest/"],  // Auto-fetched!
  activeSets: ["core", "semantic"],
  activeTheme: "dark"
});
```

**Important**: `processTokensFromFiles` automatically fetches schemas from the provided URIs. This is convenient for build-time processing but not recommended for runtime environments.

## Builders - Output Formats

Builders control how resolved tokens are structured in the output.

- [Builders README](./src/processor/builders/README.md)
- [GraphBuilder example](./examples/graph-visualization/src/utils/GraphBuilder.ts) - Used in the token flow visualization

### Built-in Builders

**MapBuilder** (default) - Returns a `Map<string, string>`
```typescript
import { processTokens, MapBuilder } from "@tokens-studio/tokenscript-interpreter";

const result = processTokens(tokens, {
  builder: new MapBuilder()
});
// result.output => Map { "token.name" => "value" }
```

**NestedObjectBuilder** - Returns nested objects
```typescript
import { NestedObjectBuilder } from "@tokens-studio/tokenscript-interpreter";

const result = processTokens(tokens, {
  builder: new NestedObjectBuilder()
});
// result.output => { token: { name: "value" } }
```

**FlatObjectBuilder** - Returns flat object
```typescript
import { FlatObjectBuilder } from "@tokens-studio/tokenscript-interpreter";

const result = processTokens(tokens, {
  builder: new FlatObjectBuilder()
});
// result.output => { "token.name": "value" }
```

### Custom Builder

Create your own output format:

```typescript
import type { TokenBuilder, InterpreterResult } from "@tokens-studio/tokenscript-interpreter";

class CustomBuilder implements TokenBuilder<YourType> {
  name = "custom";
  
  onResolve(tokenName: string, value: InterpreterResult): void {
    // Handle successfully resolved token
  }
  
  onError(tokenName: string, error: Error, originalValue: string): void {
    // Handle resolution errors
  }
  
  getResult(): YourType {
    // Return your custom output format
  }
}

const result = processTokens(tokens, {
  builder: new CustomBuilder()
});
```

## Object Parsers

Object parsers handle non-string token values like `{value: 16, unit: "px"}`.

See:
- [Object Parsers README](./src/processor/object-parsers/README.md)
- [Object Parsers tests](./tests/processor/object-parsers.test.ts)

### Using Default Parsers

The default parser will be removed - its a placeholder for now

```typescript
import { processTokens, defaultObjectParsers } from "@tokens-studio/tokenscript-interpreter";

const tokens = {
  "spacing": { value: 16, unit: "px" }
};

const result = processTokens(tokens, {
  objectParsers: defaultObjectParsers  // Handles {value, unit}
});
// result.output => Map { "spacing" => "16px" }
```

### Custom Object Parser

```typescript
import type { ObjectParser } from "@tokens-studio/tokenscript-interpreter";

const customParser: ObjectParser = {
  name: "rgb-object",
  
  canParse: (value: unknown): boolean => {
    return typeof value === "object" && 
           value !== null && 
           "r" in value && "g" in value && "b" in value;
  },
  
  parse: (value: any): string => {
    return `rgb(${value.r}, ${value.g}, ${value.b})`;
  }
};

const result = processTokens(tokens, {
  objectParsers: [customParser, ...defaultObjectParsers]
});
```

## Loading schemas

Use `processTokens` with a pre-configured `Config` for applications:

```typescript
import { processTokens, Config, fetchTokenScriptSchema } from "@tokens-studio/tokenscript-interpreter";

// Initialize once (e.g., app startup, service initialization)
const config = new Config();
const schema = await fetchTokenScriptSchema("https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/oklch-color/latest/");
config.registerSchemas([{ uri: schema.id, schema: schema.content }]);

// Use repeatedly without network calls
function processUserTokens(tokens) {
  return processTokens(tokens, { config });
}
```

## Package Exports

The package provides granular imports for tree-shaking:

```typescript
// Full library (interpreter + processor + schema utilities)
import { processTokens, Interpreter } from "@tokens-studio/tokenscript-interpreter";

// Just the interpreter (no processor)
import { Interpreter, Config } from "@tokens-studio/tokenscript-interpreter/interpreter";

// Just the processor (browser-safe)
import { processTokens } from "@tokens-studio/tokenscript-interpreter/processor";

// Node.js file processing
import { processTokensFromFiles } from "@tokens-studio/tokenscript-interpreter/processor-node";

// Schema utilities
import { fetchSchema, registerSchema } from "@tokens-studio/tokenscript-interpreter/schema";

// TypeScript types only
import type { InterpreterResult } from "@tokens-studio/tokenscript-interpreter/types";
```

### The Schema Fetcher

The schema fetcher utility handles downloading and validating schemas from remote URIs:

```typescript
import { fetchTokenScriptSchema, fetchAndRegisterSchemas } from "@tokens-studio/tokenscript-interpreter/schema";

// Fetch a single schema
const schema = await fetchTokenScriptSchema("https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/oklch-color/latest/", {
  timeout: 10000,  // 10 second timeout
  headers: { "Custom-Header": "value" },
  signal: abortController.signal  // For cancellation
});

// Response structure:
// {
//   id: string,
//   type: string,
//   schema: string,
//   slug: string,
//   version: string,
//   content: ColorSpecification | FunctionSpecification,
//   license_name?: string | null
// }

// Fetch and register multiple schemas at once
const config = await fetchAndRegisterSchemas([
  "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/oklch-color/latest/",
  "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/p3-color/latest/"
], new Config());
```

### Built-in Config Managers

**ColorManager** - Handles color types and conversions
```typescript
config.colorManager.register(uri, colorSpecification);
```

**FunctionsManager** - Registers custom functions
```typescript
config.functionsManager.register("myFunction", functionSpecification);
```

**UnitManager** - Handles unit conversions
```typescript
config.unitManager.register(uri, unitSpecification);
```

## The Interpreter Directly

For evaluating TokenScript expressions directly:

```typescript
import { Interpreter, Config } from "@tokens-studio/tokenscript-interpreter/interpreter";

const config = new Config();
const interpreter = new Interpreter(config);

// Evaluate an expression
const result = interpreter.interpret("mix(#ff0000, #0000ff, 0.5)");
console.log(result.toString()); // => "#800080"
```

## Processing Options

All processing functions accept these options:

```typescript
interface ProcessOptions {
  config?: Config;              // Custom interpreter config with schemas
  output?: "string" | "symbols"; // Output format (default: "string")
  builder?: TokenBuilder<T>;    // Custom output structure
  objectParsers?: ObjectParser[]; // Handle non-string values
}

interface ProcessSetsOptions extends ProcessOptions {
  activeSets?: string[];        // Token sets to include
  activeTheme?: string;         // Theme to apply
}
```

## Processing Results

All process functions return a `ProcessResult`:

```typescript
interface ProcessResult<T> {
  output: T;                              // Resolved tokens (format depends on builder)
  tokens: Map<string, InterpreterResult>; // Raw resolved token values
  errors: Map<string, Error>;             // Resolution errors by token name
  resolved: Set<string>;                  // Successfully resolved token names
  unresolved: Set<string>;                // Failed token names
  graph: DependencyGraph;                 // Dependency graph for analysis
}

const result = processTokens(tokens);

if (result.errors.size > 0) {
  for (const [name, error] of result.errors) {
    console.error(`Token "${name}" failed: ${error.message}`);
  }
}

console.log(`Resolved: ${result.resolved.size}/${result.resolved.size + result.unresolved.size}`);
```

**Error Handling**: The processor accumulates errors without stopping resolution. When a token fails to resolve, the error is recorded in `errors` and the token is marked as unresolved, but processing continues for all other tokens. This means you always get the maximum number of successful resolutions, even if some tokens fail.

```typescript
const tokens = new Map([
  ["valid", "#ff0000"],
  ["broken", "invalid-syntax-here"],
  ["depends-on-valid", "{valid}"],
]);

const result = processTokens(tokens);

// result.resolved => Set { "valid", "depends-on-valid" }
// result.unresolved => Set { "broken" }
// result.errors => Map { "broken" => InterpreterError(...) }
// Processing continues despite "broken" failing
```

### Accessing the Dependency Graph

*This will be implemented as a simple function!*

The result includes a dependency graph that tracks token relationships:

```typescript
import { processTokens } from "@tokens-studio/tokenscript-interpreter";

const tokens = new Map([
  ["primary", "#ff6b35"],
  ["secondary", "{primary}"],
  ["accent", "lighten({secondary}, 0.2)"]
]);

const result = processTokens(tokens);

const nodes = result.graph.getNodes();

// Get dependencies for a specific token
const accentDeps = nodes.get("accent");
// Set { "secondary" } - "accent" depends on "secondary"

// Find tokens with no dependencies (entry points)
const entryTokens = result.graph.entryNodes();
// ["primary"] - tokens that don't reference others

for (const [tokenName, deps] of nodes) {
  if (deps.size > 0) {
    console.log(`${tokenName} depends on: ${Array.from(deps).join(", ")}`);
  }
}
// Output:
// secondary depends on: primary
// accent depends on: secondary
```
