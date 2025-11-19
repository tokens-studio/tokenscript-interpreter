# Object Parsers for Structured Tokens

Object Parsers allow you to parse nested structured data inside token values to Tokenscript Symbols.

## Example

For your structured shadow token you've got a nested object for `offsetX`.

```json
{
  "shadow": {
    "sm": {
      "$type": "shadow",
      "$value": {
        "offsetX": {
          "value": 1,
          "unit": "rem"
        }
      }
    }
  }
}

```

For the token processor to understand this custom format we need to write a custom `ObjectParser` that undestands this format `{value: number, unit: string}`


```typescript
const numberWithUnitParser: ObjectParser = {
  predicate: ({ value, unit }) => typeof value === number && typeof unit === string,
  toSymbol: ({ value, unit }) => new NumberWithUnitSymbol(value, unit),
};
```

This will convert your custom structure into a tokenscript symbol which can be referenced and used like any other symbol.
