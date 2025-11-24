# Linter

## Examples

```typescript
import { LintRunner, TypeBasedRule } from "@tokenscript/processor/linter";
import { processTokens } from "@tokenscript/processor";

// 1. Create validators
const opacityValidator = (value, context, createIssue) => {
  if (!(value instanceof NumberSymbol)) {
    return [createIssue(context, "INVALID_TYPE", "Expected number")];
  }
  if (value.value < 0 || value.value > 1) {
    return [createIssue(context, "OUT_OF_RANGE", "Opacity must be 0-1")];
  }
  return [];
};

// 2. Register validators by type
const linter = new LintRunner().addRule(
  new TypeBasedRule()
    .forType("opacity", opacityValidator)
    .forType("color", colorValidator)
);

// 3. Pass to processor
const result = processTokens(tokens, { linter });

// 4. Handle results
if (result.lint?.hasErrors) {
  for (const error of result.lint.errors) {
    console.error(`[${error.code}] ${error.tokenName}: ${error.message}`);
  }
}
```

### Composite validation

```typescript
const typographyValidator = (value, context, createIssue) => {
  if (!(value instanceof TokenSymbol)) {
    return [createIssue(context, "INVALID_TYPE", "Expected object")];
  }
  
  const issues = [];
  const typo = value.value;
  
  // Validate fontSize
  if (typo.fontSize && (typeof typo.fontSize !== "number" || typo.fontSize <= 0)) {
    issues.push(createIssue(context, "INVALID_FONT_SIZE", 
      "Font size must be positive number",
      { value: typo.fontSize }
    ));
  }
  
  // Validate lineHeight requires fontSize
  if (typo.lineHeight && !typo.fontSize) {
    issues.push(createIssue(context, "MISSING_FONT_SIZE",
      "Line height requires font-size"
    ));
  }
  
  return issues;
};
```
