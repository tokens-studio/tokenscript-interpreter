# Linter

The linter validates token values based on their types. It runs after token resolution and returns structured issues organized by token path.

## Quick Start: Pre-built Rulesets

The fastest way to add validation is using a pre-built ruleset:

```typescript
import { css } from "@tokenscript/processor/linter";
import { processTokens } from "@tokenscript/processor";

// Use all CSS spec-compliant validators
const linter = css.createLintRunner();

const result = processTokens(tokens, { linter });
```

## Extending Rulesets

Use `extend()` to add, override, or compose validators:

```typescript
import { css, penpot, all, createValidator, number } from "@tokenscript/processor/linter";

// Start with CSS rules, add custom validators
const linter = css.createLintRunner().extend({
  // Override: replace the opacity validator
  opacity: createValidator(number({ min: 0, max: 0.9 })),
  
  // Add: new token type not in CSS
  "stroke-width": penpot.strokeWidthValidator,
  
  // Compose: run CSS validator + custom validator
  "border-radius": createValidator(
    all(css.borderRadius, customBorderRadiusValidator)
  ),
});
```

### The `all()` Combinator

Use `all()` to run multiple validators on the same value. All validators run, and all issues are collected:

```typescript
import { all, number, createValidator } from "@tokenscript/processor/linter";

// Custom validator that only allows integers
const integerOnly = (value, ctx) => {
  if (value instanceof NumberSymbol && !Number.isInteger(value.value)) {
    return {
      code: "NOT_INTEGER",
      severity: ctx.severity,
      message: "Value must be an integer",
      tokenName: ctx.tokenName,
    };
  }
  return null;
};

// Combine range constraint with integer constraint
const integerInRange = all(
  number({ min: 0, max: 100 }),
  integerOnly
);

const linter = css.createLintRunner().extend({
  "z-index": createValidator(integerInRange),
});
```

### Chained Extensions

Extensions can be chained:

```typescript
const baseRules = css.createLintRunner();

const appRules = baseRules.extend({
  "custom-type-a": validatorA,
});

const teamRules = appRules.extend({
  "custom-type-b": validatorB,
});

// teamRules has CSS + custom-type-a + custom-type-b
```

## Using Individual Validators

For fine-grained control, build your own `TypeBasedRule`:

```typescript
import { LintRunner, TypeBasedRule, css, penpot } from "@tokenscript/processor/linter";
import { processTokens } from "@tokenscript/processor";

// Pick specific validators
const linter = new LintRunner().addRule(
  new TypeBasedRule()
    .forType("opacity", css.opacityValidator)
    .forType("fontWeight", css.fontWeightValidator)
    .forType("borderRadius", css.borderRadiusValidator)
    .forType("letterSpacing", css.letterSpacingValidator)
);

const result = processTokens(tokens, { linter });
```

### Available CSS Presets

| Validator                | Description                                               |
|--------------------------|-----------------------------------------------------------|
| `css.opacity`            | Number 0-1                                                |
| `css.fontWeight`         | Number 1-1000 or keywords (normal, bold, lighter, bolder) |
| `css.fontFamily`         | String or list of strings                                 |
| `css.textTransform`      | none, capitalize, uppercase, lowercase, etc.              |
| `css.textDecorationLine` | none, underline, overline, line-through, blink            |
| `css.letterSpacing`      | "normal" or length value                                  |
| `css.lineHeight`         | "normal", number, length, or percentage                   |
| `css.borderRadius`       | 1-4 non-negative length/percentage values                 |
| `css.length`             | Length with unit (px, em, rem, etc.) or unitless 0        |
| `css.lengthPercentage`   | Length or percentage                                      |
| `css.boxShadow`          | Array of shadow objects                                   |

### Composing Custom Validators

Build custom validators from primitives:

```typescript
import { number, string, or, struct, createValidator } from "@tokenscript/processor/linter/presets";

// Custom z-index: number or "auto"
const zIndex = or(
  number(),
  string({ allowedValues: ["auto"] })
);

// Custom spacing with constraints
const spacing = number({ min: 0, max: 100 });

// Custom composite token
const customToken = struct({
  width: { validator: number({ min: 0 }), required: true },
  height: number({ min: 0 }),
  label: string(),
});

// Convert to TokenTypeValidator for use with TypeBasedRule
const linter = new LintRunner().addRule(
  new TypeBasedRule()
    .forType("zIndex", createValidator(zIndex))
    .forType("spacing", createValidator(spacing))
    .forType("customToken", createValidator(customToken))
);
```

### Primitive Validators

| Validator               | Description                                                                          |
|-------------------------|--------------------------------------------------------------------------------------|
| `number(opts?)`         | NumberSymbol with optional `{ min, max }`                                            |
| `string(opts?)`         | StringSymbol with optional `{ allowedValues, caseSensitive }`                        |
| `boolean()`             | BooleanSymbol                                                                        |
| `color()`               | ColorSymbol                                                                          |
| `numberWithUnit(opts?)` | NumberWithUnitSymbol with `{ min, max, allowedUnits, disallowedUnits, requireUnit }` |

### Combinators

| Combinator                    | Description                                              |
|-------------------------------|----------------------------------------------------------|
| `or(...validators)`           | Value must match at least one validator                  |
| `oneOrList(validator, opts?)` | Single value or list (CSS shorthand pattern)             |
| `list(validator, opts?)`      | List with `{ count, minCount, maxCount, allowedCounts }` |
| `struct(fields, opts?)`       | Structured token with field validators                   |
| `arrayOf(validator)`          | Shorthand for `list(validator, { minCount: 1 })`         |

### Struct Options

```typescript
struct({
  width: { validator: number(), required: true },  // Required field
  height: number(),                                 // Optional field
}, {
  strict: true,      // Error on unknown fields
  warnMissing: true, // Warn when optional fields are missing
});
```

## Basic Example

```typescript
import { LintRunner, LintSeverity, TypeBasedRule } from "@tokenscript/processor/linter";
import { processTokens } from "@tokenscript/processor";
import { NumberSymbol } from "@tokenscript/interpreter";

// 1. Create validators
const opacityValidator = (value, context, createIssue) => {
  if (!(value instanceof NumberSymbol)) {
    return createIssue({
      code: "INVALID_TYPE",
      severity: LintSeverity.ERROR,
      message: "Expected number",
      tokenName: context.tokenName,
    });
  }
  
  if (value.value < 0 || value.value > 1) {
    return createIssue({
      code: "OUT_OF_RANGE",
      severity: LintSeverity.ERROR,
      message: "Opacity must be between 0 and 1",
      tokenName: context.tokenName,
      data: { value: value.value },
    });
  }
  
  return null;
};

// 2. Register validators by type
const linter = new LintRunner().addRule(
  new TypeBasedRule()
    .forType("opacity", opacityValidator)
    .forType("color", colorValidator)
);

// 3. Pass to processor
const result = processTokens(tokens, { linter });

// 4. Handle results (LintResult is Map<RefPath, LintIssue[]>)
if (result.lint && result.lint.size > 0) {
  for (const [tokenPath, issues] of result.lint.entries()) {
    for (const issue of issues) {
      const level = issue.severity === LintSeverity.ERROR ? 'ERROR' : 'WARN';
      console.log(`[${level}] ${tokenPath}: ${issue.message} (${issue.code})`);
    }
  }
}
```

## Structured Token Validation

Validators can validate structured tokens (typography, shadow, etc.) and return multiple issues with field paths:

```typescript
import { TokenSymbol, NumberSymbol } from "@tokenscript/interpreter";

const typographyValidator = (value, context, createIssue) => {
  if (!(value instanceof TokenSymbol)) {
    return createIssue({
      code: "INVALID_TYPE",
      severity: LintSeverity.ERROR,
      message: "Expected object for typography",
      tokenName: context.tokenName,
    });
  }
  
  const issues = [];
  const fields = value.value; // Map of field names to values
  
  // Validate fontSize field
  const fontSize = fields.get("fontSize");
  if (fontSize instanceof NumberSymbol) {
    if (fontSize.value <= 0) {
      issues.push(createIssue({
        code: "INVALID_FONT_SIZE",
        severity: LintSeverity.ERROR,
        message: "Font size must be positive",
        tokenName: context.tokenName,
        path: ["fontSize"], // ← Path to the specific field
        data: { value: fontSize.value },
      }));
    }
  }
  
  // Validate lineHeight field
  const lineHeight = fields.get("lineHeight");
  if (lineHeight instanceof NumberSymbol) {
    if (lineHeight.value < 0) {
      issues.push(createIssue({
        code: "NEGATIVE_LINE_HEIGHT",
        severity: LintSeverity.ERROR,
        message: "Line height cannot be negative",
        tokenName: context.tokenName,
        path: ["lineHeight"], // ← Path to the specific field
        data: { value: lineHeight.value },
      }));
    }
  }
  
  // Cross-field validation
  if (lineHeight && !fontSize) {
    issues.push(createIssue({
      code: "MISSING_FONT_SIZE",
      severity: LintSeverity.WARNING,
      message: "Line height requires font-size",
      tokenName: context.tokenName,
      // No path = issue applies to whole token
    }));
  }
  
  return issues;
};
```

The `path` property is an array of accessor keys (strings for object fields, numbers for array indices) that identifies the specific field with the issue. This is useful for:
- Highlighting specific form fields in a UI
- Showing field-level error messages
- Filtering issues by field

**Example with arrays (box-shadow):**
```typescript
const shadowValidator = (value, context, createIssue) => {
  if (!(value instanceof TokenSymbol)) return null;
  
  const issues = [];
  const shadows = value.value.get("shadows"); // Array of shadow objects
  
  if (Array.isArray(shadows)) {
    shadows.forEach((shadow, index) => {
      const blur = shadow.get("blur");
      if (blur instanceof NumberSymbol && blur.value < 0) {
        issues.push(createIssue({
          code: "NEGATIVE_BLUR",
          severity: LintSeverity.ERROR,
          message: "Blur cannot be negative",
          tokenName: context.tokenName,
          path: ["shadows", index, "blur"], // ← Array index in path
          data: { value: blur.value, shadowIndex: index },
        }));
      }
    });
  }
  
  return issues;
};
```

## Validator Return Types

Validators can return:
- `null` or `undefined` - No issues found
- `LintIssue` - A single issue
- `LintIssue[]` - Multiple issues

The framework normalizes all return values into an array.

## Severity Levels

```typescript
enum LintSeverity {
  ERROR = "error",    // Critical issues that should block usage
  WARNING = "warning", // Issues that should be reviewed
  INFO = "info",      // Informational messages
}
```

## Accessing Lint Results

```typescript
const result = processTokens(tokens, { linter });

// Check if any issues exist
if (result.lint) {
  console.log(`Found issues in ${result.lint.size} tokens`);
  
  // Get issues for specific token
  const opacityIssues = result.lint.get("opacity.primary");
  if (opacityIssues) {
    console.log(`opacity.primary has ${opacityIssues.length} issues`);
  }
  
  // Count errors vs warnings
  let errorCount = 0;
  let warningCount = 0;
  
  for (const [, issues] of result.lint.entries()) {
    for (const issue of issues) {
      if (issue.severity === LintSeverity.ERROR) {
        errorCount++;
      } else if (issue.severity === LintSeverity.WARNING) {
        warningCount++;
      }
    }
  }
  
  console.log(`${errorCount} errors, ${warningCount} warnings`);
}
```

## Working with Field Paths

For structured tokens, issues include a `path` property that identifies the specific field:

```typescript
const result = processTokens(tokens, { linter });

const typographyIssues = result.lint.get("heading");

// Find issues for specific field
const fontSizeIssues = typographyIssues?.filter(
  issue => issue.path?.[0] === "fontSize"
);

// Build field validation map for form UI
const fieldValidation = new Map();
for (const issue of typographyIssues || []) {
  if (issue.path) {
    const fieldName = issue.path[0]; // e.g., "fontSize"
    if (!fieldValidation.has(fieldName)) {
      fieldValidation.set(fieldName, []);
    }
    fieldValidation.get(fieldName).push(issue);
  }
}

// Use in form rendering
if (fieldValidation.has("fontSize")) {
  // Show error on fontSize input field
  const errors = fieldValidation.get("fontSize");
  showFieldError("fontSize", errors[0].message);
}
```

**Path structure:**
- Object fields: `["fontSize"]`, `["lineHeight"]`
- Nested objects: `["typography", "fontSize"]`
- Array items: `[0, "blur"]`, `[1, "color"]`

## CRUD Operations

Linting is also performed during CRUD operations:

```typescript
const resolver = new TokenResolver(tokens, { linter });

// Create a new token
const createResult = resolver.createToken({
  tokenPath: "opacity.new",
  tokenData: { $value: 1.5, $type: "opacity" },
});

// Check if the created token has issues
if (createResult.lintIssues) {
  const issues = createResult.lintIssues.get("opacity.new");
  // Handle validation issues for the newly created token
}

// Update operations also return lint results
const updateResult = resolver.updateToken({
  tokenPath: "opacity.existing",
  tokenData: { $value: 0.5 },
});

// Delete operations re-lint affected tokens
const deleteResult = resolver.deleteToken({
  tokenPath: "color.primary",
});

// Check if deletion caused issues in dependent tokens
if (deleteResult.lintIssues) {
  for (const [tokenPath, issues] of deleteResult.lintIssues.entries()) {
    console.log(`Token ${tokenPath} affected by deletion`);
  }
}
```
