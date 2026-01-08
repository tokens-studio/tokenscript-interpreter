# Error Handling

TokenScript has a structured error system that categorizes errors by their source (lexer, parser, interpreter, processor) and provides detailed error information for debugging.

## Overview

Errors in TokenScript are represented by `LanguageError` objects, which are specialized `Error` instances with additional metadata:

```typescript
class LanguageError extends Error {
  code: string;                    // Unique error code
  data: Record<string, unknown>;   // Error-specific data
  line?: number;                   // Line number where error occurred
  token?: Token;                   // Token that caused the error
  originalMessage: string;         // Message without location prefix
}
```

## Error Categories

### Lexer Errors (`LexerError`)

Errors during tokenization of the input string.

| Code | Description |
|------|-------------|
| `LEXER_INVALID_CHARACTER` | Unexpected character in input |
| `LEXER_UNTERMINATED_STRING` | String literal not closed |
| `LEXER_UNTERMINATED_REFERENCE` | Reference `{...}` not closed |
| `LEXER_EMPTY_VARIABLE_NAME` | Empty reference `{}` |
| `LEXER_INVALID_HEX_COLOR_FORMAT` | Invalid hex color format |
| `LEXER_EXPECTED_CHARACTER` | Expected specific character |

### Parser Errors (`ParserError`)

Errors during parsing of the token stream into an AST.

| Code | Description |
|------|-------------|
| `PARSER_UNEXPECTED_TOKEN` | Unexpected token in expression |
| `PARSER_EXPECTED_TOKEN_TYPE` | Expected different token type |
| `PARSER_UNEXPECTED_END` | Unexpected end of input |
| `PARSER_CONDITION_MUST_BE_BOOLEAN` | Condition must evaluate to boolean |
| `PARSER_INVALID_SYNTAX` | General syntax error |

### Interpreter Errors (`InterpreterError`)

Errors during evaluation of the AST.

| Code | Description |
|------|-------------|
| `INTERP_UNDEFINED_VARIABLE` | Variable not defined |
| `INTERP_UNDEFINED_REFERENCE` | Reference not found |
| `INTERP_UNKNOWN_FUNCTION` | Function not found |
| `INTERP_TYPE_ERROR` | Type mismatch in operation |
| `INTERP_INVALID_OPERATION` | Invalid operation |
| `INTERP_DIVISION_BY_ZERO` | Division by zero |
| `INTERP_INDEX_OUT_OF_BOUNDS` | Array index out of range |

### Processor Errors (`ProcessorError`)

Errors during token resolution and processing.

| Code | Description |
|------|-------------|
| `PROC_TOKEN_NOT_FOUND` | Referenced token doesn't exist |
| `PROC_TOKEN_ALREADY_EXISTS` | Token name already in use |
| `PROC_CIRCULAR_DEPENDENCY` | Circular reference detected |
| `PROC_DEPENDENCY_ERROR` | Error in dependent token |
| `PROC_SUB_FIELD_NOT_RESOLVED` | Nested field failed to resolve |
| `PROC_RESOLVER_NOT_INITIALIZED` | Resolver not properly initialized |

## Issues Map

During token processing, both validation issues and errors are collected in the `issues` map:

```typescript
type ResolveIssue = ValidationIssue | LanguageError;
type IssuesMap = Map<string, ResolveIssue[]>;
```

This allows you to handle both validation failures and errors uniformly:

```typescript
import { buildTokens } from "@tokens-studio/tokenscript-interpreter/processor";

const { issues } = buildTokens(tokens, { config });

for (const [tokenName, tokenIssues] of issues) {
  for (const issue of tokenIssues) {
    if (issue instanceof Error) {
      // It's a LanguageError
      console.error(`Error in ${tokenName}: ${issue.code} - ${issue.message}`);
    } else {
      // It's a ValidationIssue
      console.warn(`Validation: ${issue.code} - ${issue.message}`);
    }
  }
}
```

## Distinguishing Error Types

Use the type guard functions to identify error types:

```typescript
import {
  isLanguageError,
  isLexerError,
  isParserError,
  isInterpreterError,
  isProcessorError
} from "@tokens-studio/tokenscript-interpreter/interpreter";

if (isLexerError(error)) {
  // Handle lexer-specific error
  console.log("Tokenization failed:", error.data);
} else if (isParserError(error)) {
  // Handle parser-specific error
  console.log("Parsing failed:", error.data);
} else if (isProcessorError(error)) {
  // Handle processor-specific error
  if (error.code === "PROC_CIRCULAR_DEPENDENCY") {
    console.log("Circular dependency in tokens:", error.data.tokens);
  }
}
```

## Error Data

Each error code has associated data with specific fields:

```typescript
// Example: PROC_TOKEN_NOT_FOUND
{
  code: "PROC_TOKEN_NOT_FOUND",
  data: {
    tokenName: "colors.missing"
  },
  message: "Token 'colors.missing' not found"
}

// Example: PROC_CIRCULAR_DEPENDENCY
{
  code: "PROC_CIRCULAR_DEPENDENCY",
  data: {
    tokens: ["a", "b", "c"]  // or just "a" for self-reference
  },
  message: "Circular dependency detected: a → b → c → a"
}

// Example: PROC_DEPENDENCY_ERROR
{
  code: "PROC_DEPENDENCY_ERROR",
  data: {
    tokenName: "button.color",
    chain: "button.color → colors.primary",
    rootCause: "Token 'colors.primary' not found"
  },
  message: "Error resolving 'button.color': depends on 'colors.primary' which failed"
}
```

## Serializing Errors

For logging or API responses, use `serializeError`:

```typescript
import { serializeError } from "@tokens-studio/tokenscript-interpreter/interpreter";

const serialized = serializeError(error);
// {
//   name: "ProcessorError",
//   code: "PROC_TOKEN_NOT_FOUND",
//   message: "Token 'colors.missing' not found",
//   data: { tokenName: "colors.missing" },
//   line: undefined
// }
```

## Error Messages

Error messages are generated from templates based on the error code and data:

```typescript
import { getMessage } from "@tokens-studio/tokenscript-interpreter/interpreter";

const message = getMessage("PROC_TOKEN_NOT_FOUND", { tokenName: "foo" });
// "Token 'foo' not found"
```

## Best Practices

### 1. Check issues after processing

```typescript
const { output, issues } = buildTokens(tokens, { config });

if (issues && issues.size > 0) {
  // Log all issues for debugging
  for (const [token, tokenIssues] of issues) {
    for (const issue of tokenIssues) {
      console.log(`${token}: ${issue.code}`);
    }
  }
}
```

### 2. Handle specific error codes

```typescript
import { hasIssueWithCode } from "@tokens-studio/tokenscript-interpreter/processor";

if (hasIssueWithCode(issues, "PROC_CIRCULAR_DEPENDENCY")) {
  // Alert user about circular dependencies
}

if (hasIssueWithCode(issues, "PROC_TOKEN_NOT_FOUND")) {
  // Handle missing token references
}
```

### 3. Separate validation from errors

```typescript
const errors: LanguageError[] = [];
const validationIssues: ValidationIssue[] = [];

for (const [_, tokenIssues] of issues) {
  for (const issue of tokenIssues) {
    if (issue instanceof Error) {
      errors.push(issue);
    } else {
      validationIssues.push(issue);
    }
  }
}

// Errors are fatal - token couldn't be resolved
if (errors.length > 0) {
  console.error("Resolution failed for some tokens");
}

// Validation issues are warnings - token resolved but value may be invalid
if (validationIssues.length > 0) {
  console.warn("Some tokens have validation issues");
}
```

## Difference Between Errors and Validation Issues

| Aspect | Errors (LanguageError) | Validation Issues (ValidationIssue) |
|--------|------------------------|-------------------------------------|
| **When** | During lexing, parsing, interpretation, or resolution | After successful resolution |
| **Meaning** | Token couldn't be processed | Token processed but value doesn't match type |
| **Resolution** | Token value is the error object | Token value is resolved but flagged |
| **Example** | `{undefined.ref}` - reference doesn't exist | `"-10px"` for borderRadius - negative values invalid |
| **Severity** | Always fatal for the token | Can be ERROR, WARNING, or INFO |
