# Token Builders

Token builders provide a performant way to construct output structures incrementally during token resolution. Instead of post-processing resolved tokens, builders receive tokens one-at-a-time through `onResolve` and `onError` callbacks, building their target structure progressively.

## Built-in Builders

### NestedObjectBuilder

Builds a nested JavaScript object structure from flat token paths.

```typescript
import { NestedObjectBuilder, processTokens } from '@processor';

const result = processTokens(
  {
    "color.primary": "#FF0000",
    "color.secondary": "#00FF00",
    "spacing.base": "16px"
  },
  { builder: new NestedObjectBuilder() }
);

console.log(result.output);
// {
//   color: {
//     primary: "#FF0000",
//     secondary: "#00FF00"
//   },
//   spacing: {
//     base: "16px"
//   }
// }

// To get a JSON string:
console.log(JSON.stringify(result.output, null, 2));
```

### FlatObjectBuilder

Builds a flat key-value JavaScript object.

```typescript
import { FlatObjectBuilder, processTokens } from '@processor';

const result = processTokens(
  {
    "color.primary": "#FF0000",
    "color.secondary": "#00FF00"
  },
  { builder: new FlatObjectBuilder() }
);

console.log(result.output);
// {
//   "color.primary": "#FF0000",
//   "color.secondary": "#00FF00"
// }
```

### MapBuilder (Default)

Builds a Map structure, preserving symbol types or converting to strings.

```typescript
import { MapBuilder, processTokens } from '@processor';

// With symbols (default when output="symbols")
const result1 = processTokens(
  { base: "16", large: "{base} * 2" },
  { output: "symbols" } // Uses MapBuilder internally
);

console.log(result1.tokens);
// Map { "base" => NumberSymbol(16), "large" => NumberSymbol(32) }

// With strings (default when output="string")
const result2 = processTokens(
  { base: "16", large: "{base} * 2" },
  { output: "string" } // Uses MapBuilder internally
);

console.log(result2.tokens);
// Map { "base" => "16", "large" => "32" }
```

## Creating Custom Builders

Implement the `TokenBuilder<T>` interface to create custom builders:

```typescript
import type { TokenBuilder } from '@processor/builders';
import type { interpreterResult } from '@interpreter';

class CustomBuilder implements TokenBuilder<MyOutputType> {
  readonly name = "custom";
  private myStructure: MyOutputType = /* ... */;

  onResolve(tokenName: string, value: interpreterResult): void {
    // Build structure incrementally as tokens are resolved
    // This is called for each successfully resolved token
  }

  onError(tokenName: string, error: Error, originalValue: string): void {
    // Handle failed tokens
    // This is called for each token that fails to resolve
  }

  getResult(): MyOutputType {
    // Return the final built structure
    return this.myStructure;
  }
}

// Use it
const result = processTokens(tokens, {
  builder: new CustomBuilder()
});
```

### Example: Array Builder

```typescript
class ArrayBuilder implements TokenBuilder<Array<{ name: string; value: unknown }>> {
  readonly name = "array";
  private items: Array<{ name: string; value: unknown }> = [];

  onResolve(tokenName: string, value: interpreterResult): void {
    this.items.push({
      name: tokenName,
      value: serializeInterpreterResult(value)
    });
  }

  onError(tokenName: string, error: Error, originalValue: string): void {
    this.items.push({
      name: tokenName,
      value: originalValue
    });
  }

  getResult(): Array<{ name: string; value: unknown }> {
    return this.items;
  }
}
```

### Example: CSS Variables Builder

```typescript
class CSSVariablesBuilder implements TokenBuilder<string> {
  readonly name = "css-vars";
  private cssVars: string[] = [];

  onResolve(tokenName: string, value: interpreterResult): void {
    const cssName = `--${tokenName.replace(/\./g, '-')}`;
    const cssValue = serializeInterpreterResult(value);
    this.cssVars.push(`${cssName}: ${cssValue};`);
  }

  onError(tokenName: string, _error: Error, originalValue: string): void {
    const cssName = `--${tokenName.replace(/\./g, '-')}`;
    this.cssVars.push(`${cssName}: ${originalValue};`);
  }

  getResult(): string {
    return `:root {\n  ${this.cssVars.join('\n  ')}\n}`;
  }
}

const result = processTokens(tokens, {
  builder: new CSSVariablesBuilder()
});

console.log(result.output);
// :root {
//   --color-primary: #FF0000;
//   --spacing-base: 16px;
// }
```

## CLI Integration

The CLI uses builders to generate output:

```bash
# Nested object output (default)
tokenscript process --input tokens.json --format nested

# Flat object output
tokenscript process --input tokens.json --format flat
```
