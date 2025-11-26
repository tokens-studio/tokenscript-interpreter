# token-form



<!-- Auto Generated Below -->


## Properties

| Property        | Attribute    | Description | Type                            | Default     |
| --------------- | ------------ | ----------- | ------------------------------- | ----------- |
| `allTokens`     | --           |             | `Map<string, TokenData>`        | `new Map()` |
| `cancelHandler` | --           |             | `() => void`                    | `undefined` |
| `config`        | --           |             | `Config`                        | `undefined` |
| `initialData`   | --           |             | `TokenFormData`                 | `undefined` |
| `submitHandler` | --           |             | `(data: TokenFormData) => void` | `undefined` |
| `tokenType`     | `token-type` |             | `string`                        | `"string"`  |


## Events

| Event        | Description | Type                                |
| ------------ | ----------- | ----------------------------------- |
| `formCancel` |             | `CustomEvent<TokenFormCancelEvent>` |
| `formSubmit` |             | `CustomEvent<TokenFormSubmitEvent>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
