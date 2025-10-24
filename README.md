![banner.png](examples/repo-assets/banner.png)

# TokenScript Interpreter

**TokenScript** is a custom domain-specific language that interprets design tokens. With TokenScript, you can write custom functions and ship logic directly with your tokens.

## Why a Custom DSL?

We chose a domain-specific language with a compliance library because it provides a small subset of common language features, enabling fast and secure implementation without the complexity of thousands of custom transform functions with different color types. The result is a powerful, type-safe environment that extends your design system capabilities.

## Key Features

- **Custom Types and Units**: Define and support custom types and units without relying on platform support
- **Token Computation**: Perform complex calculations and transformations on your design tokens
- **Function Composition**: Combine custom functions to ship logic alongside your token data

## Target Audience

TokenScript is designed for **tool builders** and **developers who want to extend the language**. While TokenScript itself is not a tool to transform tokens, complementary tools can interpret and permutate token data using the language.

For the language documentation go to the [docs](https://docs.tokenscript.dev.gcp.tokens.studio/).

This is an early public release. The language and interpreter are under active development. You can find the interactive playground [here](https://repl.tokenscript.dev.gcp.tokens.studio/) and our talk about TokenScript at [Penpot Fest 2025](https://www.youtube.com/watch?v=H82szrnX4ws).

If you want join the discussion or have questions, feel free to reach out on our [Tokens Studio Slack](https://tokens-studio.slack.com/archives/C09KPC4MFUL).

## Use tokenscript for your tokens

### Installation

```
npm i --save @tokens-studio/tokenscript-interpreter
```

### Interpretation

TokenScript enables tool builders to work efficiently with design token data. The fastest way to get started is by using the `interpretTokens` function with your [DTCG formatted token data](https://www.designtokens.org/tr/drafts/format):

``` typescript
import { interpretTokens } from "@tokens-studio/tokenscript-interpreter";

const tokens = {
  "primary-color": {
    "$value": "#ff6b35",
    "$type": "color"
  },
};

const result = interpretTokens(tokens);
// => {"primary-color": "#ff6b35"}
```

### Permutation with Schemas

```typescript
import { interpretTokens } from "@tokens-studio/tokenscript-interpreter";

const tokens = {
  "primary-color": {
    "$value": "#ff6b35",
    "$type": "color"
  },
  "secondary-color": {
    "$value": "{primary-color}",
    "$type": "color"
  }
};

const result = interpretTokens(tokens);
// => {"primary-color": "#ff6b35"}
//     "secondary-color": "#ff6b35"}
```

Your desired token features are not tied to any specification or library—enable features by loading the schemas you need.

## Build with tokenscript

To get more language details and learn how to extend TokenScript, visit the [docs](https://docs.tokenscript.dev.gcp.tokens.studio/).
