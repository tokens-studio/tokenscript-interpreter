import { Component, type EventEmitter, Event, Prop, State, h } from "@stencil/core";

export interface TokenFormData {
  name: string;
  value: string;
}

export interface TokenFormSubmitEvent {
  data: TokenFormData;
}

export interface TokenFormCancelEvent {
  reason?: string;
}

@Component({
  tag: "token-form",
  styleUrl: "token-form.css",
  shadow: true,
})
export class TokenForm {
  @Prop() initialData?: TokenFormData;

  @State() formData: TokenFormData = {
    name: "",
    value: "",
  };

  @Event() formSubmit: EventEmitter<TokenFormSubmitEvent>;
  @Event() formCancel: EventEmitter<TokenFormCancelEvent>;

  componentWillLoad() {
    if (this.initialData) {
      this.formData = { ...this.initialData };
    }
  }

  handleSubmit = (e: Event) => {
    e.preventDefault();
    this.formSubmit.emit({ data: this.formData });
  };

  handleCancel = () => {
    this.formCancel.emit({});
  };

  handleInputChange = (field: keyof TokenFormData, value: string) => {
    this.formData = {
      ...this.formData,
      [field]: value,
    };
  };

  render() {
    return (
      <form
        class="token-form"
        onSubmit={this.handleSubmit}
      >
        <div class="token-form__field">
          <label
            htmlFor="token-name"
            class="token-form__label"
          >
            Name
          </label>
          <input
            id="token-name"
            type="text"
            class="token-form__input"
            value={this.formData.name}
            onInput={(e) => this.handleInputChange("name", (e.target as HTMLInputElement).value)}
            required
          />
        </div>

        <div class="token-form__field">
          <label
            htmlFor="token-value"
            class="token-form__label"
          >
            Value
          </label>
          <input
            id="token-value"
            type="text"
            class="token-form__input"
            value={this.formData.value}
            onInput={(e) => this.handleInputChange("value", (e.target as HTMLInputElement).value)}
            required
          />
        </div>

        <div class="token-form__actions">
          <button
            type="button"
            class="token-form__button token-form__button--cancel"
            onClick={this.handleCancel}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="token-form__button token-form__button--submit"
          >
            Submit
          </button>
        </div>
      </form>
    );
  }
}
