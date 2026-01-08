# Token Validation

## TokenSymbol

### Links

[TokenSymbol](../src/interpreter/symbols.ts)

### Current state

TokenSymbol is used to encapsulate Tokens like structured tokens into a type with a `subType`.

```js
TokenSymbol("border-radius", NumberWithUnit(1, "px"))
```

We've got a preset for testing token symbols.


#### Processing

When processing tokens they json gets converted into a `Map<TokenRef, TokenSymbol`>.

When referencing a token with `{typgraphy.h1}` the value gets extracted out of the TokenSymbol so we dont end up with nested `TokenSymbol`.

In the final resolved result the value get's put back into `TokenSymbol` to maintain the `subType`.

##### Structured Tokens

Nested tokens like `typography` aka structured tokens get put into a `TokenSymbol` where the nested properties can be referenced during processing

E.g.:

```js
[
    ['typography.sm', TokenSymbol("typography", {
        fontSize: new NumberSymbol(16),
    })]
]
```

So in the processor we can access sub properties with `{typography.sm.fontSize}`

##### TokenSymbol in Runtime

While `TokenSymbol` is a valid tokenscript symbol, we never really use it during the interpretation phase. As it will get extracted when referenced and put back only in the final phase.

You could theoretically construct a `TokenSymbol` with typescript like this 

```tokenscript
variable token: Token;
```

But right now you cant really do anything with it, as it's more of a processing artifact.

This means we can't write token-type specific functions as the runtime never knows about the `TokenSymbol` or returns `TokenSymbol`

## Plan

### TokenSymbol schemas

Like color/unit/function schemas we want to be able to provide schemas for Token.

See [color](../src/interpreter/config/managers/color)

We want to be able to define token type schema to define the token type further.

See below how the token symbol specs are defined

### Validation

We want to be able to validate TokenSymbol against a spec.

Validations should be written in tokenscript for maximum portability.

**Complex**

```json
{
    "name": "css_typography_token",
    "keyword": "typography",
    "type": "token",
    "description": "CSS typography token",
    "url": "/api/v1/core/css_typography_token/0/0/1/",
    "schema": {
        "type": "object",
        "properties": {
          "fontSize": {
             "type": "token",
             "url": "/api/v1/core/css_font_size_token/0/0/1/"
          },
          "fontFamily": {
             "type": "token",
             "url": "/api/v1/core/css_font_family_token/0/0/1/"
          },
          "fontWeight": {
             "type": "token",
             "url": "/api/v1/core/css_font_weight_token/0/0/1/"
          },
          "lineHeight": {
             "type": "token",
             "url": "/api/v1/core/css_line_height_token/0/0/1/"
          },
          "letterSpacing": {
             "type": "token",
             "url": "/api/v1/core/css_letter_spacing_token/0/0/1/"
          },
          "textCase": {
             "type": "token",
             "url": "/api/v1/core/css_text_case_token/0/0/1/"
          },
          "textDecoration": {
             "type": "token",
             "url": "/api/v1/core/css_text_decoration_token/0/0/1/"
          }
        }
    }
}
```

**Primitive**

```json
{
    "name": "css_font_size_token",
    "keyword": "css_font_size_token",
    "type": "token",
    "description": "CSS font size allows measurements",
    "url": "/api/v1/core/css_font_size_token/0/0/1/",
    "schema": {
        "type": "number",
        "validations": {
            "script": "expect_all(expect_positive_number, expect_css_measurement)",
        }
    },
}
```

**Validation**

```json
{
    "name": "expect_positive_number",
    "keyword": "expect_positive_number",
    "type": "validation",
    "description": "Expects a positive number.",
    "url": "/api/v1/core/expect_positive_number/0/0/1/",
    "schema": {
      "script": "expect_positive_number.tokenscript"
    }
}
```

```tokenscript
if (!is_number({input}) || is_number_with_unit({input})) return error(EXPECTED_NUMBER, input);

if ({input} < 0) return error(EXPECTED_POSITIVE_NUMBER, input);
```

```json
{
    "name": "expect_css_length",
    "keyword": "expect_css_length",
    "type": "validation",
    "description": "Expects a CSS length or unitless number.",
    "url": "/api/v1/core/expect_css_unitless_number/0/0/1/",
    "schema": {
      "script": "expect_css_length.tokenscript"
    },
}
```


```tokenscript
// Accept unitless number
if (is_number({input})) return true;

if (!is_number_with_unit({input})) [
  return error(EXPECTED_NUMBER, input);
]

variable unit: String = {input}.unit().

// TODO Can we can define constants per schema, like inputs so this doesnt have to be evaluated every time
variable allowed_length_units: List = 
  "px", "cm", "mm", "in", "pt", "pc", "em", "rem", "ex", "ch", "lh", "rlh", "vw", "vh", "vmin", "vmax", "vi", "vb", "svw", "svh", "lvw", "lvh", "dvw", "dvh",

if (!expect_string(unit, allowed_length_units)) [
  return error(EXPECTED_CSS_LENGTH, input);
]

return true;
```

### ErrorSymbol

We need a new tokenscript symbol called ErrorSymbol just for the validations.

The error gets enriched by the validation function with the erroring schema.

Errors can get constructed like this `error(error_code: String, meta: Any)`


### Validation functions

- `error` Constructs a Error symbol like `error(error_code: String, meta: Any)`
- `expect_all` Runs a list of predicates that either return `true | ErrorSymbol`
- `expect_one_of` Runs a list of predicates that either return `true | ErrorSymbol`

TODO: How can we make sure validation functions dont override user variables called error?


### Processing

Validations will be run during processing, when we put back resolved values into tokensymbol we can check for validations,
this will replace the issues system which has validations written in typescript.
