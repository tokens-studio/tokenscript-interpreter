# Linter

The linter validates token values based on their types. It runs after token resolution and returns structured issues organized by token path.

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

## Composite Validation

Validators can return multiple issues for complex token types:

```typescript
import { TokenSymbol } from "@tokenscript/interpreter";

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
  const typo = value.value;
  
  // Validate fontSize
  if (typo.fontSize && (typeof typo.fontSize !== "number" || typo.fontSize <= 0)) {
    issues.push(createIssue({
      code: "INVALID_FONT_SIZE",
      severity: LintSeverity.ERROR,
      message: "Font size must be positive number",
      tokenName: context.tokenName,
      data: { value: typo.fontSize },
    }));
  }
  
  // Validate lineHeight requires fontSize
  if (typo.lineHeight && !typo.fontSize) {
    issues.push(createIssue({
      code: "MISSING_FONT_SIZE",
      severity: LintSeverity.WARNING,
      message: "Line height requires font-size",
      tokenName: context.tokenName,
    }));
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
