# Tokenscript Stencil Components

WIP list of components to be used for building tools that interact with design tokens.

Uses [stencil.js](https://stenciljs.com/) to create web components that are framework agnostic.

## Form

- [Source](https://github.com/tokens-studio/tokenscript-interpreter/blob/9ddffe5a59b3f41dfc038fdf350b8e7e4436df19/packages/stencil-components/src/components/token-form/token-form.tsx)
- [Example usage](https://github.com/tokens-studio/tokenscript-interpreter/tree/main/examples/runtime-ui/src/components/ui/dialogs/token-dialog.tsx#L136)
- [Live demo in Runtime UI](https://tokenscript-interpreter-runtimeui.vercel.app/) 
   (Right click on token to edit, the form in the dialog is handled by the component)

Acccepts either a built tokenscript processor build output or map of permutated tokens `Map<string, TokenValue>` where `TokenValue` is `Record<$type?: string, $value: string>` and the key is the token name like `colors.primary.100`.

Rebuilds only necessary parts of dependants & dependencies to compute the value preview

Can be directly used from react like this

```tsx
<token-form
  selectedToken={token}
  tokens={tokenscriptOutput}
  submitHandler={handleSubmit}
  cancelHandler={handleCancel}
  class="token-form-stencil"
/>
```
  
### Styling

The tokenscript stencil components are mostly unstyled and leave styling up to the consumer.

Parts of the compoents can be styled using the [::part(element)](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/::part) selectors.

```css
/* Stencil Component Styling */
token-form {
  display: block;
  font-family: inherit;
  width: 100%;
}

/* Form structure */
token-form::part(form) {
  display: grid;
  gap: 1rem;
  font-family: inherit;
  width: 100%;
}

token-form::part(field) {
  display: grid;
  gap: 0.75rem;
}
```

### Planned features

- Completion of references while typing
- Rich warnings via the [tokenscript linter](https://github.com/tokens-studio/tokenscript-interpreter/blob/main/src/processor/linter/README.md) with options for custom translations like [en.ts](https://github.com/tokens-studio/tokenscript-interpreter/blob/main/src/interpreter/errors/messages/en.ts)
- Warnings for breaking dependants and automatic options to rename children (will give back like a `Map<SourceName, TargetName>`)
- Complex value fields from [build](https://github.com/tokens-studio/tokenscript-interpreter/blob/main/src/processor/builders/README.md) supporting all kind of token types
- Slots for things like custom color pickers etc via stencil [slots](https://stenciljs.com/docs/templating-jsx#slots)
- Rich token value input like https://lexical.dev/

## Why use it in penpot?

- Removes token logic complexity and upkeep from the penpot code base
- Fine-tuned for tokenscript
- Can be directly consumed via react
- Future components like the schema manager, table views etc can be consumed for free by penpot

### Doubts 

- How will it be usable for design tab fields if even necessary to use there?