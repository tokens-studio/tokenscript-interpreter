# token-form



<!-- Auto Generated Below -->


## Properties

| Property        | Attribute        | Description | Type                                      | Default     |
| --------------- | ---------------- | ----------- | ----------------------------------------- | ----------- |
| `cancelHandler` | --               |             | `() => void`                              | `undefined` |
| `config`        | --               |             | `Config`                                  | `undefined` |
| `selectedToken` | `selected-token` |             | `string`                                  | `undefined` |
| `submitHandler` | --               |             | `(data: TokenFormSubmitData) => void`     | `undefined` |
| `tokens`        | --               |             | `Map<string, TokenData> \| TokenResolver` | `undefined` |


## Events

| Event        | Description | Type                                |
| ------------ | ----------- | ----------------------------------- |
| `formCancel` |             | `CustomEvent<TokenFormCancelEvent>` |
| `formSubmit` |             | `CustomEvent<TokenFormSubmitEvent>` |


## Shadow Parts

| Part                 | Description |
| -------------------- | ----------- |
| `"actions"`          |             |
| `"button"`           |             |
| `"button-cancel"`    |             |
| `"button-submit"`    |             |
| `"field"`            |             |
| `"form"`             |             |
| `"input"`            |             |
| `"label"`            |             |
| `"resolved"`         |             |
| `"resolved-error"`   |             |
| `"resolved-success"` |             |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
