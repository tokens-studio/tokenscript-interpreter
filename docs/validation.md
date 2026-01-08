# Token Validation

TokenScript uses a schema-based validation system to validate token values against their declared types. Validation is performed during token resolution and produces `ValidationIssue` objects when tokens don't conform to their type specifications.

## Overview

The validation system consists of:

1. **Token Type Schemas** - JSON files that define token types and reference validation scripts
2. **Validation Scripts** - TokenScript code that validates token values
3. **TokenManager** - Manages schema registration and executes validation
4. **ValidationIssue** - Represents a validation failure with structured information

## Token Type Schemas

Each token type is defined by a JSON schema with the following structure:

```json
{
  "name": "borderRadius",
  "type": "token",
  "description": "Represents a border radius value. Supports px, rem, em, %.",
  "validation": {
    "type": "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/tokenscript/0/",
    "script": "if ({input} < 0) return \"INVALID_BORDER_RADIUS_NEGATIVE\"; return true;"
  }
}
```

### Schema Properties

- `name` - The token type name (e.g., "borderRadius", "color", "shadow")
- `type` - Must be "token" for token type specifications
- `description` - Human-readable description of the type
- `validation.script` - The TokenScript validation code as a string

### Complex Token Types

For tokens with nested properties (like `shadow` or `typography`), schemas define the structure using the `schema` property:

```json
{
  "name": "typography",
  "type": "token",
  "description": "Composite typography token",
  "schema": {
    "type": "object",
    "properties": {
      "fontSize": { "type": "token", "url": "/api/v1/core/fontSize/" },
      "fontWeight": { "type": "token", "url": "/api/v1/core/fontWeight/" },
      "lineHeight": { "type": "token", "url": "/api/v1/core/lineHeight/" }
    }
  },
  "validation": {
    "type": "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/tokenscript/0/",
    "script": "if (!is_dictionary({input})) return \"INVALID_TYPOGRAPHY_TYPE\"; return true;"
  }
}
```

For list-type tokens (like `shadow` which contains multiple shadow layers):

```json
{
  "name": "shadow",
  "type": "token",
  "schema": {
    "type": "list",
    "items": {
      "type": "object",
      "properties": {
        "color": { "type": "token", "url": "/api/v1/core/color/" },
        "offsetX": { "type": "token", "url": "/api/v1/core/dimension/" },
        "offsetY": { "type": "token", "url": "/api/v1/core/dimension/" },
        "blur": { "type": "token", "url": "/api/v1/core/dimension/" },
        "spread": { "type": "token", "url": "/api/v1/core/dimension/" }
      }
    }
  }
}
```

## Validation Scripts

Validation scripts are TokenScript code that receive the token value as `{input}` and return either `true` (valid) or an error code string (invalid).

Example:

```tokenscript
// Validate each value in the list
variable i: Number = 0;
while (i < count) [
  if (is_number(test_values.get(i))) [
    if (test_values.get(i) < 0) [
      return "INVALID_BORDER_RADIUS_NEGATIVE";
    ];
    if (test_values.get(i) != 0) [
      return "INVALID_BORDER_RADIUS_REQUIRES_UNIT";
    ];
  ];
  i = i + 1;
];

return true;
```

### Error Code Conventions

Error codes should follow the pattern: `INVALID_<TOKEN_TYPE>_<REASON>`

Examples:
- `INVALID_BORDER_RADIUS_NEGATIVE` - Value cannot be negative
- `INVALID_BORDER_RADIUS_REQUIRES_UNIT` - Non-zero values need a unit
- `INVALID_OPACITY_OUT_OF_RANGE` - Value must be between 0 and 1

## ValidationIssue Structure

When validation fails, a `ValidationIssue` is created:

```typescript
interface ValidationIssue {
  code: string;                    // Error code from validation script
  severity: ValidationSeverity;    // ERROR, WARNING, or INFO
  message: string;                 // Human-readable description
  tokenName: string;               // Name of the token that failed
  path?: (string | number)[];      // Path for nested errors
  line?: number;                   // Line number if available
  data?: Record<string, unknown>;  // Additional context
}
```

### Severity Levels

```typescript
enum ValidationSeverity {
  ERROR = "error",      // Token value is invalid
  WARNING = "warning",  // Value may cause issues
  INFO = "info"         // Informational notice
}
```

## Accessing Validation Results

Validation issues are included in the `issues` map returned by processing functions:

```typescript
import { buildTokens } from "@tokens-studio/tokenscript-interpreter/processor";

const tokens = new Map([
  ["border.radius", { $value: "-10px", $type: "borderRadius" }]
]);

const { issues } = buildTokens(tokens, { config });

// issues is Map<string, ResolveIssue[]>
// ResolveIssue = ValidationIssue | LanguageError

for (const [tokenName, tokenIssues] of issues) {
  for (const issue of tokenIssues) {
    if ("severity" in issue) {
      // It's a ValidationIssue
      console.log(`${issue.code}: ${issue.message}`);
    }
  }
}
```

### Helper Functions

```typescript
import {
  hasAnyIssues,
  hasIssueWithCode,
  getTokensWithIssues
} from "@tokens-studio/tokenscript-interpreter/processor";

// Check if any issues exist
if (hasAnyIssues(issues)) {
  // Handle validation failures
}

// Check for specific error code
if (hasIssueWithCode(issues, "INVALID_BORDER_RADIUS_NEGATIVE")) {
  // Handle specific validation error
}

// Get all tokens with issues
const failedTokens = getTokensWithIssues(issues);
```

## Nested Validation

For complex tokens, validation errors include a `path` property indicating where the error occurred:

```typescript
// For a shadow token with invalid blur value
{
  code: "INVALID_SHADOW_BLUR_NEGATIVE",
  tokenName: "shadow.card",
  path: [0, "blur"],  // First shadow item, blur property
  message: "Validation failed at 0.blur: INVALID_SHADOW_BLUR_NEGATIVE"
}
```

## Registering Custom Token Types

To register custom token types with validation:

```typescript
import { Config } from "@tokens-studio/tokenscript-interpreter";

const config = new Config();

// Register a schema with validation script
config.registerSchemas([
  {
    uri: "https://myschemas.com/custom-type",
    schema: {
      name: "customType",
      type: "token",
      validation: {
        type: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/tokenscript/0/",
        script: "if ({input} < 0) return \"INVALID_CUSTOM_TYPE\"; return true;"
      }
    }
  }
]);
```

You can also register directly via the `TokenManager`:

```typescript
// Register a single token type
config.tokenManager.register("https://myschemas.com/custom-type", {
  name: "customType",
  type: "token",
  validation: {
    type: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/tokenscript/0/",
    script: "if ({input} < 0) return \"INVALID_CUSTOM_TYPE\"; return true;"
  }
});

// Or register just a validation script for an existing type
config.tokenManager.registerValidation("customType", `
  if ({input} < 0) [
    return "INVALID_CUSTOM_TYPE_NEGATIVE";
  ];
  return true;
`);
```

## TokenManager API

The `TokenManager` class manages token type specifications and validation.

### Methods

#### `register(uri: string, spec: TokenSpecification | string): TokenSpecification`

Register a token type specification. If the spec includes a `validation` field, the validation script is automatically registered.

```typescript
config.tokenManager.register("https://example.com/types/percentage", {
  name: "percentage",
  type: "token",
  description: "A percentage value between 0 and 100",
  validation: {
    type: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/tokenscript/0/",
    script: `
      if (!is_number({input})) return "INVALID_PERCENTAGE_TYPE";
      if ({input} < 0 || {input} > 100) return "INVALID_PERCENTAGE_RANGE";
      return true;
    `
  }
});
```

#### `registerValidation(tokenType: string, validation: string | { type: string; script: string }): void`

Register a validation script for a token type. Overwrites any existing validation.

```typescript
config.tokenManager.registerValidation("opacity", `
  if (!is_number({input})) return "INVALID_OPACITY_TYPE";
  if ({input} < 0 || {input} > 1) return "INVALID_OPACITY_RANGE";
  return true;
`);
```

#### `validate(tokenType: string, value: ISymbolType): ValidationResult[]`

Validate a value against a token type. Returns an array of validation results. For nested types, multiple results may be returned (one per nested validation failure).

```typescript
import { NumberSymbol } from "@tokens-studio/tokenscript-interpreter";

const results = config.tokenManager.validate("opacity", new NumberSymbol(1.5));

for (const result of results) {
  if (!result.valid) {
    console.log(`Validation failed: ${result.error}`);
    if (result.path) {
      console.log(`  at path: ${result.path.join(".")}`);
    }
  }
}
```
