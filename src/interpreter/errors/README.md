# Error System

## Usage

```typescript
throw new InterpreterError(InterpreterErrorCode.VARIABLE_NOT_FOUND, {
  token: node.token,
  data: { name: variableName }
});

try {
} catch (error) {
  expect(error).toBeInstanceOf(InterpreterError);
  expect((error as InterpreterError).code).toBe(InterpreterErrorCode.VARIABLE_NOT_FOUND);
  expect((error as InterpreterError).data.name).toBe("myVar");
}
```

## Error Classes

- `LanguageError` - Base class
- `LexerError` - Tokenization errors
- `ParserError` - Parsing errors  
- `InterpreterError` - Runtime errors
- `ProcessorError` - Token processing errors

## Error Codes

Each module has typed error codes (enums) and data interfaces:
- Prevents typos
- IDE autocomplete
- Type-safe error data
- Translation-ready messages

## Adding New Errors

1. Add code to `codes/{module}.ts`
2. Add data interface to same file
3. Add message template to `messages/en.ts`
4. Use in code with typed data
